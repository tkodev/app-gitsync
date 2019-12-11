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
import { filter, mapAsync, groupByUniqueKey } from './common';

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

async function getNewName(repo) {
  const newNames = [
    {
      name: `use local name: ${repo.local.name}`,
      value: repo.local.name
    },
    {
      name: `use github name: ${repo.github.name}`,
      value: repo.github.name
    }
  ];
  const rslt = cli.ask('[updateNames]', `repo name conflict in ${repo.local.path}. choose a new repo name:`, newNames);
  return rslt !== 'skip' ? rslt : null;
}

function getNewRemotes(remotes, user, oldName, newName) {
  const types = [
    { name: 'other', regex: new RegExp('.*') },
    { name: 'pantheon', regex: new RegExp('(pantheon|drush.in|codeserver)', 'gi') },
    { name: 'bitbucket', regex: new RegExp('(bitbucket|atlassian)', 'gi') },
    { name: 'brandfire', regex: new RegExp('(brandfire|bfmg)', 'gi') },
    { name: 'github', regex: new RegExp('github.com', 'g') }
  ];
  const mainRemotes = {
    origin: `git@github.com:${user}/${newName}.git`
  };
  const auxRemotesFilter = filter(remotes, (remote) => {
    return !remote.match(new RegExp(`github.com.*[\:\\\/]${user}[\\\/](${oldName}|${newName})`, 'gi'));
  });
  const auxRemotes = groupByUniqueKey(auxRemotesFilter, (remote) => {
    return types.reduce((nameAccum, type) => (remote.match(type.regex) ? type.name : nameAccum));
  });
  return {
    ...mainRemotes,
    ...auxRemotes
  };
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export async function load(srcDir, token) {
  cli.log('[load]', 'loading github repos');
  const localRepos = await local.load((repoPath) => {
    cli.log('[load]', `local repo ${repoPath}`);
  }, srcDir);
  const githubRepos = await github.load((repoPath) => {
    cli.log('[load]', `github repo ${repoPath}`);
  }, token);
  cli.log('[load]', 'loading local repos');
  const rslt = mergeRepos(localRepos, githubRepos);
  cli.log('[load]', 'task complete.');
  return rslt;
}

export async function checkStatus(repos, user) {
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
        return remote.match(new RegExp(`[\:\\\/]${user}[\\\/]`, 'gi'));
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

export async function updateNames(repos, token, user) {
  cli.log('[updateNames]', 'detecting repo names');
  const rslt = mapAsync(repos, async (repo) => {
    const repoRslt = { ...repo };
    if (repoRslt.local && repoRslt.github) {
      const newName = repoRslt.local.name !== repoRslt.github.name ? await getNewName(repoRslt) : repoRslt.github.name;
      const newRemotes = getNewRemotes(repoRslt.local.remotes, user, repoRslt.github.name, newName);
      if (repoRslt.local.name !== newName) {
        cli.log('[updateNames]', 'updating local name', repoRslt.local.path);
        repoRslt.local = { ...repoRslt.local, name: newName };
        repoRslt.local = await local.updateName(repoRslt.local);
      }
      if (repoRslt.github.name !== newName) {
        cli.log('[updateNames]', 'updating github name', repoRslt.github.path);
        repoRslt.github = { ...repoRslt.github, name: newName };
        repoRslt.github = await github.updateName(repoRslt.github, token);
        cli.log('[updateNames]', 'removing local remotes', repoRslt.local.path, repoRslt.local.remotes);
        cli.log('[updateNames]', 'adding local remotes', repoRslt.local.path, newRemotes);
        repoRslt.local = { ...repoRslt.local, remotes: newRemotes };
        repoRslt.local = await local.updateRemotes(repoRslt.local);
      }
    }
    return repoRslt;
  });
  cli.log('[updateNames]', 'task complete.');
  return rslt;
}

export async function syncRepos(repos) {
  cli.log('[syncRepos]', 'download / upload missing repos');
}

export async function updateMeta(repos) {
  cli.log('[updateMeta]', 'update package.json and github meta');
}
