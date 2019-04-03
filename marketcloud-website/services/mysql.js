"use strict"

var configuration = require('../configuration/default.js');
var db = null;


var mysql = require('mysql');





module.exports = {
	getDatabaseInstance : function() {
		if (!db)
			db = mysql.createPool(configuration.mysql);

		return db;
	}
};