// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { join as pathJoin, dirname as pathDirname, basename as pathBasename } from 'path';
import { rename as fsRename, remove as fsRemove, writeJson as fsWriteJson } from 'fs-extra';
import glob from 'fast-glob';
import git from 'simple-git/promise';
import { keyBy as _keyBy, uniq as _uniq, compact as _compact } from 'lodash';

// local dependencies
import { forEach, map, mapAsync, posixPath } from './common';
import packageSchema from '../schema/package';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

async function createRepoLocal(srcDir, repo, cloneUrl) {
  const repoPath = pathJoin(srcDir, repo.name);
  await git(srcDir)
    .silent(true)
    .clone(cloneUrl, repoPath);
  return git(repoPath).silent(true);
}

async function readRepoLocal(repoPath) {
  return git(repoPath).silent(true);
}

async function readAllReposLocal(srcDir) {
  return glob('**/.git', {
    cwd: posixPath(srcDir),
    ignore: ['**/{.git,node_modules}/**/*'],
    onlyDirectories: true,
    absolute: true
  }).then((repoPaths) => {
    return mapAsync(repoPaths, async (repoPath) => readRepoLocal(pathDirname(repoPath, '.git')));
  });
}

async function updateNameLocal(repo, newName) {
  const newPath = pathJoin(pathDirname(repo.path), newName);
  await fsRename(repo.path, newPath);
  return git(newPath).silent(true);
}

async function updateRemotesLocal(repo, newRemotes) {
  const repoObj = git(repo.path).silent(true);
  const oldRemotes = await repoObj.getRemotes();
  await forEach(oldRemotes, async (remote) => {
    await repoObj.removeRemote(remote.name);
  });
  await forEach(newRemotes, async (remote, remoteName) => {
    await repoObj.addRemote(remoteName, remote);
  });
  await repoObj.fetch();
  await repoObj.branch(['-u', 'origin/master', 'master']).catch(() => {});
  await repoObj.push('origin', 'master', ['-u']);
  return repoObj;
}

async function updateMetaLocal(repo, newMeta) {
  const repoObj = git(repo.path).silent(true);
  const newMetaObj = {
    // name: newMeta.name || repo.package.name,
    // description: newMeta.desc || repo.package.description,
    // keywords: newMeta.topics || repo.package.keywords,
    // homepage: newMeta.homepage || repo.package.homepage ||
    // repository: newMeta.name ? { type: 'git', url: repo.remotes.origin }
    // bugs: { url: '' }
  };
  const newPackage = {
    ...packageSchema,
    ...repo.package,
    ...newMetaObj
  };
  await fsWriteJson(pathJoin(repo.path, 'package.json'), newPackage, {
    spaces: 2
  });
  await repoObj.add('./package.json');
  await repoObj.commit('app-gitsync: Update package.json meta fields');
  await repoObj.push('origin', 'master');
  return repoObj;
}

async function removeRepoLocal(repo) {
  await fsRemove(repo.path);
}

async function formatRepo(repoObj) {
  await repoObj.fetch();
  const repoPath = await repoObj.revparse(['--absolute-git-dir']).then((data) => pathDirname(data));
  const repoBranch = await repoObj.revparse(['--abbrev-ref', 'HEAD']).catch((err) => '');
  const repoId = '';
  const repoName = pathBasename(repoPath);
  const repoPackage = await repoObj
    .show([`master:package.json`])
    .then((data) => JSON.parse(data))
    .catch(() => ({}));
  const repoReadme = await repoObj
    .show([`master:README.md`])
    .then((data) => data.toString())
    .catch(() => '');
  const repoDesc = repoPackage.description || '';
  const repoTopics = repoPackage.topics && Array.isArray(repoPackage.topics) ? repoPackage.topics : [];
  const repoStatus = await repoObj.status();
  const repoRemotesArr = await repoObj.getRemotes(true);
  const repoRemoteNames = repoRemotesArr.map((remote) => (pathBasename(remote.refs.fetch, '.git') !== 'repository' ? pathBasename(remote.refs.fetch, '.git') : null));
  const repoRemotes = map(_keyBy(repoRemotesArr, (remote) => remote.name), (remote) => remote.refs.fetch);
  const repoAliases = _uniq(_compact([pathBasename(repoPath), repoId, ...repoRemoteNames]));
  if (repoName === '.') console.log(repoRemotes);
  return {
    type: 'local',
    path: repoPath,
    branch: repoBranch,
    id: repoId,
    name: repoName,
    desc: repoDesc,
    topics: repoTopics,
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

export default class Local {
  constructor(settings) {
    this.settings = settings;
  }
  async create(repo, cloneUrl) {
    const repoObj = await createRepoLocal(this.settings.srcDir, repo, cloneUrl);
    return formatRepo(repoObj);
  }
  async read(repoPath) {
    const repoObj = await readRepoLocal(repoPath);
    return formatRepo(repoObj);
  }
  async readAll(cb) {
    const repoObjs = await readAllReposLocal(this.settings.srcDir);
    return mapAsync(repoObjs, async (repoObj) => {
      const repoRslt = await formatRepo(repoObj);
      if (cb) cb(repoRslt);
      return repoRslt;
    });
  }
  async updateName(repo, newName) {
    const repoObj = await updateNameLocal(repo, newName);
    return formatRepo(repoObj);
  }
  async updateRemotes(repo, newRemotes) {
    const repoObj = await updateRemotesLocal(repo, newRemotes);
    return formatRepo(repoObj);
  }
  async updateMeta(repo, newMeta) {
    const repoObj = await updateMetaLocal(repo, newMeta);
    return formatRepo(repoObj);
  }
  async remove(repo) {
    const repoObj = await removeRepoLocal(repo);
    return null;
  }
}
