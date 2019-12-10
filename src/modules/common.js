// ****************************************************************************************************
// Init
// ****************************************************************************************************

// flags
/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */

// ****************************************************************************************************
// Shared Functions
// ****************************************************************************************************

function iteratorSync(obj, callback) {
  const isArray = Array.isArray(obj);
  const keys = isArray ? obj : Object.keys(obj);
  const rslt = isArray ? [] : {};
  keys.forEach((val, idx) => {
    const key = isArray ? idx : keys[idx];
    rslt[key] = callback(obj[key], key, obj);
  });
  return rslt;
}

async function iteratorAsync(obj, callback, isParallel = false) {
  const isArray = Array.isArray(obj);
  const keys = isArray ? obj : Object.keys(obj);
  const rslt = isArray ? [] : {};
  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = isArray ? idx : keys[idx];
    rslt[key] = isParallel ? callback(obj[key], key, obj) : await callback(obj[key], key, obj);
  }
  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = isArray ? idx : keys[idx];
    rslt[key] = isParallel ? await rslt[key] : rslt[key];
  }
  return rslt;
}

// ****************************************************************************************************
// Export Functions - Syncronous Obj & Array Iterators
// ****************************************************************************************************

export function map(obj, callback) {
  return iteratorSync(obj, callback);
}

export function forEach(obj, callback) {
  iteratorSync(obj, callback);
  return undefined;
}

export function filter(obj, callback) {
  const isArray = Array.isArray(obj);
  const rslt = isArray ? [] : {};
  iteratorSync(obj, (val, key, curObj) => {
    const isValid = callback(val, key, curObj);
    if (isValid) rslt[key] = val;
  });
  return rslt;
}

export function reduce(obj, callback, initial) {
  const isArray = Array.isArray(obj);
  const keys = isArray ? Object.keys(obj) : obj;
  let rslt = initial || isArray ? obj[0] : obj[keys[0]];
  iteratorSync(obj, (val, key, curObj) => {
    rslt = callback(rslt, val, key, curObj);
  });
  return rslt;
}

// ****************************************************************************************************
// Export Functions - Asyncronous Obj & Array Iterators
// ****************************************************************************************************

export async function mapAsync(obj, callback, isParallel) {
  return iteratorAsync(obj, callback, isParallel);
}

export async function forEachAsync(obj, callback, isParallel) {
  await iteratorAsync(obj, callback, isParallel);
  return undefined;
}

export async function filterAsync(obj, callback) {
  const isArray = Array.isArray(obj);
  const rslt = isArray ? [] : {};
  await iteratorAsync(obj, async (val, key, curObj) => {
    const isValid = await callback(val, key, curObj);
    if (isValid) rslt[key] = val;
  });
  return rslt;
}

export async function reduceAsync(obj, callback, initial) {
  const isArray = Array.isArray(obj);
  const keys = isArray ? Object.keys(obj) : obj;
  let rslt = initial || isArray ? obj[0] : obj[keys[0]];
  await iteratorAsync(obj, async (val, key, curObj) => {
    rslt = await callback(rslt, val, key, curObj);
  });
  return rslt;
}

// ****************************************************************************************************
// Export Functions - Async / Await / Promises
// ****************************************************************************************************

export async function resolvePromises(obj) {
  if (Array.isArray(obj)) {
    return Promise.all(obj);
  }
  const rslt = { ...obj };
  const keys = Object.keys(rslt);
  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    rslt[key] = await rslt[key];
  }
  return rslt;
}

// ****************************************************************************************************
// Export Functions - Misc
// ****************************************************************************************************

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function posixPath(path, stripTrailing) {
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
}

export function arrayToObject(arr, objPath) {
  return [...arr].reduce((accum, item) => {
    const val = objPath.split('.').reduce((res, prop) => res[prop], item);
    if (item && val) {
      accum[val] = item;
    }
    return accum;
  }, {});
}

export function mergeObj(...objects) {
  return objects.reduce(
    (accum, object, idx) => {
      Object.keys(object).forEach((key) => {
        accum[key] = object[key] || accum[key];
      });
      return accum;
    },
    { ...objects[0] }
  );
}
