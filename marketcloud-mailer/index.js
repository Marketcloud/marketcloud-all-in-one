Promise = global.Promise || require('es6-promise').Promise
const amqp = require('amqp-connection-manager')
const fs = require('fs')
const QUEUE_NAME = 'marketcloud-mail'
const winston = require('./services/winston.js')
let mongodb = require('./services/mongodb.service.js').getDatabaseInstance();
const config = require('./config.js')


function log (msg) {
  if (process.env.NODE_ENV === 'development') {
    console.log(msg)
  }

  if (typeof msg === 'string') {
    msg = {
      message: msg
    }
  }

  var data = {
    time: new Date(),
    data: msg
  }

  fs.appendFile('./mailer_log.txt', JSON.stringify(data), function (err) {
    if (err) {
      console.log('Unable to log message')
    }
  })
}

// Handle an incoming message.
var onMessage = function (data) {
  var msg = JSON.parse(data.content.toString())

  console.log('[mailer-service] Received a message')

  console.log('IL MESSAGGIO è di tipo', msg.type, 'su resource ', msg.resource_id)

  var handlers = [
    'orders.create',
    'orders.update.processing',
    'orders.update.completed',
    'users.create',
    'users.recoverPassword',
    'invoices.create'

  ]
  var notificationHandler = require('./handlers/generic_handler.js')(mongodb)
    // Checking if the application has a notification configured for this
    // event and if yes sending the email

  // The types of event are
  // order.created
  // order.shipped
  // order.deleted
  // order.paid
  // user.created

  // orders.update needs to be mapped to the
  // status change.
  // If there was no status change, we are not handling the event probably
  if (msg.type === 'orders.update') {
    msg.type += '.' + msg.data.request.body.status
  }

  if (msg.type === 'new_order') {
    msg.type = 'orders.create'
  }

  // Checking if we have a handler for this type of message
  // if not, we ignore the message
  // Not checking on every notification
  if (handlers.indexOf(msg.type) < 0) {
    console.log('This worker has no handlers for event ' + msg.type + '. Ignoring it.')
    channelWrapper.ack(data)
    return
  }

  // If we have a handler, we have to check wether
  // the application that generated this event
  // actually wants to send notifications for this event.

  // We have a mongodb collection for created notifications
  // the match is done by application_id and event type
  mongodb.collection('notifications').findOne({
    application_id: msg.application.id,
    event: msg.type,
    active: true
  }, function (err, notificationData) {
    console.log('Notification data lookup completed, found ', notificationData)
    if (err) {
      log({
        message: 'An error has occurred while processing a Mail job. Must be re-enqueued',
        data: msg,
        error: err
      })
    }

    if (notificationData === null) {
      console.log('Non ci sono notifiche da inviare per l applicazione ' + msg.application.id + ' ed evento ' + msg.type + '. Quindi lo rimuovo dalla coda.')
      channelWrapper.ack(data)
      return
    }

    // If it is not null, then we have a notification

    // We already confirmed that we have a handler for the message type
    // so we pass the message to it

    // We also decorate the message with notification data
    msg.notification = notificationData
    console.log('Invoking the handler for this type of notification')
    notificationHandler(msg, function (err) {
      // This is the handler callback;
      // When a handler terminates, calls the callback
      // and we ack the message
      if (err) {
        console.log('The handler for ' + msg.type + ' encountered an error.')
      }
      console.log('The handler for ' + msg.type + ' handled the message, we can ack it.')
      channelWrapper.ack(data)
      return
    })
  })
}

// Create a connetion manager
var connectionString = config.rabbitmq.connectionString
var connection = amqp.connect([connectionString], {
  json: true
})
connection.on('connect', function () {
  log('[' + (new Date()).toString() + '] Connected to RabbitMQ instance')
  winston.info('Connected to RabbitMQ instance')
})
connection.on('disconnect', function (params) {
  log({
    message: '[' + (new Date()).toString() + '] Disonnected from RabbitMQ instance',
    data: params.err.stack
  })
  winston.error('Disconnected from RabbitMQ instance', params)
})

// Set up a channel listening for messages in the queue.
var channelWrapper = connection.createChannel({
  setup: function (channel) {
    // `channel` here is a regular amqplib `ConfirmChannel`.
    return Promise.all([
      channel.assertQueue(QUEUE_NAME, {
        durable: false
      }),
      channel.prefetch(1),
      channel.consume(QUEUE_NAME, onMessage)
    ])
  }
})

channelWrapper
  .waitForConnect()
  .then(function () {
    winston.info('Mailer service started. Now listening for messages')
    log('[' + (new Date()).toString() + '] Listening for messages')
  })
