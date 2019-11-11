// ****************************************************************************************************
// Init
// ****************************************************************************************************

// local dependencies
import RepoModel from './Repo';
import { asyncForEach } from '../../local_modules/htko';

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class ReposModel {
  constructor() {
    this.repos = {};
  }
  create(id, repo) {
    if (id) this.repos[id] = new RepoModel(repo);
  }
  delete(id) {
    if (id) delete this.repos[id];
  }
  setRepos(repos) {
    asyncForEach(repos, (repo) => {
      this.repos[repo.name] = new RepoModel(repo);
    });
  }
}