// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import process from 'process';
import { intersection, reduce, mapValues } from 'lodash';

// local dependencies
import * as local from './local';
import * as github from './github';
import * as cli from './cli';
import { asyncMapP, asyncReduce } from './common';

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

export const load = async function load(srcDir, token) {
  cli.log('[load]', 'loading local & github repos');
  const [localRepos, githubRepos] = await Promise.all([local.load(srcDir), github.load(token)]);
  return mergeRepos(localRepos, githubRepos);
};

export const checkStatus = async function checkStatus(repos) {
  cli.log('[checkStatus]', 'checking local repo status');
  console.log(repos);
  // const rslt = repos.filter((repo) => {
  //   if (repo.local && repo.local.status.files.length) {
  //     cli.log('[checkStatus]', `${repo.name} repo default branch out of sync with remote. Please resolve repo manually.`);
  //     return true;
  //   }
  //   return false;
  // });
};

export const updateRemotes = async function updateRemotes(repos, user) {
  cli.log('[updateRemotes]', 'update local repo remotes && github repo names');
  return mapValues(repos, (repo, repoName) => {
    const rslt = { ...repo };
    if (rslt.local) {
      rslt.local = {
        ...rslt.local,
        name: repoName,
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
      // update local remotes here
    }
    if (rslt.github) {
      rslt.github = {
        ...rslt.github,
        name: repoName
      };
      // update github name here
    }
    return rslt;
  });
};

export const sync = async function sync(repos) {
  // temp
};

// export const syncRepos = async function syncRepos(localRepos, githubRepos) {
//   cli.log('[syncRepos]', 'sync missing repos');
//   const localRslt = await asyncReduce(
//     getOrphanRepos(localRepos, githubRepos),
//     async (accum, repo) => {
//       const answer = await cli.ask('[syncRepos]', `${repo.name} repo does not exist on github`, ['create github repo', 'delete local repo']);
//       if (answer === 'c') {
//         github.create(repo);
//         // add rslt add/remove action here
//       } else if (answer === 'd') {
//         local.delete(repo);
//         // add rslt add/remove action here
//       }
//     },
//     [...localRepos]
//   );
//   const githubRslt = await asyncReduce(
//     getOrphanRepos(githubRepos, localRepos),
//     async (accum, repo) => {
//       const answer = await cli.ask('[syncRepos]', `${repo.name} repo does not exist locally`, ['create local repo', 'delete github repo']);
//       if (answer === 'c') {
//         local.create(repo);
//         // add rslt add/remove action here
//       } else if (answer === 'd') {
//         github.delete(repo);
//         // add rslt add/remove action here
//       }
//     },
//     [...githubRepos]
//   );
//   return [localRslt, githubRslt];
// };
