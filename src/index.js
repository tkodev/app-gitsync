// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import dotenv from 'dotenv';
import { load, checkStatus, syncRepos, updateNames, updateMeta } from './modules/tasks';

// local dependencies

// ****************************************************************************************************
// Main
// ****************************************************************************************************

(async () => {
  const settings = dotenv.config().parsed;
  let repos = {};
  repos = await load(settings.token, settings.srcDir);
  repos = await checkStatus(repos, settings.user);
  repos = await syncRepos(repos, settings.token, settings.srcDir, settings.user);
  repos = await updateNames(repos, settings.token, settings.user);
  repos = await updateMeta(repos);
})();
