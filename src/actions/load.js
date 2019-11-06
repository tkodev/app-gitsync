// ****************************************************************************************************
// Init
// ****************************************************************************************************

// dependencies
import dotenv from 'dotenv';

// local dependencies
import Local from '../services/local';

// init instances
const config = dotenv.config();

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default async function load() {
  return {
    local: new Local({
      reposPath: process.env.REPOS_PATH
    })
  };
}
