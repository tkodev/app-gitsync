// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { intersection as _intersection } from 'lodash';

// local dependencies
import * as local from './local';
import * as github from './github';
import * as cli from './cli';
import { filter, reduce, mapAsync, groupByUniqueKey } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

function getLocalName(githubRepo, localRepos) {
  return localRepos.reduce((accum, localRepo) => {
    return _intersection(githubRepo.aliases, localRepo.aliases).length ? localRepo.name : accum;
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

function getNewRemotes(remotes, user, aliases, newName) {
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
    return !remote.match(new RegExp(`github.com.*[\:\\\/]${user}[\\\/](${aliases.join('|')})`, 'gi'));
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

export async function load(token, srcDir) {
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
    if (repo.local && repo.local.branch !== 'master') {
      cli.log('[checkStatus]', `excluded from sync - not on master branch: ${repo.local.path}`);
      return false;
    }
    if (repo.github && repo.github.branch !== 'master') {
      cli.log('[checkStatus]', `excluded from sync - default branch not master: ${repo.github.path}`);
      return false;
    }
    if (repo.local && Object.keys(repo.local.remotes).length) {
      const inSync = !(repo.local.status.behind + repo.local.status.ahead + repo.local.status.files.length);
      if (!inSync) {
        cli.log('[checkStatus]', `excluded from sync - untracked or upstream changes: ${repo.local.path}`);
        return false;
      }
      const ownerRepo = reduce(
        repo.local.remotes,
        (accum, remote) => {
          return remote.match(new RegExp(`github.com.*[\:\\\/]${user}[\\\/]`, 'gi')) ? true : accum;
        },
        false
      );
      if (!ownerRepo) {
        cli.log('[checkStatus]', `excluded from sync - github remote repo not owned by user: ${repo.local.path}`);
        return false;
      }
    }
    return true;
  });
  cli.log('[checkStatus]', 'task complete.');
  return rslt;
}

export async function syncRepos(repos, token, srcDir, user) {
  cli.log('[syncRepos]', 'download / upload missing repos');
  const syncedRepos = await mapAsync(repos, async (repo) => {
    const repoRslt = { ...repo };
    if (repoRslt.local && !repoRslt.github) {
      const answer = await cli.ask('[syncRepos]', `local repo not in github ${repo.local.path}. choose an action:`, [
        { name: 'upload to github', value: 'upload' },
        { name: 'remove local repo', value: 'remove' }
      ]);
      const newRemotes = getNewRemotes(repoRslt.local.remotes, user, repoRslt.local.aliases, repoRslt.local.name);
      switch (answer) {
        case 'upload':
          repoRslt.local = { ...repoRslt.local, remotes: newRemotes };
          cli.log('[syncRepos]', 'uploading to new github repo', repoRslt.local.name);
          repoRslt.github = await github.create(repoRslt.local, token);
          cli.log('[syncRepos]', 'removing local remotes', repoRslt.local.path, repoRslt.local.remotes);
          cli.log('[syncRepos]', 'adding local remotes', repoRslt.local.path, newRemotes);
          repoRslt.local = await local.updateRemotes(repoRslt.local);
          cli.log('[syncRepos]', 'pushing to github repo', repoRslt.local.name);
          repoRslt.local = await local.updatePush(repoRslt.local);
          break;
        case 'remove':
          cli.log('[syncRepos]', 'deleting local repo', repoRslt.local.path);
          await local.remove(repoRslt.local);
          delete repoRslt.local;
          break;
        default:
          delete repoRslt.local;
          break;
      }
    }
    if (repoRslt.github && !repoRslt.local) {
      const answer = await cli.ask('[syncRepos]', `github repo not in local ${repo.github.path}. choose an action:`, [
        { name: 'clone to local', value: 'clone' },
        { name: 'remove github repo', value: 'remove' }
      ]);
      switch (answer) {
        case 'clone':
          cli.log('[syncRepos]', 'cloning to new local repo', repoRslt.github.path);
          repoRslt.local = await local.create(repoRslt.github, `git@github.com:${user}/${repoRslt.github.name}.git`, srcDir);
          break;
        case 'remove':
          cli.log('[syncRepos]', 'deleting github repo', repoRslt.local.path);
          await github.remove(repoRslt.github, token, user);
          delete repoRslt.github;
          break;
        default:
          delete repoRslt.github;
          break;
      }
    }
    return repoRslt;
  });
  const rslt = filter(syncedRepos, (repo) => repo.local && repo.github);
  cli.log('[syncRepos]', 'task complete.');
  return rslt;
}

export async function updateNames(repos, token, user) {
  cli.log('[updateNames]', 'detecting repo names');
  const rslt = await mapAsync(repos, async (repo) => {
    const repoRslt = { ...repo };
    if (repoRslt.local && repoRslt.github) {
      const newName = repoRslt.local.name !== repoRslt.github.name ? await getNewName(repoRslt) : repoRslt.github.name;
      if (repoRslt.local.name !== newName) {
        cli.log('[updateNames]', 'updating local name', repoRslt.local.path);
        repoRslt.local = { ...repoRslt.local, name: newName };
        repoRslt.local = await local.updateName(repoRslt.local);
      }
      if (repoRslt.github.name !== newName) {
        cli.log('[updateNames]', 'updating github name', repoRslt.github.path);
        repoRslt.github = { ...repoRslt.github, name: newName };
        repoRslt.github = await github.updateName(repoRslt.github, token);
        const newRemotes = getNewRemotes(repoRslt.local.remotes, user, repoRslt.github.aliases, newName);
        repoRslt.local = { ...repoRslt.local, remotes: newRemotes };
        cli.log('[updateNames]', 'removing local remotes', repoRslt.local.path, repoRslt.local.remotes);
        cli.log('[updateNames]', 'adding local remotes', repoRslt.local.path, newRemotes);
        repoRslt.local = await local.updateRemotes(repoRslt.local);
      }
    }
    return repoRslt;
  });
  cli.log('[updateNames]', 'task complete.');
  return rslt;
}

export async function updateMeta(repos) {
  cli.log('[updateMeta]', 'update package.json and github meta');
}
