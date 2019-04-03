module.exports = function(app) {

	var redis = require('redis');


	var redisClient = redis.createClient(
		app.get('configuration').redis.port,
		app.get('configuration').redis.host
	);
	redisClient.on('error', function(err) {
		console.log("REDIS_ERROR:", err)
	})
	redisClient.on('reconnecting', function() {
		console.log("REDIS::RECONNECTING")
	})
	redisClient.on('connect', function() {
		console.log("REDIS::CONNECT")
	})

	//Pinging the connection
	setInterval(redisClient.ping.bind(redisClient), 1000 * 30);

	//Adding auth
	if (app.get('configuration').redis.options && app.get('configuration').redis.options.hasOwnProperty('auth_pass'))
		redisClient.auth(app.get('configuration').redis.options.auth_pass)
	

	app.set('redis', redisClient);

	return redisClient;


}