// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { intersection, intersectionWith, differenceWith } from 'lodash';

// local dependencies
import { asyncForEach, asyncMap } from '../../local_modules/htko';
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
    this.cliView.log('[load]', 'loading github repos');
    await this.githubModel.load();
    this.cliView.log('[load]', 'loading local repos');
    await this.localModel.load();
    await this.checkStatus();
  }
  async checkStatus() {
    this.cliView.log('[checkStatus]', 'checking local repo status');
    const localRepos = this.localModel.read();
    const pendingRepos = localRepos.filter((repo) => !!repo.status.files.length);
    if (pendingRepos.length) {
      pendingRepos.forEach((repo) => {
        this.cliView.log('[checkStatus]', `${repo.name} repo default branch out of sync with remote`);
      });
      this.cliView.log('[checkStatus]', 'please resolve repo status.');
      // return;
    }
    await this.syncRepos();
  }
  async updateRemotes() {
    
  }
  async syncRepos() {
    this.cliView.log('[syncRepos]', 'sync missing repos');
    const localRepos = this.localModel.read();
    const githubRepos = this.githubModel.read();
    await asyncForEach(
      differenceWith(localRepos, githubRepos, (repoA, repoB) => {
        return intersection(repoA.aliases, repoB.aliases).length;
      }),
      async (repo) => {
        const answer = await this.cliView.ask('[syncRepos]', `${repo.name} repo does not exist on github`, ['create github repo', 'delete local repo']);
        if (answer === 'c') {
          this.githubModel.create(repo);
        } else if (answer === 'd') {
          this.localModel.delete(repo);
        }
      }
    );
    await asyncForEach(
      differenceWith(githubRepos, localRepos, (repoA, repoB) => {
        return intersection(repoA.aliases, repoB.aliases).length;
      }),
      async (repo) => {
        const answer = await this.cliView.ask('[syncRepos]', `${repo.name} repo does not exist locally`, ['create local repo', 'delete github repo']);
        if (answer === 'c') {
          this.localModel.create(repo);
        } else if (answer === 'd') {
          this.githubModel.delete(repo);
        }
      }
    );
    await this.updateNames();
  }
  async updateRepos() {
    this.cliView.log('[updateNames]', 'update local and github repo names');
    const localRepos = this.localModel.read();
    const githubRepos = this.githubModel.read();
    await asyncForEach(
      intersectionWith(localRepos, githubRepos, (repoA, repoB) => {
        return intersection(repoA.aliases, repoB.aliases).length;
      }),
      async (repo) => {
        // console.log
      }
    );
    await asyncForEach(
      intersectionWith(githubRepos, localRepos, (repoA, repoB) => {
        return intersection(repoA.aliases, repoB.aliases).length;
      }),
      async (repo) => {
        // test
      }
    );
    await this.unload();
  }
  async unload() {
    this.cliView.unload();
  }
}
