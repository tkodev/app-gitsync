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
    this.cliView.load();
    await Promise.all([this.githubModel.load(), this.localModel.load()]);
  }
}
