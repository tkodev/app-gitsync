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
      viewer {
        repositories(first: 50) {
          nodes {
            url
            name
            # package: object(expression: "master:package.json") { ... on Blob { text } }
            # readme: object(expression: "master:package.json") { ... on Blob { text } }
          }
        }
      }
    }
  `).then((repos) => repos.viewer.repositories.nodes);
}

async function readRepoObj(repoObj) {
  const repoPath = repoObj.url;
  // const packageObj = repoObj.package.text ? JSON.parse(repoObj.package.text) : {};
  // const readmeStr = repoObj.readme.text || '';
  const aliases = uniq(compact([repoObj.name, packageObj.name]));
  return {
    path: repoPath,
    // package: packageObj,
    // readme: readmeStr,
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
    this.projects = [];
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
    const repos = await readRepos(this.settings, repoObjs);
    this.projects = repos;
    return this.projects;
  }
  async create(localRepos) {
    // test
  }
  read() {
    return this.projects;
  }
}
