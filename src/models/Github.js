// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { graphql as QL } from '@octokit/graphql';
import Rest from '@octokit/rest';
import { uniq, compact } from 'lodash';

// local dependencies
import { asyncMap } from '../../local_modules/htko';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

async function readGithub(octoQL) {
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

async function readRepoObj(repoObj) {
  const repoPath = repoObj.url;
  const repoName = repoObj.name;
  const packageObj = repoObj.package && repoObj.package.text ? JSON.parse(repoObj.package.text) : {};
  const aliases = uniq(compact([repoObj.name, packageObj.name]));
  return {
    name: repoName,
    path: repoPath,
    package: packageObj,
    aliases
  };
}

async function readRepos(repoObjs) {
  return asyncMap(repoObjs, async (repoObj) => {
    return readRepoObj(repoObj);
  });
}

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class GithubService {
  constructor(settings) {
    this.settings = settings;
    this.repos = [];
    this.octoQL = QL.defaults({
      headers: {
        authorization: settings.token
      }
    });
    this.octoRest = new Rest({
      auth: settings.token
    });
  }
  async load() {
    const repoObjs = await readGithub(this.octoQL);
    this.repos = await readRepos(repoObjs);
  }
  async create(repo) {
    // test
  }
  async delete(repo) {
    // test
  }
  read() {
    return this.repos;
  }
}
