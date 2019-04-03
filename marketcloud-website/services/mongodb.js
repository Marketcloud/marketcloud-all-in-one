"use strict"

const configuration = require('../configuration/default.js');
var db = null;
const mongo = require('mongoskin');


var getMongoConnectionString = function() {
        return 'mongodb://' + configuration.mongodb.username + ':' + configuration.mongodb.password + '@' + configuration.mongodb.hostname + ':' + configuration.mongodb.port + '/' + configuration.mongodb.database;
}



module.exports = {
	getDatabaseInstance : function() {
		console.log("MONGODB "+getMongoConnectionString())
		if (!db)
			db = mongo.db(getMongoConnectionString(), {
				    'auto_reconnect': true,
				    'safe': true,
				    'poolSize' : 25,
				    server: {
				        socketOptions: {
				            keepAlive: 1,
				            connectTimeoutMS: 30000
				        }
				    }
				});

		return db;
	}
};