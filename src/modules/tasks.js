// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { intersection } from 'lodash';

// local dependencies
import * as local from './local';
import * as github from './github';
import * as cli from './cli';
import { filter, mapAsync } from './common';

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

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export async function load(token, srcDir) {
  cli.log('[load]', 'loading local & github repos');
  const [localRepos, githubRepos] = await Promise.all([local.load(srcDir), github.load(token)]);
  return mergeRepos(localRepos, githubRepos);
}

export async function checkStatus(user, repos) {
  cli.log('[checkStatus]', 'checking local repo status');
  return filter(repos, (repo) => {
    if (repo.local && repo.local.remotes[0]) {
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
}

export async function updateNames(token, repos) {
  cli.log('[updateNames]', 'detecting repo names');
  return mapAsync(repos, async (repo) => {
    const rslt = { ...repo };
    if (repo.local && repo.github && repo.local.name !== repo.github.name) {
      const names = [
        {
          name: `use local name: ${repo.local.name}`,
          value: repo.local.name
        },
        {
          name: `use github name: ${repo.github.name}`,
          value: repo.github.name
        }
      ];
      const newName = await cli.ask('[updateNames]', `repo name conflict in ${repo.local.path}. choose a new repo name:`, names);
      if (newName !== 'skip') {
        if (repo.local.name !== newName) {
          rslt.local = { ...repo.local, name: newName };
          rslt.local = await local.updateName(rslt.local);
        }
        if (repo.github.name !== newName) {
          rslt.github = { ...repo.github, name: newName };
          rslt.github = await github.updateName(token, rslt.github);
        }
      }
    }
    return rslt;
  });
}

export async function updateRemotes(repos) {
  cli.log('[updateRemotes]', 'update remotes for local repos');
  return mapAsync(repos, async (repo) => {
    const rslt = { ...repo };
    if (repo.local) {
      console.log(repo.local.remotes);
      // const ghRemote = {
      // }
      rslt.local = { ...repo.local };
    }
    return rslt;
  });
}

export async function updateMeta(repos) {
  cli.log('[updateMeta]', 'update package.json and github meta');
}

export async function syncRepos(repos) {
  cli.log('[syncRepos]', 'download / upload missing repos');
}
