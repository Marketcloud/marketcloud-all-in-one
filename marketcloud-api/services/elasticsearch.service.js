'use strict'

var elasticsearch = require('elasticsearch')
var configuration = require('../config/default.js')

// Singleton instance
var client = null

module.exports = {

  getDatabaseInstance: function () {
    if (client) { return client }

    client = new elasticsearch.Client({
      host: configuration.elasticsearch.connectionString
    })

    return client
  }
}
