// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import glob from 'fast-glob';
import path from 'path';
import normalize from 'normalize-path';
import git from 'nodegit';

// local dependencies
import { asyncForEach, asyncMap, asyncReduce } from '../libraries/async';

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class Service {
  constructor(options) {
    this.reposPath = options.reposPath;
    this.repos = [];
  }
  async list() {
    this.repos = await glob('**/.git', {
      cwd: normalize(this.reposPath),
      ignore: ['**/{.git,node_modules}/**/*'],
      onlyDirectories: true,
      absolute: true
    });
    this.repos = this.repos.map((repoPath) => path.dirname(repoPath));
    this.repos = await asyncMap(this.repos, async (repoPath) => {
      const repo = await git.Repository.open(repoPath);
      const remotes = await repo.getRemotes().then((remotesArr) => {
        // prettier-ignore
        return remotesArr.reduce((obj, remote) => {
          // eslint-disable-next-line no-param-reassign
          obj[remote.name()] = remote.url(); 
          return obj;
        }, {});
      });
      const status = await repo.getStatus().then((statusArr) => {
        return statusArr.length;
      });
      return {
        name: path.basename(repoPath),
        path: repoPath,
        remotes,
        status
      };
    });
    return this.repos;
  }
}
