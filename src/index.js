// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import dotenv from 'dotenv';
import { load, checkStatus, updateRemotes, sync } from './modules/tasks';

// local dependencies

// ****************************************************************************************************
// Main
// ****************************************************************************************************

(async () => {
  const settings = dotenv.config().parsed;
  let repos = {};
  repos = await load(settings.srcDir, settings.token);
  repos = await checkStatus(repos);
  repos = await updateRemotes(repos, settings.user);
  repos = await sync(repos);
})();
