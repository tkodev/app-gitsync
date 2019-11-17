// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import dotenv from 'dotenv';
import process from 'process';
import { intersection, reduce, mapValues } from 'lodash';

// local dependencies
import * as local from './modules/local';
import * as github from './modules/github';
import * as cli from './modules/cli';
import { asyncMapP, asyncReduce } from './modules/common';

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

function newRemoteName(url) {
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

export const updateRemotes = async function updateRemotes(repos, user) {
  cli.log('[updateRemotes]', 'update local repo remotes && github repo names');
  return mapValues(repos, (repo, repoName) => {
    // take note obj references here. We should return new objects.
    if (repo.local) {
      repo.local.name = repoName;
      repo.local.remotes = [
        {
          name: 'origin',
          refs: {
            fetch: `https://${user}@github.com/${user}/${repoName}.git`,
            push: `https://${user}@github.com/${user}/${repoName}.git`
          }
        },
        ...repo.local.remotes
          .filter((remote) => !remote.refs.fetch.includes('github.com'))
          .map((remote) => {
            // take note obj references here. We should return new objects.
            remote.name = newRemoteName(remote.refs.fetch);
            return remote;
          })
      ];
      // set local remotes here
    }
    if (repo.github) {
      repo.github.name = repoName;
      // set github rename here
    }
    return repo;
  });
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

// export const checkStatus = async function checkStatus(repos) {
//   cli.log('[checkStatus]', 'checking local repo status');
//   return repos
//     .filter((repo) => !!repo.status.files.length)
//     .map((repo) => {
//       cli.log('[checkStatus]', `${repo.name} repo default branch out of sync with remote`);
//       return repo;
//     })
//     .map((repo) => {
//       cli.log('[checkStatus]', 'please resolve repo status.');
//       process.exit();
//       return repo;
//     });
// };

// ****************************************************************************************************
// Main
// ****************************************************************************************************

(async () => {
  cli.log('[app]', 'starting');
  const settings = dotenv.config().parsed;
  let repos = await load(settings.srcDir, settings.token);
  repos = await updateRemotes(repos, settings.user);
  // localRepos = await updateRemotes(localRepos, githubRepos, settings.user);
  // [localRepos, githubRepos] = await syncRepos(localRepos, githubRepos);
  // const pendingRepos = await checkStatus(localRepos);
  cli.log('[app]', 'exiting');
})();
