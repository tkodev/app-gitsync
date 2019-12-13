// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import dotenv from 'dotenv';
import Tasks from './modules/tasks';

// ****************************************************************************************************
// Main
// ****************************************************************************************************

(async () => {
  const settings = dotenv.config().parsed;
  const tasks = new Tasks(settings);
  let repos = {};
  repos = await tasks.load(settings.token, settings.srcDir);
  repos = await tasks.checkStatus(repos, settings.user);
  repos = await tasks.syncRepos(repos, settings.token, settings.srcDir, settings.user);
  repos = await tasks.updateNames(repos, settings.token, settings.user);
  repos = await tasks.updateMeta(repos);
})();
