// ****************************************************************************************************
// Init
// ****************************************************************************************************

// flags
/* eslint-disable no-await-in-loop */

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export const asyncMap = async function asyncMapMap(array, callback) {
  const rslt = [];
  for (let index = 0; index < array.length; index += 1) {
    rslt[index] = callback(array[index], index, array);
  }
  return Promise.all(rslt);
};

export const asyncForEach = async function asyncForEach(array, callback) {
  await asyncMap(array, callback);
};

export const asyncReduce = async function asyncReduce(array, callback, initialValue) {
  let rslt = initialValue || array[0];
  for (let index = 0; index < array.length; index += 1) {
    rslt = await callback(rslt, array[index], index, array);
  }
  return rslt;
};

export const asyncReduceRight = async function asyncReduceRight(array, callback, initialValue) {
  let rslt = initialValue || array[array.length - 1];
  for (let index = 0; index < array.length; index += 1) {
    rslt = await callback(rslt, array[index], index, array);
  }
  return rslt;
};
