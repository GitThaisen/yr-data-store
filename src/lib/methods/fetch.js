'use strict';

const get = require('./get');
const isPlainObject = require('is-plain-obj');
const load = require('./load');
const reload = require('./reload');

/**
 * Fetch data. If expired, load from 'url' and store at 'key'
 * @param {DataStore} store
 * @param {String} key
 * @param {String} url
 * @param {Object} options
 *  - {Boolean} abort
 *  - {Boolean} ignoreQuery
 *  - {Number} minExpiry
 *  - {Boolean} reload
 *  - {Number} retry
 *  - {Boolean} staleWhileRevalidate
 *  - {Boolean} staleIfError
 *  - {Number} timeout
 * @returns {Promise}
 */
module.exports = function fetch (store, key, url, options = {}) {
  const { reload: shouldReload, staleWhileRevalidate, staleIfError } = options;

  const value = get(store, key);
  const isMissingOrExpired = !value || hasExpired(value, store.EXPIRES_KEY);

  // Load if missing or expired
  if (isMissingOrExpired) {
    store.debug('fetch %s from %s', key, url);

    const promiseToLoad = new Promise((resolve, reject) => {
      load(store, key, url, options)
        .then((res) => {
          // Schedule a reload
          if (shouldReload) reload(store, key, url, options);
          resolve({
            duration: res.duration,
            headers: res.headers,
            data: get(store, key)
          });
        })
        .catch((err) => {
          // Schedule a reload if error
          if (err.status >= 500 && shouldReload) reload(store, key, url, options);
          resolve({
            duration: 0,
            error: err,
            headers: { status: err.status },
            data: staleIfError ? value : null
          });
        });
    });

    // Wait for load unless stale and staleWhileRevalidate
    if (!(value && staleWhileRevalidate)) return promiseToLoad;
  }

  // Schedule a reload
  if (shouldReload) reload(store, key, url, options);
  // Return data (possibly stale)
  return Promise.resolve({
    duration: 0,
    headers: { status: 200 },
    data: value
  });
};

/**
 * Check if 'obj' has expired
 * @param {Object} obj
 * @param {String} expiresKey
 * @returns {Boolean}
 */
function hasExpired (obj, expiresKey) {
  return obj
    && isPlainObject(obj)
    && expiresKey in obj
    && Date.now() > obj[expiresKey];
}