const mongo = require('mongoskin')
let db = null;
const config = require('../config.js').mongodb


var getMongoConnectionString = function() {
  return `mongodb://${config.username}:${config.password}@${config.MONGODB_HOSTNAME}:${config.MONGODB_PORT}/${config.MONGODB_PORT}`
}

module.exports = {
  getDatabaseInstance: function() {
    if (!db)
      db = mongo.db(getMongoConnectionString(), {
        autoReconnect: true,
        poolSize: 5
      });

    return db;
  }
};

