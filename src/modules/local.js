// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import path from 'path';
import glob from 'fast-glob';
import git from 'simple-git/promise';
import { uniq, compact, values } from 'lodash';

// local dependencies
import { asyncMapP, asyncMap, posixPath } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

async function readLocal(srcDir) {
  return glob('**/.git', {
    cwd: posixPath(srcDir),
    ignore: ['**/{.git,node_modules}/**/*'],
    onlyDirectories: true,
    absolute: true
  }).then((repoPaths) => asyncMapP(repoPaths, (repoPath) => git(path.dirname(repoPath, '.git')).silent(true)));
}

async function createLocal(repo) {
  // temp
}

async function removeLocal(repo) {
  // temp
}

async function formatRepo(repoObj) {
  // await repoObj.fetch();
  const repoPath = await repoObj.revparse(['--absolute-git-dir']).then((data) => path.dirname(data));
  const repoName = path.basename(repoPath);
  const packageObj = await repoObj
    .show([`master:package.json`])
    .then((data) => JSON.parse(data))
    .catch(() => ({}));
  const readmeStr = await repoObj
    .show([`master:README.md`])
    .then((data) => data.toString())
    .catch(() => '');
  const status = await repoObj.status();
  const remotes = await repoObj.getRemotes(true);
  const remoteNames = remotes.map((remote) => (path.basename(remote.refs.fetch, '.git') !== 'repository' ? path.basename(remote.refs.fetch, '.git') : null));
  const aliases = uniq(compact([path.basename(repoPath), packageObj.name, ...remoteNames]));
  return {
    type: 'local',
    name: repoName,
    path: repoPath,
    package: packageObj,
    readme: readmeStr,
    remotes,
    status,
    aliases
  };
}

async function readRepos(repoObjs) {
  return asyncMap(repoObjs, (repoObj) => {
    return formatRepo(repoObj);
  });
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export const load = async function load(srcDir) {
  const repoObjs = await readLocal(srcDir);
  return readRepos(repoObjs);
};

export const create = async function create(token, repo) {
  // test
};

export const remove = async function remove(token) {
  // test
};