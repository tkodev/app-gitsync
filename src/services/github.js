// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { graphql as QL } from '@octokit/graphql';
import Rest from '@octokit/rest';
import path from 'path';

// local dependencies
import { asyncMap } from '../../local_modules/htko';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

async function readRepos(octoQL) {
  return octoQL(`
    {
      viewer {
        repositories(first: 50) {
          nodes {
            path: url
            name
            license: licenseInfo { name }
            description
            keywords: repositoryTopics(first: 10) { nodes { topic { name } } }
            homepage: homepageUrl
            hash: defaultBranchRef { target { ... on Commit { history(first: 1) { nodes { id } } } } }
            json: object(expression: "master:package.json") { ... on Blob { text } }
          }
        }
      }
    }
  `).then((repos) => repos.viewer.repositories.nodes);
}

async function readJsons(repos) {
  return asyncMap(repos, async (repo) => {
    return repo.json && repo.json.text ? JSON.parse(repo.json.text) : {};
  });
}

async function requestRepos(octoQL) {
  const repos = await readRepos(octoQL);
  const jsons = await readJsons(repos);
  return asyncMap(repos, async (repo, idx) => {
    return {
      path: repo.path,
      name: repo.name,
      license: repo.license && repo.license.name ? repo.license.name : '',
      description: repo.description || '',
      keywords: repo.keywords.nodes.map((topicObj) => topicObj.topic.name),
      homepage: repo.homepage || '',
      remotes: { origin: `${repo.path}.git` },
      status: 0,
      hash: repo.hash.target.history.nodes[0].id,
      json: jsons[idx]
    };
  });
}

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class GithubService {
  constructor(token) {
    this.octoQL = QL.defaults({
      headers: {
        authorization: token
      }
    });
    this.octoRest = new Rest({
      auth: token
    });
  }
  async getRepos() {
    const repos = await requestRepos(this.octoQL);
    return repos;
  }
}
