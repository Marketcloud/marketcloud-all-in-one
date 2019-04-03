
Promise = global.Promise || require('es6-promise').Promise
const amqp = require('amqp-connection-manager')
const mongo = require('mongoskin')
const fs = require('fs')
const http = require('http')
const request = require('superagent')
var configuration = require('./config/default.js')
var QUEUE_NAME = 'marketcloud-webhooks'

console.log('Starting marketcloud webhook service with this credentials', configuration)

/*  **********************************
            MONGODB CONFIG
 ************************************* */
var getMongoConnectionString = function () {
  return 'mongodb://' + configuration.mongodb.username + ':' + configuration.mongodb.password + '@' + configuration.mongodb.hostname + ':' + configuration.mongodb.port + '/' + configuration.mongodb.database
}

var mongodb = mongo.db(getMongoConnectionString(), {
  'auto_reconnect': true,
  'safe': true,
  'poolSize': 25,
  server: {
    socketOptions: {
      keepAlive: 1,
      connectTimeoutMS: 30000
    }
  }
})

/*
 * HTTP SERVER CONFIG
 */

const port = 3001
var timeStart = null
const requestHandler = (request, response) => {
  var now = (new Date()).getTime()
  var seconds = (now - timeStart) / 1000
  response.end(JSON.stringify({ok: 1, runningFor: seconds}))
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  timeStart = (new Date()).getTime()
  console.log(`server is listening on ${port}`)
})

/*
*   @param {HTTPRequest} req The request object as provided by the http module
*/
function eventFromRequest (req) {
  var method = req.method
  var path = req.path

  var action = null

  // The path is a string like
  // /v0/<resourceName>/[resourceId]/[subResourceName]/[subResourceId]
  // [] denotes optional
  // <> denotes mandatory
  var tokens = path.split('/')

    // Deconstructing the request path to get information about the event
  var apiVersion = tokens[1]
  var resourceName = tokens[2]
  var resourceId = tokens[3]
  var subresourceName = tokens[4]
  var subresourceId = tokens[5]

  // Checking for exceptions
  if (resourceName === 'users' && resourceId === 'authenticate') {
    // THen its a /users/authenticate
    return 'users.authenticate'
  }

  if (resourceName === 'users' && resourceId === 'recoverPassword') {
    // THen its a /users/recoverPassword
    return 'users.recoverPassword'
  }

  if (resourceName === 'users' && resourceId === 'resetPassword') {
    // THen its a /users/resetPassword
    return 'users.resetPassword'
  }

  if (resourceName === 'users' && subresourceName === 'updatePassword') {
    // THen its a /users/{id}/updatePasword
    return 'users.updatePassword'
  }

    // We get the action from the method, this is possible
    // because we folllow REST principles
  switch (method) {
    case 'POST':
      action = 'create'
      break
    case 'PUT':
      action = 'update'
      break
    case 'PATCH':
      action = 'update'
      break
    case 'DELETE':
      action = 'delete'
      break
    case 'GET' :
      action = 'find'
      break
  }

    // If the subresourceName is set, then the event is done on a subresource
  if (subresourceName) {
    return subresourceName + '.' + action
  }

    // Otherwise, its a top level resource
  return resourceName + '.' + action
}

function getApiVersionFromRequest (req) {
  var tokens = req.path.split('/')

    // Deconstructing the request path to get information about the event
  var apiVersion = tokens[1]

  return apiVersion
}

function log (msg) {
  if (typeof msg === 'string') {
    msg = {message: msg}
  }
  var data = {
    time: new Date(),
    data: msg
  }
  console.log(data)
  fs.appendFile('./webhook_service_log.txt', JSON.stringify(data), function (err) {
    if (err) {
      console.log('Unable to log message')
    }
  })
}

// Handle an incomming message.
var onMessage = function (queueData) {
  var msg = JSON.parse(queueData.content.toString())

    //   Vado a leggere la collection webhooks
    //   {application_id : app_id, event : products.create}
    //   Se c'è allora ho un array di chiamate da fare
    //

  var event = eventFromRequest(msg.data.request)

  var time = new Date()
  console.log('[' + time + '] Received an event : ' + event)

  mongodb
    .collection('webhooks')
    .find({
      application_id: msg.data.request.application_id,
      event: event
    })
    .toArray(function (err, webhooks) {
      if (err) {
        return console.log('AN ERROR HAS OCCURED; WEBHOOK NOT CALLED')
      }

      if (webhooks === null || webhooks.length === 0) {
        console.log('[' + (new Date()) + '] Application ' + msg.data.request.application_id + ' has no webhooks to call for event ' + event)
        channelWrapper.ack(queueData)
        return
      }

      var numberOfCallsToMake = webhooks.length
      var counter = 0

      console.log(numberOfCallsToMake + ' Webhook request to send.')

      /*
      *     Makes the request
      */
      var makeARequest = () => {
            // The current hook
        var hook = webhooks[counter]

        console.log('Making the request for hook pointed at ' + hook.url)

            // Init the request
        var _r = request(hook.method || 'POST', hook.url)

            // Setting HTTP Headers
        for (var k in hook.headers) {
          _r.set(k, hook.headers[k])
        }

        var webhookData = JSON.parse(msg.data.response.body)

        var webhookRequest = {
          method: msg.data.request.method || null,
          access: msg.data.request.access || null,
          path: msg.data.request.path || null
        }

        if (msg.data.request.hasOwnProperty('body')) { webhookRequest.body = msg.data.request.body }

        if (msg.data.request.hasOwnProperty('query')) {
          webhookRequest.query = msg.data.request.query
        }

            // Now we must attach the data
        var payload = {
          apiVersion: getApiVersionFromRequest(msg.data.request),
          time: new Date(),
          event: event,
          data: webhookData,
          request: webhookRequest
        }

        _r.send(payload)

        delete hook._id;
        // This is where we will store our log response
        var _log = {
          type: 'webhook-response',
          time: new Date(),
          webhook: hook,
          application_id : msg.data.request.application_id
        }
        _r.end(function (err, response) {
          if (err && response) {
                    // Call executed but the response
                    // has a "errorish" status code such as a 4xx or 5xx
                    // wel log this as a failed hook

            _log.status = false
            _log.message = ' Webhook request executed but the target response has statusCode >= 400'
            _log.response = {
              statusCode: response.status,
              body: response.body
            }

            console.log('Webhook request executed but the target response has statusCode >= 400', _log)
          } else if (err && !response) {
            // We were not able to make the call
            // or we didnt get any response from the server
            // Not sure about the last one
            // TODO investigate about the last one
            //

            _log.status = false
            _log.message = 'Webhook request not executed or never got response'
            _log.respone = null
            _log.error = {}

            if (err.code === 'ENOTFOUND') {
              _log.error = {
                code: 'ENOTFOUND',
                message: 'Unable to find address ' + hook.url
              }
            }

            console.log('Webhook request not executed or never got response', _log)
          } else if (!err && response) {
                    // This is a successful response from the hook

            _log.status = true
            _log.message = 'Webhook request executed successfully. Status code >=200 && < 400'
            _log.response = {
              statusCode: response.status,
              body: response.body
            }

            console.log('Webhook request executed successfully. Status code >=200 && < 400', _log)
          } else {
          // Something really fucked up happened but we log it anyway!

            _log.status = false
            _log.message = 'The endpoint did not provide any response.'
            _log.error = new Error('The endpoint did not provide any response.')

            console.log('Some really fucked up shit happened , we have falsy error and response.')
          }


          mongodb
          .collection('webhooks-logs')
          .insert(_log,function(err){
            if (err){
              console.log("Unable to store log");
            } else {
              console.log("Log successfully saved");
            }
          })

          counter++

          if (counter >= numberOfCallsToMake) {
            console.log('It was the last hook to execute')
            channelWrapper.ack(queueData)
            return
          } else {
            makeARequest()
          }
        })
      }

        // Calling makeRequest
      makeARequest()
    })
}

var connectionString = configuration.rabbitmq.connectionString
// Create a connetion manager
var connection = amqp.connect([connectionString], {json: true})

connection.on('connect', function () {
  log('[' + (new Date()).toString() + '] WEBHOOK QUEUE Connected to RabbitMQ instance')
})
connection.on('disconnect', function (params) {
  log({
    message: '[' + (new Date()).toString() + '] WEBHOOK QUEUE Disonnected from RabbitMQ instance',
    data: params.err.stack
  })
})

// Set up a channel listening for messages in the queue.
var channelWrapper = connection.createChannel({
  setup: function (channel) {
        // `channel` here is a regular amqplib `ConfirmChannel`.
    return Promise.all([
      channel.assertQueue(QUEUE_NAME, {durable: false}),
      channel.prefetch(1),
      channel.consume(QUEUE_NAME, onMessage)
    ])
  }
})

channelWrapper
.waitForConnect()
.then(function () {
  log('[' + (new Date()).toString() + '] Listening for messages')
})
