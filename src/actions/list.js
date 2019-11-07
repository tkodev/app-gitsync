// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default async function list(services) {
  try {
    const localRepos = await services.local.list();
    console.log(localRepos[0]);
    const githubRepos = await services.github.list();
    console.log(githubRepos[0]);
  } catch (err) {
    console.log(err);
  }
  return services;
}
