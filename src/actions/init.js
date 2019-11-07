// ****************************************************************************************************
// Init
// ****************************************************************************************************

// local dependencies
import Local from '../services/local';
import Github from '../services/github';

// init instances
const config = require('../../.env.json');

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default async function load(services) {
  return Object.assign(services, {
    local: new Local(config.local),
    github: new Github(config.github)
  });
}
