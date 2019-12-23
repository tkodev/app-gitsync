// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { intersection as _intersection, isEqual as _isEqual } from 'lodash';

// local dependencies
import Local from './local';
import Github from './github';
import * as cli from './cli';
import { filter, reduce, mapAsync, groupByUniqueKey } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

function getLocalName(githubRepo, localRepos) {
  return localRepos.reduce((accum, localRepo) => {
    return _intersection(githubRepo.aliases, localRepo.aliases).length ? localRepo.name : accum;
  }, githubRepo.name);
}

function mergeRepos(localRepos, githubRepos) {
  return [...localRepos, ...githubRepos].reduce((repos, repo) => {
    /* eslint-disable no-param-reassign */
    const name = repo.type === 'github' ? getLocalName(repo, localRepos) : repo.name;
    repos[name] = repos[name] || {};
    repos[name][repo.type] = repo;
    return repos;
  }, {});
}

function getRepoStatus(repo, user) {
  if (repo.local) {
    if (repo.local.branch !== 'master') {
      return 'notLocalMaster';
    }
    if (repo.local.status.behind + repo.local.status.ahead + repo.local.status.files.length) {
      return 'notSynced';
    }
  }
  if (repo.github) {
    if (repo.github.branch !== 'master') {
      return 'notGithubMaster';
    }
  }
  return 0;
}

function getRepoSyncStatus(repo) {
  if (repo.local && !repo.github) {
    return 'noGithub';
  }
  if (repo.github && !repo.local) {
    return 'noLocal';
  }
  return 0;
}

function getNewRemotes(remotes, user, aliases, newName) {
  const types = [
    { name: 'other', regex: new RegExp('.*') },
    { name: 'pantheon', regex: new RegExp('(pantheon|drush.in|codeserver)', 'gi') },
    { name: 'bitbucket', regex: new RegExp('(bitbucket|atlassian)', 'gi') },
    { name: 'brandfire', regex: new RegExp('(brandfire|bfmg)', 'gi') },
    { name: 'github', regex: new RegExp('github.com', 'g') }
  ];
  const mainRemotes = {
    origin: `git@github.com:${user}/${newName}.git`
  };
  const auxRemotesFilter = filter(remotes, (remote) => {
    return !remote.match(new RegExp(`github.com.*[\:\\\/]${user}[\\\/](${aliases.join('|')})`, 'gi'));
  });
  const auxRemotes = groupByUniqueKey(auxRemotesFilter, (remote) => {
    return types.reduce((nameAccum, type) => (remote.match(type.regex) ? type.name : nameAccum));
  });
  return {
    ...mainRemotes,
    ...auxRemotes
  };
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export default class Tasks {
  constructor(settings) {
    this.settings = settings;
    this.github = new Github(settings);
    this.local = new Local(settings);
  }
  async load() {
    cli.log('[load]', 'loading local repos');
    const localRepos = await this.local.readAll((repo) => {
      cli.log('[load]', 'load - local repo:', repo.name);
    });
    cli.log('[load]', 'loading github repos');
    const githubRepos = await this.github.readAll((repo) => {
      cli.log('[load]', 'load - github repo:', repo.name);
    });
    const rslt = mergeRepos(localRepos, githubRepos);
    cli.log('[load]', 'task complete.');
    return rslt;
  }
  async checkStatus(repos) {
    cli.log('[checkStatus]', 'checking local repo status');
    const rslt = filter(repos, (repo) => {
      const status = getRepoStatus(repo, this.settings.user);
      if (status === 'notOwned') {
        cli.log('[checkStatus]', `excluded from sync - github remote not owned by user: ${repo.local.name}`);
      }
      if (status === 'notLocalMaster') {
        cli.log('[checkStatus]', `excluded from sync - local repo not on master branch: ${repo.local.name}`);
      }
      if (status === 'notSynced') {
        cli.log('[checkStatus]', `excluded from sync - local untracked or upstream changes: ${repo.local.name}`);
      }
      if (status === 'notGithubMaster') {
        cli.log('[checkStatus]', `excluded from sync - github repo not on master branch: ${repo.github.name}`);
      }
      if (status) {
        return false;
      }
      return true;
    });
    cli.log('[checkStatus]', 'task complete.');
    return rslt;
  }
  async syncRepos(repos) {
    cli.log('[syncRepos]', 'download / upload missing repos');
    const syncedRepos = await mapAsync(repos, async (repo) => {
      const repoCopy = { ...repo };
      const status = getRepoSyncStatus(repoCopy);
      if (status === 'noGithub') {
        const decision = await cli.ask('[syncRepos]', `missing - local repo not in github: ${repoCopy.local.name}`, [
          { name: 'upload to github', value: 'upload' },
          { name: 'remove local repo', value: 'remove' }
        ]);
        if (decision === 'upload') {
          cli.log('[syncRepos]', 'create - new github repo', repoCopy.local.name);
          repoCopy.github = await this.github.create(repoCopy.local);
          cli.log('[syncRepos]', 'update - local remotes', repoCopy.local.name);
          repoCopy.local = await this.local.updateRemotes(repoCopy.local, getNewRemotes(repoCopy.local.remotes, this.settings.user, repoCopy.local.aliases, repoCopy.local.name));
        }
        if (decision === 'remove') {
          cli.log('[syncRepos]', 'delete - local repo:', repoCopy.local.name);
          await this.local.remove(repoCopy.local);
          delete repoCopy.local;
        }
        if (decision === 'skip') {
          cli.log('[syncRepos]', 'skip - local repo:', repoCopy.local.name);
          delete repoCopy.local;
        }
      }
      if (status === 'noLocal') {
        const decision = await cli.ask('[syncRepos]', `missing - github repo not in local: ${repo.local.name}`, [
          { name: 'clone to local', value: 'clone' },
          { name: 'remove local repo', value: 'remove' }
        ]);
        if (decision === 'clone') {
          cli.log('[syncRepos]', 'clone - new local repo:', repoCopy.github.name);
          repoCopy.local = await this.local.create(repoCopy.github, `git@github.com:${this.settings.user}/${repoCopy.github.name}.git`);
        }
        if (decision === 'remove') {
          cli.log('[syncRepos]', 'delete - github repo:', repoCopy.local.name);
          await this.github.remove(repoCopy.github);
          delete repoCopy.github;
        }
        if (decision === 'skip') {
          cli.log('[syncRepos]', 'skip - github repo:', repoCopy.local.name);
          delete repoCopy.github;
        }
      }
      return repoCopy;
    });
    const rslt = filter(syncedRepos, (repo) => repo.local && repo.github);
    cli.log('[syncRepos]', 'task complete.');
    return rslt;
  }
  async updateNames(repos) {
    cli.log('[updateNames]', 'detecting repo names');
    const rslt = await mapAsync(repos, async (repo) => {
      const repoCopy = { ...repo };
      if (repoCopy.local.name !== repoCopy.github.name) {
        const newName = await cli.ask('[updateNames]', `conflict - local name different from github: ${repoCopy.local.name}`, [
          {
            name: `use local name: ${repoCopy.local.name}`,
            value: repoCopy.local.name
          },
          {
            name: `use github name: ${repoCopy.github.name}`,
            value: repoCopy.github.name
          }
        ]);
        if (newName !== 'skip' && repoCopy.local.name !== newName) {
          cli.log('[updateNames]', 'update - local name:', repoCopy.local.name);
          repoCopy.local = await this.local.updateName(repoCopy.local, newName);
        }
        if (newName !== 'skip' && repoCopy.github.name !== newName) {
          cli.log('[updateNames]', 'update - github name:', repoCopy.github.name);
          repoCopy.github = await this.github.updateName(repoCopy.github, newName);
          cli.log('[syncRepos]', 'update - local remotes:', repoCopy.local.name);
          repoCopy.local = await this.local.updateRemotes(repoCopy.local, getNewRemotes(repoCopy.local.remotes, this.settings.user, repoCopy.github.aliases, newName));
        }
      }
      return repoCopy;
    });
    cli.log('[updateNames]', 'task complete.');
    return rslt;
  }
  async updateMeta(repos) {
    cli.log('[updateMeta]', 'update package.json and github meta');
    const rslt = await mapAsync(repos, async (repo) => {
      const repoCopy = { ...repo };
      const localChanges = {};
      const githubChanges = {};
      if (repo.local.desc !== repo.github.desc) {
        const newDesc = await cli.ask('[updateMeta]', `diff - local desc different from github: ${repoCopy.local.name}`, [
          { name: `use local desc: ${repo.local.desc}`, value: repo.local.desc },
          { name: `use github desc: ${repo.github.desc}`, value: repo.github.desc }
        ]);
        if (newDesc !== 'skip' && repoCopy.local.desc !== newDesc) {
          localChanges.desc = newDesc;
        }
        if (newDesc !== 'skip' && repoCopy.github.desc !== newDesc) {
          githubChanges.desc = newDesc;
        }
      }
      if (!_isEqual(repo.local.topics, repo.github.topics)) {
        const newTopics = await cli.ask('[updateMeta]', `diff - local topics different from github: ${repoCopy.local.name}`, [
          { name: `use local topics: ${repo.local.topics.join(', ')}`, value: repo.local.topics },
          { name: `use github topics: ${repo.github.topics.join(', ')}`, value: repo.github.topics }
        ]);
        if (newTopics !== 'skip' && !_isEqual(repo.local.topics, newTopics)) {
          localChanges.topics = newTopics;
        }
        if (newTopics !== 'skip' && !_isEqual(repo.github.topics, newTopics)) {
          githubChanges.topics = newTopics;
        }
      }
      if (repo.local.name !== repo.local.package.name) {
        const decision = await cli.ask('[updateMeta]', `diff - local package name different from path: ${repoCopy.local.name}`, [{ name: `update package name`, value: 'update' }]);
        if (decision === 'update') {
          localChanges.name = repoCopy.local.name;
        }
      }
      if (Object.keys(localChanges).length) {
        cli.log('[updateMeta]', 'update - local package.json:', repoCopy.local.name);
        repoCopy.local = this.local.updateMeta(repoCopy.local, localChanges);
      }
      if (Object.keys(githubChanges).length) {
        cli.log('[updateMeta]', 'update - local package.json:', repoCopy.github.name);
        repoCopy.github = this.github.updateMeta(repoCopy.github, githubChanges);
      }
      return repoCopy;
    });
    cli.log('[updateMeta]', 'task complete.');
    return rslt;
  }
}
