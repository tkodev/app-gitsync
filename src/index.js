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
  repos = await load(settings.srcDir, settings.token);
  repos = await checkStatus(repos);
  repos = await updateNames();
  repos = await updateRemotes(repos, settings.user);
  repos = await updateMeta(repos);
  repos = await syncRepos(repos);
})();
