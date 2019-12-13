// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { graphql as octoQL } from '@octokit/graphql';
import OctoRest from '@octokit/rest';
import { uniq as _uniq, compact as _compact } from 'lodash';

// local dependencies
import { map } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

async function createRepoGithub(repo, token) {
  return octoQL(
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
      headers: {
        authorization: `token ${token}`
      },
      input: {
        name: repo.name,
        visibility: 'PRIVATE'
      }
    }
  ).then((resp) => {
    // eslint-disable-next-line no-param-reassign
    resp.createRepository.repository.package = repo.package.name ? repo.package : {};
    return resp.createRepository.repository;
  });
}

async function loadReposGithub(token) {
  return octoQL(
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
    {
      headers: {
        authorization: `token ${token}`
      }
    }
  ).then((resp) => resp.user.repositories.nodes);
}

async function updateNameGithub(repo, token) {
  return octoQL(
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
      headers: {
        authorization: `token ${token}`
      },
      input: {
        repositoryId: repo.id,
        name: repo.name
      }
    }
  ).then((resp) => resp.updateRepository.repository);
}

async function removeRepoGithub(repo, token, user) {
  const octoRest = new OctoRest({
    auth: `token ${token}`
  });
  await octoRest.repos.delete({
    owner: user,
    repo: repo.name
  });
}

function formatRepo(repoObj, cb) {
  const repoPath = repoObj.url;
  if (cb) cb(repoPath);
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

// Create
export async function create(repo, token, user) {
  const repoObj = await createRepoGithub(repo, token, user);
  return formatRepo(repoObj);
}

// Read
export async function load(cb, token) {
  const repoObjs = await loadReposGithub(token);
  return map(repoObjs, (repoObj) => formatRepo(repoObj, cb), true);
}

// Update
export async function updateName(repo, token) {
  const repoObj = await updateNameGithub(repo, token);
  return formatRepo(repoObj);
}

// Delete
export async function remove(repo, token, user) {
  await removeRepoGithub(repo, token, user);
}
