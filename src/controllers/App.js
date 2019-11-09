// ****************************************************************************************************
// Init
// ****************************************************************************************************

// local dependencies
import Repos from '../models/Repos';

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class Sync {
  constructor() {
    this.localRepos = new Repos();
    this.githubRepos = new Repos();
  }
  async start() {
    console.log(this);
  }
}
