'use strict'

var configuration = require('../config/default.js')
var db = null

var mongo = require('mongoskin')

var getMongoConnectionString = function () {
  return 'mongodb://' + configuration.mongodb.username + ':' + configuration.mongodb.password + '@' + configuration.mongodb.hostname + ':' + configuration.mongodb.port + '/' + configuration.mongodb.database
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
