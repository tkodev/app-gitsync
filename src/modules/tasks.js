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

export async function checkStatus(repos) {
  cli.log('[checkStatus]', 'checking local repo status');
  return filter(repos, (repo) => {
    const rslt = repo.local ? !(repo.local.status.behind + repo.local.status.ahead + repo.local.status.files.length) : true;
    if (!rslt) {
      cli.log('[checkStatus]', `excluded from sync due to untracked or upstream changes: ${repo.local.path}`);
    }
    return rslt;
  });
}

export async function updateNames(token, repos) {
  cli.log('[updateNames]', 'detecting repo names');
  return mapAsync(repos, async (repo) => {
    const rslt = { ...repo };
    if (rslt.local && rslt.github && rslt.local.name !== rslt.github.name) {
      const names = [
        {
          name: `use local name: ${rslt.local.name}`,
          value: rslt.local.name
        },
        {
          name: `use github name: ${rslt.github.name}`,
          value: rslt.github.name
        }
      ];
      const newName = await cli.ask('[updateNames]', `repo name conflict in ${rslt.local.path}. choose a new repo name:`, names);
      if (newName !== 'skip') {
        if (rslt.local.name !== newName) {
          rslt.local = { ...rslt.local, name: newName };
          rslt.local = await local.updateName(token, rslt.local);
        }
        if (rslt.github.name !== newName) {
          rslt.github = { ...rslt.github, name: newName };
          rslt.github = await github.updateName(token, rslt.github);
        }
      }
    }
    return rslt;
  });
}

export async function updateRemotes() {
  cli.log('[updateRemotes]', 'update remotes for local repos');
}

export async function updateMeta() {
  cli.log('[updateMeta]', 'update package.json and github meta');
}

export async function syncRepos(repos) {
  cli.log('[syncRepos]', 'download / upload missing repos');
}
