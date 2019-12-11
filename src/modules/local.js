// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { join, dirname, basename } from 'path';
import fs from 'fs-extra';
import glob from 'fast-glob';
import git from 'simple-git/promise';
import { keyBy, uniq, compact } from 'lodash';

// local dependencies
import { forEach, map, mapAsync, posixPath } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

async function readLocal(srcDir) {
  return glob('**/.git', {
    cwd: posixPath(srcDir),
    ignore: ['**/{.git,node_modules}/**/*'],
    onlyDirectories: true,
    absolute: true
  }).then((repoPaths) => {
    return mapAsync(repoPaths, (repoPath) => git(dirname(repoPath, '.git')).silent(true));
  });
}

async function updateNameLocal(repo) {
  const newPath = join(dirname(repo.path), '/', repo.name);
  await fs.rename(repo.path, newPath);
  return git(newPath).silent(true);
}

async function updateRemotesLocal(repo) {
  const repoObj = git(repo.path).silent(true);
  const remotes = await repoObj.getRemotes();
  await forEach(remotes, async (remote) => {
    await repoObj.removeRemote(remote.name);
  });
  await forEach(repo.remotes, async (remote, remoteName) => {
    await repoObj.addRemote(remoteName, remote.fetch);
  });
  return repoObj;
}

async function formatRepo(repoObj, cb) {
  const repoPath = await repoObj.revparse(['--absolute-git-dir']).then((data) => dirname(data));
  if (cb) cb(repoPath);
  const repoId = '';
  const repoName = basename(repoPath);
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
  const remotesObj = map(keyBy(remotes, (remote) => remote.name), (remote) => remote.refs);
  const remoteNames = remotes.map((remote) => (basename(remote.refs.fetch, '.git') !== 'repository' ? basename(remote.refs.fetch, '.git') : null));
  const aliases = uniq(compact([basename(repoPath), repoId, ...remoteNames]));
  return {
    type: 'local',
    id: repoId,
    name: repoName,
    path: repoPath,
    package: packageObj,
    readme: readmeStr,
    remotes: remotesObj,
    status,
    aliases
  };
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

// Create
export async function create(repo) {
  // test
}

// Read
export async function load(cb, srcDir) {
  const repoObjs = await readLocal(srcDir);
  return mapAsync(repoObjs, (repoObj) => formatRepo(repoObj, cb));
}

// Update
export async function updateName(repo) {
  const repoObj = await updateNameLocal(repo);
  return formatRepo(repoObj);
}
export async function updateRemotes(repo) {
  const repoObj = await updateRemotesLocal(repo);
  return formatRepo(repoObj);
}

// Delete
export async function remove() {
  // test
}
