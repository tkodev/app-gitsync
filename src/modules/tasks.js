// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { intersection as _intersection, isEqual as _isEqual } from 'lodash';

// local dependencies
import Local from './local';
import Github from './github';
import * as cli from './cli';
import { filter, mapAsync, forEachAsync, groupByUniqueKey } from './common';

// ****************************************************************************************************
// Status Functions
// ****************************************************************************************************

function getRepoStatus(repo) {
  const rslt = [];
  if (repo.local) {
    if (repo.local.branch !== 'master') {
      rslt.push('notLocalMaster');
    }
    if (repo.local.status.behind + repo.local.status.ahead + repo.local.status.files.length) {
      rslt.push('notSynced');
    }
  }
  if (repo.github) {
    if (repo.github.branch !== 'master') {
      rslt.push('notGithubMaster');
    }
  }
  return rslt;
}

function getRepoSyncStatus(repo) {
  const rslt = [];
  if (repo.local && !repo.github) {
    rslt.push('noGithub');
  }
  if (repo.github && !repo.local) {
    rslt.push('noLocal');
  }
  return rslt;
}

function getRepoNameStatus(repo) {
  return repo.local.name !== repo.github.name ? 'nameMismatch' : 0;
}

function getRepoMetaStatus(repo) {
  const rslt = [];
  if (repo.local.name !== repo.github.name) {
    rslt.push('nameMismatch');
  }
  if (repo.local.desc !== repo.github.desc) {
    rslt.push('descMismatch');
  }
  if (!_isEqual(repo.local.topics, repo.github.topics)) {
    rslt.push('topicsMismatch');
  }
  return rslt;
}

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
      const status = getRepoStatus(repo);
      if (status.includes('notLocalMaster')) {
        cli.log('[checkStatus]', `excluded from sync - local repo not on master branch: ${repo.local.name}`);
      }
      if (status.includes('notSynced')) {
        cli.log('[checkStatus]', `excluded from sync - local untracked or upstream changes: ${repo.local.name}`);
      }
      if (status.includes('notGithubMaster')) {
        cli.log('[checkStatus]', `excluded from sync - github repo not on master branch: ${repo.github.name}`);
      }
      if (status.length) {
        return false;
      }
      return true;
    });
    cli.log('[checkStatus]', 'task complete.');
    return rslt;
  }
  async syncRepos(repos) {
    cli.log('[syncRepos]', 'download / upload missing repos');
    const rslt = await mapAsync(repos, async (repoOrig) => {
      const repo = { ...repoOrig };
      const status = getRepoSyncStatus(repo);
      const actions = [];
      if (status.includes('noGithub')) {
        const action = await cli.ask('[syncRepos]', `missing - local repo not in github: ${repo.local.name}`, [
          { name: 'upload to github', value: 'createGithub' },
          { name: 'remove local repo', value: 'removeLocal' },
          { name: '-' },
          { name: 'skip and exclude repo from sync', value: 'skipLocal' }
        ]);
        actions.push(action);
      }
      if (status.includes('noLocal')) {
        const action = await cli.ask('[syncRepos]', `missing - github repo not in local: ${repo.local.name}`, [
          { name: 'clone to local', value: 'createLocal' },
          { name: 'remove github repo', value: 'removeGithub' },
          { name: '-' },
          { name: 'skip and exclude repo from sync', value: 'skipGithub' }
        ]);
        actions.push(action);
      }
      await forEachAsync(actions, async (action) => {
        if (action === 'createGithub') {
          const newRemotes = getNewRemotes(repo.local.remotes, this.settings.user, repo.local.aliases, repo.local.name);
          cli.log('[syncRepos]', 'create - new github repo', repo.local.name);
          repo.github = await this.github.create(repo.local);
          cli.log('[syncRepos]', 'update - local remotes', repo.local.name);
          repo.local = await this.local.updateRemotes(repo.local, newRemotes);
        }
        if (action === 'removeLocal') {
          cli.log('[syncRepos]', 'delete - local repo:', repo.local.name);
          await this.local.remove(repo.local);
          delete repo.local;
        }
        if (action === 'skipLocal') {
          cli.log('[syncRepos]', 'skip - local repo:', repo.local.name);
          delete repo.local;
        }
        if (action === 'createLocal') {
          const cloneUrl = `git@github.com:${this.settings.user}/${repo.github.name}.git`;
          cli.log('[syncRepos]', 'clone - new local repo:', repo.github.name);
          repo.local = await this.local.create(repo.github, cloneUrl);
        }
        if (action === 'removeGithub') {
          cli.log('[syncRepos]', 'delete - github repo:', repo.local.name);
          await this.github.remove(repo.github);
          delete repo.github;
        }
        if (action === 'skipGithub') {
          cli.log('[syncRepos]', 'skip - github repo:', repo.local.name);
          delete repo.github;
        }
      });
      return repo;
    });
    const filterRslt = filter(rslt, (repo) => repo.local && repo.github);
    cli.log('[syncRepos]', 'task complete.');
    return filterRslt;
  }
  async updateNames(repos) {
    cli.log('[updateNames]', 'detecting repo names');
    const rslt = await mapAsync(repos, async (repoOrig) => {
      const repo = { ...repoOrig };
      const status = getRepoNameStatus(repo);
      const actions = [];
      if (status.includes('nameMismatch')) {
        const action = await cli.ask('[updateNames]', `conflict - local name different from github: ${repo.local.name}`, [
          { name: `use local name: ${repo.local.name}`, value: 'useLocalName' },
          { name: `use github name: ${repo.github.name}`, value: 'useGithubName' },
          { name: '-' },
          { name: 'skip and exclude repo from sync', value: 'skipName' }
        ]);
        actions.push(action);
      }
      await forEachAsync(actions, async (action) => {
        if (action === 'useLocalName') {
          cli.log('[updateNames]', 'update - use local name:', repo.local.name);
          repo.github = await this.github.updateName(repo.github, repo.local.name);
          cli.log('[syncRepos]', 'update - local remotes:', repo.local.name);
          repo.local = await this.local.updateRemotes(repo.local, getNewRemotes(repo.local.remotes, this.settings.user, repo.github.aliases, repo.local.name));
        }
        if (action === 'useGithubName') {
          cli.log('[updateNames]', 'update - use github name:', repo.github.name);
          repo.local = await this.local.updateName(repo.local, repo.github.name);
        }
      });
      return repo;
    });
    cli.log('[updateNames]', 'task complete.');
    return rslt;
  }
  async updateMeta(repos) {
    cli.log('[updateMeta]', 'update package.json and github meta');
    const rslt = await mapAsync(repos, async (repoOrig) => {
      const repo = { ...repoOrig };
      const status = getRepoMetaStatus(repo);
      const actions = [];
      if (status.includes('nameMismatch')) {
        const action = await cli.ask('[updateMeta]', `diff - local package name different from local: ${repo.local.name}`, [
          { name: `update package name`, value: 'updatePackageName' },
          { name: '-' },
          { name: 'skip for this repo', value: 'skip' }
        ]);
        actions.push(action);
      }
      if (status.includes('descMismatch')) {
        const action = await cli.ask('[updateMeta]', `diff - local desc different from github: ${repo.local.name}`, [
          { name: `use local desc: ${repo.local.desc}`, value: 'useLocalDesc' },
          { name: `use github desc: ${repo.github.desc}`, value: 'useGithubDesc' },
          { name: '-' },
          { name: 'skip for this repo', value: 'skip' }
        ]);
        actions.push(action);
      }
      if (status.includes('topicsMismatch')) {
        const action = await cli.ask('[updateMeta]', `diff - local topics different from github: ${repo.local.name}`, [
          { name: `use local topics: ${repo.local.topics.join(', ')}`, value: 'useLocalTopics' },
          { name: `use github topics: ${repo.github.topics.join(', ')}`, value: 'useGithubTopics' },
          { name: '-' },
          { name: 'skip for this repo', value: 'skip' }
        ]);
        actions.push(action);
      }
      await forEachAsync(actions, async (action) => {
        if (action === 'updatePackageName') {
          //
        }
        if (action === 'useLocalDesc') {
          //
        }
        if (action === 'useGithubDesc') {
          //
        }
        if (action === 'useLocalTopics') {
          //
        }
        if (action === 'useGithubTopics') {
          //
        }
      });
      return repo;
    });
    cli.log('[updateMeta]', 'task complete.');
    return rslt;
  }
}
