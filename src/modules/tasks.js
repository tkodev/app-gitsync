// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import process from 'process';
import { intersection, reduce } from 'lodash';

// local dependencies
import * as local from './local';
import * as github from './github';
import * as cli from './cli';
import { asyncMapObj } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

function isSameRepo(repoA, repoB) {
  return intersection(repoA.aliases, repoB.aliases).length;
}

function getLocalName(githubRepo, localRepos) {
  return localRepos.reduce((accum, localRepo) => {
    return isSameRepo(githubRepo, localRepo) ? localRepo.name : accum;
  }, githubRepo.name);
}

function mergeRepos(localRepos, githubRepos) {
  return [...localRepos, ...githubRepos].reduce((rslt, repo) => {
    /* eslint-disable no-param-reassign */
    const name = repo.type === 'github' ? getLocalName(repo, localRepos) : repo.name;
    rslt[name] = rslt[name] || {};
    rslt[name][repo.type] = repo;
    return rslt;
  }, {});
}

function getRemote(name, url) {
  return {
    name,
    refs: {
      fetch: url,
      push: url
    }
  };
}

function getRemoteName(url) {
  const dict = {
    origin: ['github.com'],
    brandfire: ['brandfire', 'bfmg'],
    bitbucket: ['bitbucket', 'atlassian'],
    pantheon: ['pantheon', 'drush.in', 'codeserver']
  };
  return reduce(
    dict,
    (accum, keywords, name) => {
      const newName = keywords.some((keyword) => url.includes(keyword)) ? name : null;
      return accum === 'other' && newName ? newName : accum;
    },
    'other'
  );
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export async function load(srcDir, token) {
  cli.log('[load]', 'loading local & github repos');
  const [localRepos, githubRepos] = await Promise.all([local.load(srcDir), github.load(token)]);
  return mergeRepos(localRepos, githubRepos);
}

export async function checkStatus(repos) {
  cli.log('[checkStatus]', 'checking local repo status');
  // filter through repos and remove ones that have a status
}

export async function updateNames(repos) {
  cli.log('[updateNames]', 'detecting repo names');
  // detect name differences and allow user to choose
}

export async function updateRemotes(repos, user) {
  cli.log('[updateRemotes]', 'update local repo remotes && github repo names');
  return asyncMapObj(repos, (repo, repoName) => {
    const rslt = { ...repo };
    if (rslt.local) {
      rslt.local = {
        ...rslt.local,
        remotes: [
          getRemote('origin', `https://${user}@github.com/${user}/${repoName}.git`),
          ...repo.local.remotes
            .filter((remote) => {
              return !remote.refs.fetch.includes('github.com');
            })
            .map((remote) => {
              return getRemote(getRemoteName(remote.refs.fetch), remote.refs.fetch);
            })
        ]
      };
      // update local remotes here if different from repoName
    }
    if (rslt.github) {
      // update github name here
    }
    return rslt;
  });
}

export async function syncRepos(repos) {
  cli.log('[syncRepos]', 'download / upload missing repos');
}

export async function updateMeta() {
  cli.log('[updateMeta]', 'update package.json and github meta');
}
