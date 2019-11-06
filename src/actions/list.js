// ****************************************************************************************************
// Main
// ****************************************************************************************************

export default async function list(services) {
  const localPaths = await services.local.list();
  console.log(localPaths);
  return services;
}
