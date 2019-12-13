// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { join as pathJoin, dirname as pathDirname, basename as pathBasename } from 'path';
import { rename as fsRename, remove as fsRemove } from 'fs-extra';
import glob from 'fast-glob';
import git from 'simple-git/promise';
import { keyBy as _keyBy, uniq as _uniq, compact as _compact } from 'lodash';

// local dependencies
import { forEach, map, mapAsync, posixPath } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

async function createRepoLocal(repo, path, srcDir) {
  const newPath = pathJoin(srcDir, repo.name);
  await git(srcDir)
    .silent(true)
    .clone(path, newPath);
  return git(newPath).silent(true);
}

async function loadReposLocal(srcDir) {
  return glob('**/.git', {
    cwd: posixPath(srcDir),
    ignore: ['**/{.git,node_modules}/**/*'],
    onlyDirectories: true,
    absolute: true
  }).then((repoPaths) => {
    return mapAsync(repoPaths, (repoPath) => git(pathDirname(repoPath, '.git')).silent(true));
  });
}

async function updatePushLocal(repo) {
  const repoObj = git(repo.path).silent(true);
  await repoObj.push('origin', 'master', ['-u']);
  return repoObj;
}

async function updateNameLocal(repo) {
  const newPath = pathJoin(pathDirname(repo.path), repo.name);
  await fsRename(repo.path, newPath);
  return git(newPath).silent(true);
}

async function updateRemotesLocal(repo) {
  const repoObj = git(repo.path).silent(true);
  const remotes = await repoObj.getRemotes();
  await forEach(remotes, async (remote) => {
    await repoObj.removeRemote(remote.name);
  });
  await forEach(repo.remotes, async (remote, remoteName) => {
    await repoObj.addRemote(remoteName, remote);
  });
  await repoObj.fetch();
  await repoObj.push('origin', 'master', ['-u']);
  return repoObj;
}

async function removeRepoLocal(repo) {
  await fsRemove(repo.path);
}

async function formatRepo(repoObj, cb) {
  const repoPath = await repoObj.revparse(['--absolute-git-dir']).then((data) => pathDirname(data));
  if (cb) cb(repoPath);
  const repoName = pathBasename(repoPath);
  const repoId = '';
  const repoBranch = await repoObj.revparse(['--abbrev-ref', 'HEAD']);
  const repoPackage = await repoObj
    .show([`master:package.json`])
    .then((data) => JSON.parse(data))
    .catch(() => ({}));
  const repoReadme = await repoObj
    .show([`master:README.md`])
    .then((data) => data.toString())
    .catch(() => '');
  const repoStatus = await repoObj.status();
  const repoRemotesArr = await repoObj.getRemotes(true);
  const repoRemoteNames = repoRemotesArr.map((remote) => (pathBasename(remote.refs.fetch, '.git') !== 'repository' ? pathBasename(remote.refs.fetch, '.git') : null));
  const repoRemotes = map(_keyBy(repoRemotesArr, (remote) => remote.name), (remote) => remote.refs.fetch);
  const repoAliases = _uniq(_compact([pathBasename(repoPath), repoId, ...repoRemoteNames]));
  return {
    type: 'local',
    path: repoPath,
    name: repoName,
    id: repoId,
    branch: repoBranch,
    package: repoPackage,
    readme: repoReadme,
    remotes: repoRemotes,
    status: repoStatus,
    aliases: repoAliases
  };
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

// Create
export async function create(repo, path, srcDir) {
  const repoObj = await createRepoLocal(repo, path, srcDir);
  return formatRepo(repoObj);
}

// Read
export async function load(cb, srcDir) {
  const repoObjs = await loadReposLocal(srcDir);
  return mapAsync(repoObjs, (repoObj) => formatRepo(repoObj, cb));
}

// Update
export async function updatePush(repo) {
  const repoObj = await updatePushLocal(repo);
  return formatRepo(repoObj);
}
export async function updateName(repo) {
  const repoObj = await updateNameLocal(repo);
  return formatRepo(repoObj);
}
export async function updateRemotes(repo) {
  const repoObj = await updateRemotesLocal(repo);
  return formatRepo(repoObj);
}

// Delete
export async function remove(repo) {
  await removeRepoLocal(repo);
}
