var dotenv = require('dotenv').config();

var Configuration = {};


Configuration.mongodb = {

	database: process.env.MONGODB_DBNAME,
	hostname: process.env.MONGODB_HOSTNAME,
	port: process.env.MONGODB_PORT,
	username: process.env.MONGODB_USERNAME,
	password: process.env.MONGODB_PASSWORD

}

Configuration.mysql = {
	connectionLimit : 100,
    host: process.env.MYSQL_HOSTNAME,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    supportBigNumbers: true,
    multipleStatements: true,
    port : process.env.MYSQL_PORT
}

Configuration.rabbitmq = {
	connectionString: process.env.RABBITMQ_CONNECTION_STRING
}


module.exports = Configuration;