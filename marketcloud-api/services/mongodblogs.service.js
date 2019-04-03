'use strict'

var configuration = require('../config/default.js')
var db = null

var mongo = require('mongoskin')

var getMongoConnectionString = function () {
  return 'mongodb://' + configuration.mongodbLogs.username + ':' + configuration.mongodbLogs.password + '@' + configuration.mongodbLogs.hostname + ':' + configuration.mongodbLogs.port + '/' + configuration.mongodbLogs.database
}

module.exports = {
  getDatabaseInstance: function () {
    if (!db) {
      db = mongo.db(getMongoConnectionString(), {
        autoReconnect: true,
        poolSize: 25
      })
    }

    return db
  }
}
