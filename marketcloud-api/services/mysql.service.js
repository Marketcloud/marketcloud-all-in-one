'use strict'

var configuration = require('../config/default.js')
var db = null
var Sequelize = require('sequelize')

Sequelize.Promise.onUnhandledRejection = function (reason, promise) {
  console.log('Sequelize.onUnhandledRejection', reason, promise)
}

module.exports = {
  getDatabaseInstance: function () {
    if (db) { return db } else { return this.createNewInstance() }
  },
  createNewInstance: function () {
    db = new Sequelize(configuration.mysql.database, configuration.mysql.user, configuration.mysql.password, {
      host: configuration.mysql.host,
      port: configuration.mysql.port,
      dialect: 'mysql',
      maxConcurrentQueries: 100,
      logging: false,
      pool: {
        maxConnections: 150,
        minConnections: 5,
        maxIdleTime: 60000 // Ho configurato mysql per avere un wait_timeout di 60 secondi
      },
      define: {
        timestamps: false
      },
      dialectOptions: {
        multipleStatements: true
      }
    })
    db
      .authenticate()
      .then(function (err) {
        console.log('Connection to MySQL has been established successfully.')
      })
      .catch(function (err) {
        console.log('Unable to connect to the MySQL database:', err)
      })
    return db
  }
}
