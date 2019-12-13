// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { intersection as _intersection } from 'lodash';

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
    // this wont match if we don't have a github remote, which is an acceptable use case because we want to make one
    // if (Object.keys(repo.local.remotes).length) {
    //   const isOwned = reduce(
    //     repo.local.remotes,
    //     (accum, remote) => {
    //       return remote.match(new RegExp(`github.com.*[\:\\\/]${user}[\\\/]`, 'gi')) ? true : accum;
    //     },
    //     false
    //   );
    //   if (!isOwned) {
    //     return 'notOwned';
    //   }
    // }
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

async function getNewName(repo) {
  const newNames = [
    {
      name: `use local name: ${repo.local.name}`,
      value: repo.local.name
    },
    {
      name: `use github name: ${repo.github.name}`,
      value: repo.github.name
    }
  ];
  const rslt = cli.ask('[updateNames]', `repo name conflict in ${repo.local.path}. choose a new repo name:`, newNames);
  return rslt !== 'skip' ? rslt : null;
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
    cli.log('[load]', 'loading github repos');
    const localRepos = await this.local.readAll((repo) => {
      cli.log('[load]', 'loaded local repo', repo.name);
    });
    const githubRepos = await this.github.readAll((repo) => {
      cli.log('[load]', 'loaded github repo', repo.name);
    });
    cli.log('[load]', 'loading local repos');
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
        const decision = await cli.ask('[syncRepos]', `local repo not in github ${repoCopy.local.path}. choose an action:`, [
          { name: 'upload to github', value: 'upload' },
          { name: 'remove local repo', value: 'remove' }
        ]);
        if (decision === 'upload') {
          cli.log('[syncRepos]', 'creating new github repo', repoCopy.local.name);
          repoCopy.github = await this.github.create(repoCopy.local);
          cli.log('[syncRepos]', 'updating local remotes', repoCopy.local.name);
          repoCopy.local = { ...repoCopy.local, remotes: getNewRemotes(repoCopy.local.remotes, this.settings.user, repoCopy.local.aliases, repoCopy.local.name) };
          repoCopy.local = await this.local.updateRemotes(repoCopy.local);
          cli.log('[syncRepos]', 'pushing local repo', repoCopy.local.name);
          repoCopy.local = await this.local.updatePush(repoCopy.local);
        }
        if (decision === 'remove') {
          cli.log('[syncRepos]', 'deleting local repo', repoCopy.local.name);
          await this.local.remove(repoCopy.local);
          delete repoCopy.local;
        }
        if (decision === 'skip') {
          cli.log('[syncRepos]', 'skipping local repo', repoCopy.local.name);
          delete repoCopy.local;
        }
      }
      if (status === 'noLocal') {
        const decision = await cli.ask('[syncRepos]', `github repo not in local ${repo.local.path}. choose an action:`, [
          { name: 'clone to local', value: 'clone' },
          { name: 'remove local repo', value: 'remove' }
        ]);
        if (decision === 'clone') {
          cli.log('[syncRepos]', 'cloning to new local repo', repoCopy.github.name);
          repoCopy.local = await this.local.create(repoCopy.github, `git@github.com:${this.settings.user}/${repoCopy.github.name}.git`);
        }
        if (decision === 'remove') {
          cli.log('[syncRepos]', 'deleting github repo', repoCopy.local.name);
          await this.github.remove(repoCopy.github);
          delete repoCopy.github;
        }
        if (decision === 'skip') {
          cli.log('[syncRepos]', 'skipping github repo', repoCopy.local.name);
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
        const newName = await getNewName(repoCopy);
        if (repoCopy.local.name !== newName) {
          cli.log('[updateNames]', 'updating local name', repoCopy.local.path);
          repoCopy.local = { ...repoCopy.local, name: newName };
          repoCopy.local = await this.local.updateName(repoCopy.local);
        }
        if (repoCopy.github.name !== newName) {
          cli.log('[updateNames]', 'updating github name', repoCopy.github.path);
          repoCopy.github = { ...repoCopy.github, name: newName };
          repoCopy.github = await this.github.updateName(repoCopy.github);
          cli.log('[syncRepos]', 'updating local remotes', repoCopy.local.name);
          repoCopy.local = { ...repoCopy.local, remotes: getNewRemotes(repoCopy.local.remotes, this.settings.user, repoCopy.github.aliases, newName) };
          repoCopy.local = await this.local.updateRemotes(repoCopy.local);
        }
      }
      return repoCopy;
    });
    cli.log('[updateNames]', 'task complete.');
    return rslt;
  }
  async updateMeta(repos) {
    cli.log('[updateMeta]', 'update package.json and github meta');
  }
}
