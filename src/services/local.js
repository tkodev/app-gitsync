// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import glob from 'fast-glob';
import path from 'path';
import normalize from 'normalize-path';
import git from 'nodegit';

// local dependencies
import { asyncMap } from '../../local_modules/async';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

async function retrieveRepos(directory) {
  const repoPaths = await glob('**/.git', {
    cwd: normalize(directory),
    ignore: ['**/{.git,node_modules}/**/*'],
    onlyDirectories: true,
    absolute: true
  });
  return asyncMap(repoPaths, async (repoPath) => {
    return git.Repository.open(path.dirname(repoPath));
  });
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

async function compileRepos(repos) {
  return asyncMap(repos, async (repo) => {
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
}

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class Github {
  constructor(srcDir) {
    this.srcDir = srcDir;
  }
  async getRepos() {
    const repos = await retrieveRepos(this.srcDir);
    const rslt = await compileRepos(repos);
    return rslt;
  }
  async setRepos() {
    console.log(this);
  }
}
