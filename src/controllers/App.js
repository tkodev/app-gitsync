// ****************************************************************************************************
// Init
// ****************************************************************************************************

// local dependencies
import CliView from '../views/Cli';
import SettingsModel from '../models/Settings';
import ReposModel from '../models/Repos';
import GithubService from '../services/Github';
import LocalService from '../services/Local';
import settings from '../../.env.json';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class AppController {
  constructor() {
    this.cliViews = new CliView();
    this.settingsModel = new SettingsModel(settings);
    this.githubModel = new ReposModel();
    this.localModel = new ReposModel();
    this.githubService = new GithubService(this.settingsModel.token);
    this.localService = new LocalService(this.settingsModel.srcDir);
  }
  async start() {
    this.cliViews.start();
    const [githubRepos, localRepos] = await Promise.all([this.githubService.getRepos(), this.localService.getRepos()]);
    this.githubModel.setRepos(githubRepos);
    this.localModel.setRepos(localRepos);
  }
}
