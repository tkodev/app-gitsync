// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { graphql as QL } from '@octokit/graphql';
import Rest from '@octokit/rest';
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

async function createGithub(token, repo) {
  // temp
}

async function removeGithub(token, repo) {
  // temp
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

async function readRepos(repoObjs) {
  return asyncMap(repoObjs, async (repoObj) => {
    return formatRepo(repoObj);
  });
}

// ****************************************************************************************************
// Export Functions
// ****************************************************************************************************

export const load = async function load(token) {
  const repoObjs = await readGithub(token);
  return readRepos(repoObjs);
};

export const create = async function create(token, repo) {
  // test
};

export const remove = async function remove(token) {
  // test
};
