// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { graphql as QL } from '@octokit/graphql';
import Rest from '@octokit/rest';
import { uniq, compact } from 'lodash';

// local dependencies
import { map } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

async function readGithub(token) {
  return QL(
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
  ).then((repos) => repos.user.repositories.nodes);
}

function formatRepo(repoObj) {
  const repoPath = repoObj.url;
  const repoId = repoObj.id;
  const repoName = repoObj.name;
  const packageObj = repoObj.package && repoObj.package.text ? JSON.parse(repoObj.package.text) : {};
  const aliases = uniq(compact([repoObj.name, packageObj.name, repoId]));
  return {
    type: 'github',
    id: repoId,
    name: repoName,
    path: repoPath,
    package: packageObj,
    aliases
  };
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

// Create
export async function create(token, repo) {
  // test
}

// Read
export async function load(token) {
  const repoObjs = await readGithub(token);
  return map(repoObjs, (repoObj) => formatRepo(repoObj), true);
}

// Update
export async function updateName(repo) {
  console.log(repo);
}

// Delete
export async function remove(token) {
  // test
}
