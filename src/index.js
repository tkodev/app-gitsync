// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import dotenv from 'dotenv';
import { load, checkStatus, updateNames, updateMeta, syncRepos } from './modules/tasks';

// local dependencies

// ****************************************************************************************************
// Main
// ****************************************************************************************************

(async () => {
  const settings = dotenv.config().parsed;
  let repos = {};
  repos = await load(settings.srcDir, settings.token);
  repos = await checkStatus(repos, settings.user);
  repos = await updateNames(repos, settings.token, settings.user);
  // repos = await updateMeta(repos);
  // repos = await syncRepos(repos);
})();
