// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import dotenv from 'dotenv';
import { load, checkStatus, updateNames, updateRemotes, syncRepos, updateMeta } from './modules/tasks';

// local dependencies

// ****************************************************************************************************
// Main
// ****************************************************************************************************

(async () => {
  const settings = dotenv.config().parsed;
  let repos = {};
  repos = await load(settings.token, settings.srcDir);
  repos = await checkStatus(repos);
  repos = await updateNames(settings.token, repos);
  // repos = await updateRemotes(repos, settings.user);
  // repos = await updateMeta(repos);
  // repos = await syncRepos(repos);
})();
