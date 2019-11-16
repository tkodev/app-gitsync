// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import path from 'path';
import glob from 'fast-glob';
import git from 'simple-git/promise';
import { uniq, compact } from 'lodash';

// local dependencies
import { asyncMapS, asyncMap, posixPath } from '../../local_modules/htko';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

async function getRepoFile(repoObj, file, isObj) {
  return repoObj
    .show([`master:${file}`])
    .then((data) => (isObj ? JSON.parse(data) : data))
    .catch(() => (isObj ? {} : ''));
}

async function readLocal(srcDir) {
  return glob('**/.git', {
    cwd: posixPath(srcDir),
    ignore: ['**/{.git,node_modules}/**/*'],
    onlyDirectories: true,
    absolute: true
  }).then((repoPaths) => asyncMap(repoPaths, (repoPath) => git(path.dirname(repoPath, '.git')).silent(true)));
}

async function readRepoObj(repoObj, idx) {
  // await repoObj.fetch();
  const repoPath = await repoObj.revparse(['--absolute-git-dir']).then((data) => path.dirname(data));
  const packageObj = await getRepoFile(repoObj, 'package.json', true);
  const readmeStr = await getRepoFile(repoObj, 'README.md');
  const status = await repoObj.status();
  const remotes = await repoObj.getRemotes(true);
  const remoteNames = remotes.map((data) => (data.refs.fetch.includes('github') ? path.basename(data.refs.fetch, '.git') : null));
  const aliases = uniq(compact([path.basename(repoPath), packageObj.name, ...remoteNames]));
  return {
    path: repoPath,
    package: packageObj,
    readme: readmeStr,
    remotes,
    status,
    aliases
  };
}

async function readRepos(repoObjs) {
  return asyncMap(repoObjs, readRepoObj);
}

async function cloneRepos(cloneUrls, settings) {
  return asyncMap(cloneUrls, async (cloneUrl) => {
    const repoObj = await git(settings.srcDir).clone(cloneUrl);
    return readRepoObj(repoObj);
  });
}

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class LocalService {
  constructor(settings) {
    this.settings = settings;
    this.projects = [];
  }
  async load() {
    const repoObjs = await readLocal(this.settings.srcDir);
    this.repos = await readRepos(repoObjs);
    return this.repos;
  }
  async create(remoteRepos) {
    // this.repos = await cloneRepos(clonePaths, this.settings);
    return this.repos;
  }
  read() {
    return this.repos;
  }
}
