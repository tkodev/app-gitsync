// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import dotenv from 'dotenv';
import process from 'process';

// local dependencies
import * as local from './modules/local';
import * as github from './modules/github';
import * as cli from './modules/cli';
// import { asyncForEach, asyncMap } from './modules/common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

function checkStatus(repos) {
  const rslt = repos
    .filter((repo) => {
      return !!repo.status.files.length;
    })
    .map((repo) => {
      cli.log('[checkStatus]', `${repo.name} repo default branch out of sync with remote`);
      return repo;
    });
  if (rslt.length) {
    cli.log('[checkStatus]', 'please resolve repo status.');
    process.exit();
  }
  return rslt;
}

async function syncRepos() {
  // temp
}

// ****************************************************************************************************
// Main
// ****************************************************************************************************

(async () => {
  cli.log('[app]', 'starting');
  const settings = dotenv.config().parsed;
  cli.log('[load]', 'loading local repos');
  const localRepos = await local.load(settings.srcDir);
  cli.log('[load]', 'loading github repos');
  const githubRepos = await github.load(settings.token);
  cli.log('[checkStatus]', 'checking local repo status');
  const pendingRepos = checkStatus(localRepos);
  cli.log('[app]', 'exiting');
})();
