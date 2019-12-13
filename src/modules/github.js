// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { graphql as octoQL } from '@octokit/graphql';
import OctoRest from '@octokit/rest';
import { uniq as _uniq, compact as _compact } from 'lodash';

// local dependencies
import { mapAsync } from './common';

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
    .then((resp) => {
      // eslint-disable-next-line no-param-reassign
      resp.createRepository.repository.package = repo.package.name ? repo.package : {};
      return resp.createRepository.repository;
    });
}

async function readRepoGithub(octo, repo) {
  //
}

async function readAllReposGithub(octo) {
  return octo
    .ql(
      `query readGithub {
      user: viewer {
        repositories(affiliations: [OWNER], first: 100) {
          nodes {
            url
            id
            name
            package: object(expression: "master:package.json") { ... on Blob { text } }
          }
        }
      }
    }`,
      {}
    )
    .then((resp) => resp.user.repositories.nodes);
}

async function updateNameGithub(octo, repo) {
  return octo
    .ql(
      `mutation updateNameGithub ($input: UpdateRepositoryInput!) {
      updateRepository(input: $input) {
        repository {
          url
          id
          name
          package: object(expression: "master:package.json") { ... on Blob { text } }
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
  const repoName = repoObj.name;
  const repoId = repoObj.id;
  const repoBranch = 'master';
  const repoPackage = repoObj.package && repoObj.package.text ? JSON.parse(repoObj.package.text) : {};
  const repoAliases = _uniq(_compact([repoObj.name, repoId]));
  return {
    type: 'github',
    name: repoName,
    path: repoPath,
    id: repoId,
    branch: repoBranch,
    package: repoPackage,
    aliases: repoAliases
  };
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export default class Github {
  constructor(settings) {
    this.settings = settings;
    this.octo = {
      rest: new OctoRest({
        auth: `token ${settings.token}`
      }),
      ql: octoQL.defaults({
        headers: {
          authorization: `token ${settings.token}`
        }
      })
    };
  }
  async create(repo) {
    const repoObj = await createRepoGithub(this.octo, repo);
    return formatRepo(repoObj);
  }
  async read(repo) {
    const repoObj = await readRepoGithub(this.octo, repo);
    return formatRepo(repoObj);
  }
  async readAll(cb) {
    const repoObjs = await readAllReposGithub(this.octo);
    return mapAsync(
      repoObjs,
      async (repoObj) => {
        const repoRslt = await formatRepo(repoObj);
        if (cb) cb(repoRslt);
        return repoRslt;
      },
      true
    );
  }
  async updateName(repo) {
    const repoObj = await updateNameGithub(this.octo, repo);
    return formatRepo(repoObj);
  }
  async remove(repo) {
    const repoObj = await removeRepoGithub(this.octo, repo, this.settings.user);
    return null;
  }
}
