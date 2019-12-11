// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { intersection, groupBy } from 'lodash';
import { exit } from 'process';

// local dependencies
import * as local from './local';
import * as github from './github';
import * as cli from './cli';
import { filter, forEach, mapAsync } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

function getLocalName(githubRepo, localRepos) {
  return localRepos.reduce((accum, localRepo) => {
    return intersection(githubRepo.aliases, localRepo.aliases).length ? localRepo.name : accum;
  }, githubRepo.name);
}

function mergeRepos(localRepos, githubRepos) {
  return [...localRepos, ...githubRepos].reduce((repos, repo) => {
    /* eslint-disable no-param-reassign */
    const name = repo.type === 'github' ? getLocalName(repo, localRepos) : repo.name;
    repos[name] = repos[name] || {};
    repos[name][repo.type] = repo;
    return repos;
  }, {});
}

function getAvailableNames(repo) {
  return [
    {
      name: `use local name: ${repo.local.name}`,
      value: repo.local.name
    },
    {
      name: `use github name: ${repo.github.name}`,
      value: repo.github.name
    }
  ];
}

function filterAuxRemotes(user, name, remotes) {
  return remotes.filter((remote) => {
    return !remote.refs.fetch.match(new RegExp(`github.com.*[\:\\\/]${user}[\\\/]${name}`, 'gi'));
  });
}

function groupAuxRemotes(remotes) {
  const typeDict = [
    { name: 'pantheon', regex: new RegExp('(pantheon|drush.in|codeserver)', 'gi') },
    { name: 'github', regex: new RegExp('github.com', 'g') },
    { name: 'bitbucket', regex: new RegExp('(bitbucket|atlassian)', 'gi') },
    { name: 'brandfire', regex: new RegExp('(brandfire|bfmg).ca', 'gi') }
  ];
  return groupBy(remotes, (remote) => {
    return typeDict.forEach((rslt, test) => {
      return remote.refs.fetch.match(test.regex) ? test.name : rslt;
    }, 'other');
  });
}

function getAuxRemotes(remotes) {
  const rslt = [];
  forEach(remotes, (remoteGroup, type) => {
    forEach(remoteGroup, (remote, idx) => {
      rslt.push({
        ...remote,
        name: idx === 0 ? type : `${type}-${idx}`
      });
    });
  });
  return rslt;
}

function getMainRemote(user, name) {
  return {
    name: 'origin',
    refs: {
      fetch: `git@github.com:${user}/${name}.git`,
      push: `git@github.com:${user}/${name}.git`
    }
  };
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export async function load(token, srcDir) {
  cli.log('[load]', 'loading github repos');
  const githubRepos = await github.load(token, (repoPath) => {
    cli.log('[load]', `loading github repo ${repoPath}`);
  });
  cli.log('[load]', 'loading local repos');
  const localRepos = await local.load(srcDir, (repoPath) => {
    cli.log('[load]', `loading local repo ${repoPath}`);
  });
  const rslt = mergeRepos(localRepos, githubRepos);
  cli.log('[load]', 'task complete.');
  return rslt;
}

export async function checkStatus(user, repos) {
  cli.log('[checkStatus]', 'checking local repo status');
  const rslt = filter(repos, (repo) => {
    if (repo.local && repo.local.remotes[0]) {
      // check if master branch is current branch
      const notInSync = !!(repo.local.status.behind + repo.local.status.ahead + repo.local.status.files.length);
      if (notInSync) {
        cli.log('[checkStatus]', `excluded from sync - untracked or upstream changes: ${repo.local.path}`);
        return false;
      }
      const notOwned = !repo.local.remotes.some((remote) => {
        return remote.refs.fetch.match(new RegExp(`[\:\\\/]${user}[\\\/]`, 'gi'));
      });
      if (notOwned) {
        cli.log('[checkStatus]', `excluded from sync - github remote repo not owned by user: ${repo.local.path}`);
        return false;
      }
    }
    return true;
  });
  cli.log('[checkStatus]', 'task complete.');
  return rslt;
}

export async function updateNames(token, user, repos) {
  cli.log('[updateNames]', 'detecting repo names');
  const rslt = mapAsync(repos, async (repo) => {
    const repoRslt = { ...repo };
    if (repo.local && repo.github && repo.local.name !== repo.github.name) {
      const availableNames = getAvailableNames(repo);
      const newName = await cli.ask('[updateNames]', `repo name conflict in ${repo.local.path}. choose a new repo name:`, availableNames);
      if (newName !== 'skip') {
        repoRslt.local = repo.local.name !== newName ? await local.updateName({ ...repo.local, name: newName }) : repo.local;
        repoRslt.github = repo.github.name !== newName ? await github.updateName(token, { ...repo.github, name: newName }) : repo.github;
      } else {
        exit();
      }
    }
    return repoRslt;
  });
  cli.log('[updateNames]', 'task complete.');
  return rslt;
}

export async function updateRemotes(user, repos) {
  cli.log('[updateRemotes]', 'update remotes for local repos');
  const rslt = mapAsync(repos, async (repo) => {
    const repoRslt = { ...repo };
    if (repo.local) {
      const auxRemotesFilter = filterAuxRemotes(user, repo.local.name, repo.local.remotes);
      const auxRemotesGroup = groupAuxRemotes(auxRemotesFilter);
      const auxRemotes = getAuxRemotes(auxRemotesGroup);
      const mainRemote = getMainRemote(user, repo.local.name);
      repoRslt.local = { ...repo.local, remotes: [mainRemote, ...auxRemotes] };
      repoRslt.local = await local.updateRemote(repoRslt.local);
    }
    return repoRslt;
  });
  cli.log('[updateRemotes]', 'task complete.');
  return rslt;
}

export async function updateMeta(repos) {
  cli.log('[updateMeta]', 'update package.json and github meta');
}

export async function syncRepos(repos) {
  cli.log('[syncRepos]', 'download / upload missing repos');
}
