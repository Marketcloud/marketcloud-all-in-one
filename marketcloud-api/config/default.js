var dotenv = require('dotenv').config('../.env');

var Configuration = {};


Configuration.marketcloud = {
	apiBaseUrl: process.env.MARKETCLOUD_API_BASE_URL
}

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


Configuration.organization = {
	email: process.env.ORGANIZATION_EMAIL,
	name: process.env.ORGANIZATION_NAME
}

Configuration.rabbitmq = {
	connectionString: process.env.RABBITMQ_CONNECTION_STRING
}

Configuration.redis = {
	port: process.env.REDIS_PORT,
	host: process.env.REDIS_HOSTNAME,
}


Configuration.sendgrid = {
	key: process.env.SENDGRID_KEY
}

Configuration.server = {
	port: 5000
}

Configuration.storage = {
	azureStorageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
	azureStorageAccountAccessKey: process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY,
	azureStorageCDNBaseUrl: process.env.AZURE_STORAGE_CDN_BASE_URL,
}


Configuration.stripe = {
	clientId: process.env.STRIPE_CLIENT_ID,
	secretKey: process.env.STRIPE_SECRET_KEY,
	testingClientId: process.env.STRIPE_TESTING_CLIENT_ID,
	testingSecretKey: process.env.STRIPE_TESTING_SECRET_KEY,
}




module.exports = Configuration;