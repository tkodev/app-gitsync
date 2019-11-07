// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import glob from 'fast-glob';
import path from 'path';
import normalize from 'normalize-path';
import git from 'nodegit';

// local dependencies
import { asyncMap } from '../libraries/async';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

async function getRepos(directory) {
  const repoPaths = await glob('**/.git', {
    cwd: normalize(directory),
    ignore: ['**/{.git,node_modules}/**/*'],
    onlyDirectories: true,
    absolute: true
  });
  const rslt = await asyncMap(repoPaths, async (repoPath) => {
    return git.Repository.open(path.dirname(repoPath));
  });
  return rslt;
}

async function getRemotes(repo) {
  return repo.getRemotes().then((remotesArr) => {
    return remotesArr.reduce((obj, remote) => {
      // eslint-disable-next-line no-param-reassign
      obj[remote.name()] = remote.url();
      return obj;
    }, {});
  });
}

async function getStatus(repo) {
  return repo.getStatus().then((statusArr) => {
    return statusArr.length;
  });
}

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class Service {
  constructor(options) {
    console.log('[local] init');
    this.directory = options.directory;
  }
  async list() {
    console.log('[local] list');
    const repos = await getRepos(this.directory);
    const rslt = await asyncMap(repos, async (repo) => {
      return {
        name: path.basename(repo.workdir()),
        path: repo.workdir(),
        license: '',
        description: '',
        keywords: [],
        homepage: '',
        remotes: await getRemotes(repo),
        status: await getStatus(repo)
      };
    });
    this.repos = rslt;
    return this.repos;
  }
}
