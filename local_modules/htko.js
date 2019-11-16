// ****************************************************************************************************
// Init
// ****************************************************************************************************

// flags
/* eslint-disable no-await-in-loop */

// dependencies

// ****************************************************************************************************
// Main
// ****************************************************************************************************

export const asyncMap = async function asyncMap(array, callback) {
  const rslt = [];
  for (let index = 0; index < array.length; index += 1) {
    rslt[index] = callback(array[index], index, array);
  }
  return Promise.all(rslt);
};

export const asyncForEach = async function asyncForEach(array, callback) {
  await asyncMap(array, callback);
};

export const asyncMapS = async function asyncMapS(array, callback) {
  const rslt = [];
  for (let index = 0; index < array.length; index += 1) {
    rslt[index] = await callback(array[index], index, array);
  }
};

export const asyncForEachS = async function asyncForEachS(array, callback) {
  await asyncMapS(array, callback);
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

export const posixPath = function pathPosix(path, stripTrailing){
  if (typeof path !== 'string') {
    throw new TypeError('expected path to be a string');
  }
  if (path === '\\' || path === '/') return '/';
  const len = path.length;
  if (len <= 1) return path;
  let prefix = '';
  if (len > 4 && path[3] === '\\') {
    const ch = path[2];
    if ((ch === '?' || ch === '.') && path.slice(0, 2) === '\\\\') {
      path = path.slice(2);
      prefix = '//';
    }
  }
  const segs = path.split(/[/\\]+/);
  if (stripTrailing !== false && segs[segs.length - 1] === '') {
    segs.pop();
  }
  return prefix + segs.join('/');
};

export const getDeepVal = function getDeepVal(obj, objPath) {
  return objPath.split('.').reduce((res, prop) => res[prop], obj);
};

export const arrToObj = function arrayToObject(arr, objPath) {
  return [...arr].reduce((accum, item) => {
    const val = getDeepVal(item, objPath);
    if (item && val) {
      accum[val] = item;
    }
    return accum;
  }, {});
};

export const mergeObj = function mergeObj(...objects) {
  return objects.reduce(
    (accum, object, idx) => {
      Object.keys(object).forEach((key) => {
        accum[key] = object[key] || accum[key];
      });
      return accum;
    },
    { ...objects[0] }
  );
};

