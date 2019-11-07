// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import { graphql } from '@octokit/graphql';
import humanize from 'humanize-graphql-response';

// local dependencies
import { asyncMap } from '../libraries/async';

// ****************************************************************************************************
// Functions
// ****************************************************************************************************

function initGQLAuth(gql, token) {
  return gql.defaults({
    headers: {
      authorization: token
    }
  });
}

async function getRepos(gqlAuth) {
  const repos = await gqlAuth(
    `
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
    `
  );
  const rslt = humanize(repos.viewer).repositories.map((repo) => {
    // eslint-disable-next-line no-param-reassign
    repo.repositoryTopics = repo.repositoryTopics.map((topicObj) => topicObj.topic.name);
    return repo;
  });
  return rslt;
}

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default class Service {
  constructor(options) {
    console.log('[github] init');
    this.gqlAuth = initGQLAuth(graphql, options.authHTTPS.token);
  }
  async list() {
    console.log('[github] list');
    const repos = await getRepos(this.gqlAuth);
    const rslt = await asyncMap(repos, async (repo) => {
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
    this.repos = rslt;
    return this.repos;
  }
}
