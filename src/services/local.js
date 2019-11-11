// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import glob from 'fast-glob';
import path from 'path';
import normalize from 'normalize-path';
import git from 'nodegit';

// local dependencies
import { asyncMap } from '../../local_modules/htko';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

async function readRepos(srcDir) {
  return glob('**/.git', {
    cwd: normalize(srcDir),
    ignore: ['**/{.git,node_modules}/**/*'],
    onlyDirectories: true,
    absolute: true
  }).then((reposPaths) => {
    return asyncMap(reposPaths, async (repoPath) => {
      return git.Repository.open(path.dirname(repoPath));
    });
  });
}

async function readJsons(repos) {
  return asyncMap(repos, async (repo) => {
    return path.join(repo.workdir(), 'package.json');
  });
}

async function requestRepos(srcDir) {
  const repos = await readRepos(srcDir);
  const jsons = await readJsons(repos);
  return asyncMap(repos, async (repo, idx) => {
    return {
      path: repo.workdir(),
      name: '',
      license: '',
      description: '',
      keywords: '',
      homepage: '',
      remotes: '',
      status: '',
      hash: '',
      json: ''
    };
  });
}

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class LocalService {
  constructor(srcDir) {
    this.srcDir = srcDir;
  }
  async getRepos() {
    const repos = await requestRepos(this.srcDir);
    return repos;
  }
}
