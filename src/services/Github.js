// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { graphql as octoQL } from '@octokit/graphql';
import OctoRest from '@octokit/rest';
import { uniq as _uniq, compact as _compact } from 'lodash';

// local dependencies
import { mapAsync } from '../modules/common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

async function createRepoGithub(octo, repo) {
  return octo
    .ql(
      `mutation createRepoGithub ($input: CreateRepositoryInput!) {
        createRepository(input: $input) {
          repository {
            url
            id
            name
            description
            repositoryTopics (first: 20) {
              nodes {
                topic {
                  name
                }
              }
            }
          }
        }
      }`,
      {
        input: {
          name: repo.name,
          visibility: 'PRIVATE'
        }
      }
    )
    .then((resp) => resp.createRepository.repository);
}

async function readRepoGithub(octo, repoPath, user) {
  const urlRegex = new RegExp(/^(.*github.com.)?((.+)\/)?(.+)$/);
  const urlMatch = repoPath.match(urlRegex);
  const repoUser = urlMatch && urlMatch[3] ? urlMatch[3] : user;
  const repoName = urlMatch && urlMatch[4] ? urlMatch[4].replace(/.git$/, '') : '';
  return octo
    .ql(
      `query readRepoGithub($repoUser:String!, $repoName:String!) {
        repository(owner:$repoUser, name:$repoName) {
          url
          id
          name
          description
          repositoryTopics (first: 20) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }`,
      {
        repoUser,
        repoName
      }
    )
    .then((resp) => resp.user.repositories.nodes);
}

async function readAllReposGithub(octo) {
  return octo
    .ql(
      `query readAllReposGithub {
      user: viewer {
        repositories(affiliations: [OWNER], first: 100) {
          nodes {
            url
            id
            name
            description
            repositoryTopics (first: 20) {
              nodes {
                topic {
                  name
                }
              }
            }
          }
        }
      }
    }`
    )
    .then((resp) => resp.user.repositories.nodes);
}

async function updateNameGithub(octo, repo, newName) {
  return octo
    .ql(
      `mutation updateNameGithub ($input: UpdateRepositoryInput!) {
      updateRepository(input: $input) {
        repository {
          url
          id
          name
          description
          repositoryTopics (first: 20) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    }`,
      {
        input: {
          repositoryId: repo.id,
          name: newName
        }
      }
    )
    .then((resp) => resp.updateRepository.repository);
}

async function updateMetaGithub(octo, repo) {
  return octo
    .ql(
      `mutation updateNameGithub ($input: UpdateRepositoryInput!) {
      updateRepository(input: $input) {
        repository {
          url
          id
          name
          description
          repositoryTopics (first: 20) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    }`,
      {
        input: {
          repositoryId: repo.id,
          name: repo.name
        }
      }
    )
    .then((resp) => resp.updateRepository.repository);
}

async function removeRepoGithub(octo, repo, user) {
  await octo.rest.repos.delete({
    owner: user,
    repo: repo.name
  });
}

async function formatRepo(repoObj) {
  const repoPath = repoObj.url;
  const repoBranch = 'master';
  const repoId = repoObj.id;
  const repoName = repoObj.name;
  const repoDesc = repoObj.description || '';
  const repoTopics = repoObj.repositoryTopics.nodes.map((node) => node.topic.name);
  const repoAliases = _uniq(_compact([repoObj.name, repoId]));
  return {
    type: 'github',
    path: repoPath,
    branch: repoBranch,
    id: repoId,
    name: repoName,
    desc: repoDesc,
    topics: repoTopics,
    aliases: repoAliases
  };
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export default class Github {
  constructor(cfg) {
    this.cfg = cfg;
    this.octo = {
      rest: new OctoRest({
        auth: `token ${cfg.token}`
      }),
      ql: octoQL.defaults({
        headers: {
          authorization: `token ${cfg.token}`
        }
      })
    };
  }
  async create(repo) {
    const repoObj = await createRepoGithub(this.octo, repo);
    return formatRepo(repoObj);
  }
  async read(repoPath) {
    const repoObj = await readRepoGithub(this.octo, repoPath, this.cfg.user);
    return formatRepo(repoObj);
  }
  async readAll(cb) {
    const repoObjs = await readAllReposGithub(this.octo);
    return mapAsync(repoObjs, async (repoObj) => {
      const repoRslt = await formatRepo(repoObj);
      if (cb) cb(repoRslt);
      return repoRslt;
    });
  }
  async updateName(repo, newName) {
    const repoObj = await updateNameGithub(this.octo, repo, newName);
    return formatRepo(repoObj);
  }
  async updateMeta(repo) {
    const repoObj = await updateMetaGithub(this.octo, repo);
    return formatRepo(repoObj);
  }
  async remove(repo) {
    const repoObj = await removeRepoGithub(this.octo, repo, this.cfg.user);
    return null;
  }
}
