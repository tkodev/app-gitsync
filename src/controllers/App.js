// ****************************************************************************************************
// Init
// ****************************************************************************************************

// local dependencies
import settings from '../../.env.json';
import GithubModel from '../models/Github';
import LocalModel from '../models/Local';
import CliView from '../views/Cli';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class AppController {
  constructor() {
    this.settings = settings;
    this.githubModel = new GithubModel(this.settings);
    this.localModel = new LocalModel(this.settings);
    this.cliView = new CliView(this.settings);
  }
  async load() {
    await this.cliView.load();
    this.cliView.log('loading github repos');
    await this.githubModel.load();
    this.cliView.log('loading local repos');
    await this.localModel.load();
    await this.checkStatus();
  }
  async checkStatus() {
    this.cliView.log('checking repo status');
    const localRepos = this.localModel.read();
    const pendingRepos = localRepos.filter((repo) => !!repo.status.files.length);
    if (pendingRepos.length) {
      pendingRepos.forEach((repo) => this.cliView.log(repo.path, 'has uncommited file changes'));
      return;
    }
    await this.unload();
  }
  async unload() {
    this.cliView.unload();
  }
}
