// ****************************************************************************************************
// Init
// ****************************************************************************************************

// local dependencies
import CliView from '../views/Cli';
import ReposModel from '../models/Repos';
import GithubService from '../services/Github';
import LocalService from '../services/Local';

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class Sync {
  constructor() {
    this.views = {
      cli: new CliView()
    };
    this.models = {
      github: new ReposModel(),
      local: new ReposModel()
    };
    this.services = {
      github: new GithubService(),
      local: new LocalService()
    };
  }
  async start() {
    console.log(this);
  }
}
