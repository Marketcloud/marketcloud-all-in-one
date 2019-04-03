const Promise = require('bluebird')
const Redis = require('../services/redis.service.js')

// Default cache expire time
const EXPIRE_TIME = 60 * 24 // 1 day

// Shortcut to build the key in the right format
function makeKey(app_id, key) {
  return 'cache:' + app_id + ':' + key
}

function ApiCache() {
}

ApiCache.prototype.set = function(application_id, key, value) {

  return new Promise((resolve, reject) => {

    if ("object" === typeof value)
      value = JSON.stringify(value)

    Redis.set(makeKey(application_id, key), value, 'EX', EXPIRE_TIME, (err, results) => {
      if (err)
        return reject(err)
      else
        return resolve(results)
    })

  })

}

ApiCache.prototype.get = function(application_id, key) {
  return new Promise((resolve, reject) => {

    Redis.get(makeKey(application_id, key), (err, results) => {
      if (err)
        return reject(err);
      else
        return resolve(results);
    })

  })
};


ApiCache.prototype.del = function(application_id, key) {

  return new Promise((resolve, reject) => {
    Redis.del(makeKey(application_id, key), function(err, results) {
      if (err)
        return reject(err);
      else
        return resolve(results);
    })

  })
};


module.exports = ApiCache;