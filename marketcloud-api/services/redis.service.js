var configuration = require('../config/default')
var redis = require('redis')

var redisClient = redis.createClient({
  host: configuration.redis.host,
  port: configuration.redis.port,
  retry_strategy: function (options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.log("REDIS> L'errore è ECONNREFUSED, quindi ritorno errore")
      // End reconnecting on a specific error and flush all commands with a individual error
      return new Error('The server refused the connection')
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.log('REDIS> Ho finito il retry_time, ritorno errore')
      // End reconnecting after a specific timeout and flush all commands with a individual error
      return new Error('Retry time exhausted')
    }
    if (options.attempt > 10) {
      console.log('REDIS> Ho finito gli attempt, smetto di riconnettermi')
      // End reconnecting with built in error
      return undefined
    }
    // reconnect after
    console.log('REDIS>Il tempo di retry ora è ' + Math.min(options.attempt * 100, 3000))
    return Math.min(options.attempt * 100, 3000)
  }
}
)
redisClient.on('error', function (err) {
  if (process.env.NODE_ENV !== 'production') {
    return console.log('REDIS_ERROR:', err)
  }

  console.log('REDIS_ERROR:', err)
})
redisClient.on('reconnecting', function () {
  if (process.env.NODE_ENV !== 'production') {
    return console.log('REDIS_RECONNECTING')
  }
  console.log('REDIS::RECONNECTING')
})
redisClient.on('connect', function () {
  if (process.env.NODE_ENV !== 'production') {
    return console.log('REDIS_CONNECT')
  }
  console.log('REDIS::CONNECT')
})

setInterval(redisClient.ping.bind(redisClient), 1000 * 30)

module.exports = redisClient
