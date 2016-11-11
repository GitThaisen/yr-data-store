'use strict';

const get = require('./get');
const keys = require('@yr/keys');
const set = require('./set');

/**
 * Remove 'key'
 * @param {DataStore} store
 * @param {String} key
 */
module.exports = function remove (store, key) {
  // Remove prop from parent
  const length = keys.length(key);
  const k = (length == 1) ? key : keys.last(key);
  const data = (length == 1) ? store._data : get(store, keys.slice(key, 0, -1));

  // Only remove existing (prevent recursive trap)
  if (data && k in data) {
    store.debug('remove "%s"', key);
    set(store, k, undefined);
  }
};