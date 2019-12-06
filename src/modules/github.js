// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { graphql as QL } from '@octokit/graphql';
import Rest from '@octokit/rest';
import fs from 'fs';
import { uniq, compact, keyBy } from 'lodash';

// local dependencies
import { asyncMap } from './common';

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

async function readGithub(token) {
  const octoRest = new Rest({
    auth: token
  });
  const octoQL = QL.defaults({
    headers: {
      authorization: token
    }
  });
  return octoQL(`
    {
      user: viewer {
        repositories(affiliations: [OWNER], first: 100) {
          nodes {
            url
            name
            package: object(expression: "master:package.json") { ... on Blob { text } }
          }
        }
      }
    }
  `).then((repos) => repos.user.repositories.nodes);
}

async function formatRepo(repoObj) {
  const repoPath = repoObj.url;
  const repoName = repoObj.name;
  const packageObj = repoObj.package && repoObj.package.text ? JSON.parse(repoObj.package.text) : {};
  const aliases = uniq(compact([repoObj.name, packageObj.name]));
  return {
    type: 'github',
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
  const rslt = asyncMap(repoObjs, async (repoObj) => {
    return formatRepo(repoObj);
  });
  return rslt;
}

// Update

// Delete
export async function remove(token) {
  // test
}
