// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { Graphql } from '@octokit/graphql';
import { Rest } from '@octokit/rest';
import humanize from 'humanize-graphql-response';

// local dependencies
import { asyncMap } from '../../local_modules/async';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

async function retrieveRepos(gqlAuth) {
  const repos = await gqlAuth(`
    { 
      viewer {
        repositories(first: 10) {
          edges {
            node {
              name
              licenseInfo { name }
              description
              repositoryTopics (first: 10) { edges { node { topic { name } } } }
              homepageUrl
              url
            }
          }
        }
      }
    }
  `);
  return humanize(repos.viewer).repositories.map((repo) => {
    // eslint-disable-next-line no-param-reassign
    repo.repositoryTopics = repo.repositoryTopics.map((topicObj) => topicObj.topic.name);
    return repo;
  });
}

async function compileRepos(repos) {
  return asyncMap(repos, async (repo) => {
    return {
      name: repo.name,
      path: repo.url,
      license: repo.licenseInfo || '',
      description: repo.description,
      keywords: repo.repositoryTopics,
      homepage: repo.homepageUrl,
      remotes: {
        origin: `${repo.url}.git`
      },
      status: 0
    };
  });
}

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class Github {
  constructor(token) {
    this.octoQL = Graphql.defaults({
      headers: {
        authorization: token
      }
    });
    this.octoRest = new Rest({
      auth: token
    });
  }
  async getRepos() {
    const repos = await retrieveRepos(this.octoQL);
    const rslt = await compileRepos(repos);
    return rslt;
  }
  async setRepos() {
    console.log(this);
  }
}
