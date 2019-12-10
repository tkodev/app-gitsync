// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import process from 'process';
import { intersection, uniq, compact } from 'lodash';

// local dependencies
import * as local from './local';
import * as github from './github';
import * as cli from './cli';
import { map, filter, reduce, mapAsync } from './common';

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
  return filter(repos, (repo) => {
    const rslt = repo.local ? !(repo.local.status.behind + repo.local.status.ahead + repo.local.status.files.length) : true;
    if (!rslt) {
      cli.log('[checkStatus]', `excluded from sync: ${repo.local.path} has untracked or upstream changes with origin master branch. please reconcile.`);
    }
    return rslt;
  });
}

export async function updateNames(repos) {
  cli.log('[updateNames]', 'detecting repo names');
  return mapAsync(repos, async (repo) => {
    const rslt = { ...repo };
    if (rslt.local && rslt.github && rslt.local.name !== rslt.github.name) {
      const names = [
        {
          name: `local name: ${rslt.local.name}`,
          value: rslt.local.name
        },
        {
          name: `github name: ${rslt.github.name}`,
          value: rslt.github.name
        }
      ];
      const answer = await cli.ask('[updateNames]', `repo name conflict in ${rslt.local.path}. choose a new repo name:`, names);
      if (answer !== 'skip') {
        if (rslt.local.name !== answer) {
          rslt.local = { ...repo.local, name: answer };
          local.updateName(repo);
        }
        if (rslt.github.name !== answer) {
          rslt.github = { ...repo.github, name: answer };
          github.updateName(repo);
        }
      }
    }
    return rslt;
  });
}

export async function updateRemotes(repos, user) {
  cli.log('[updateRemotes]', 'update local repo remotes && github repo names');
  return map(repos, (repo, repoName) => {
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
