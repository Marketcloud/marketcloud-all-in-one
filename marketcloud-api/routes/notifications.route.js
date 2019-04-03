'use strict'

const Express = require('express')
const Router = Express.Router()
const Types = require('../models/types.js')
const Errors = require('../models/errors.js')
const Utils = require('../libs/util.js')
const Middlewares = require('../middlewares.js')
const configuration = require('../config/default.js')
const sendgrid = require('sendgrid')(configuration.sendgrid.key)

/**
 * @param  {string} The email address to validate
 * @return {boolean} Returns True if the email is valid
 */
function validateEmail (email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(email)
}

Router.post('/send',
  Middlewares.verifyClientAuthorization('orders', 'delete'),
  function (req, res, next) {
    var validation = Types.CustomNotification.validate(req.body)

    if (validation.valid === false) {
      return next(new Errors.ValidationError(validation))
    }

    console.log(req.client.application)
    var from = req.client.application.email_address || req.client.application.owner

    var emailConfiguration = {
      to: req.body.to,
      from: from,
      subject: req.body.subject || 'Notification',
      text: req.body.text,
      html: req.body.html || req.body.text
    }

    if (req.body.bcc) {
      emailConfiguration.bcc = req.body.bcc
    }

    sendgrid.send(emailConfiguration, function (err, response) {
      if (err) { return next(err) }

      return res.send({status: true})
    })
  })

/*
* WARNING, BE SURE THAT YOU ARE SENDING THE CORRECT
* PAYLOAD TO THE NOTIFICATION.

* We should use a validation system for notifications
*/

function confirm_order_endpoint (req, res, next) {
  var order_id = Number(req.params.orderId)

  var app_data = req.client.application

  var mongodb = req.app.get('mongodb')

  mongodb.collection('orders').findOne({
    id: order_id,
    application_id: req.client.application_id
  }, function (err, order_data) {
    if (err) { return next(err) }

    if (!order_data) {
      return res.status(404).send({
        status: false,
        errors: [new Errors.NotFound('Unable to find an order with id ' + order_id)]
      })
    }
    var queue = req.app.get('mail-queue')
    var message = {
      type: 'new_order',
      order: order_data,
      application: req.client.application
    }

    return queue.sendToQueue('marketcloud-mail', message)
      .then(function () {
        console.log('Email message correctly enqueued')
        res.send({status: true})
      }).catch(function (err) {
        console.log('Message was not enqueued', err)
        return res.status(500).send({
          status: false,
          errors: [new Errors.InternalServerError('Unable to send the notification')]})
      })
  })
};

Router.post('/confirm_order/:orderId',
  Middlewares.verifyClientAuthorization('orders', 'create'),
  confirm_order_endpoint)

/*
* Sends a notification with type event_type and resource_id
*/
Router.post('/:event_type/:resource_id',
  Middlewares.verifyClientAuthorization('orders', 'create'),
  function (req, res, next) {
    var queue = req.app.get('mail-queue')
    var message = {
      type: req.params.event_type,
      resource_id: Number(req.params.resource_id),
      application: req.client.application
    }

    return queue.sendToQueue('marketcloud-mail', message)
      .then(function () {
        console.log('Email message correctly enqueued')
        res.send({status: true})
      }).catch(function (err) {
        console.log('Message was not enqueued', err)
        return res.status(500).send({
          status: false,
          errors: [new Errors.InternalServerError('Unable to send the notification')]})
      })
  })

/**
*	Get a notification  by id
**/
Router.get('/:notification_id', Middlewares.verifyClientAuthorization('orders', 'delete'),
  function (req, res, next) {
    var notification_id = Number(req.params.notification_id)

    var mongodb = req.app.get('mongodb')

    mongodb.collection('notifications').findOne({
      application_id: req.client.application_id,
      id: notification_id
    }, function (err, data) {
      if (err) { return next(err) }

      if (data === null) { return next(new Errors.NotFound('Unable to find Notification with id ' + notification_id)) }

      res.send({ status: true, data: data})
    })
  })

/**
*	gets a list of notifications.
**/
Router.get('/', Middlewares.verifyClientAuthorization('orders', 'delete'),
  function (req, res, next) {
    var query = {
      where_statement: {}
    }

    var db = req.app.get('mongodb')

    // Default skip and limit values
    query.skip = 0
    query.limit = 20

    // per_page query param tells how many result
    if (req.query.hasOwnProperty('per_page')) {
      if (!Utils.isInteger(req.query.per_page)) {
        return res.status(400).send({
          status: false,
          errors: [new Errors.BadRequest('per_page parameter must be an integer number.')]
        })
      }

      query.limit = Number(req.query.per_page)
    }

    // page query param tells which interval of produccts should be showed
    if (req.query.hasOwnProperty('page')) {
      if (!Utils.isInteger(req.query.page)) {
        return res.status(400).send({
          status: false,
          errors: [new Errors.BadRequest('page parameter must be an integer number.')]
        })
      }
      query.skip = (Number(req.query.page) - 1) * query.limit
    }

    // TODO add sorting

    query.projection = {_id: 0, application_id: 0}

    query.where_statement.application_id = req.client.application_id

    db.collection('notifications')
      .find(query.where_statement)
      .count(function (err, count) {
        db.collection('notifications')
          .find(query.where_statement, query.projection)
          .skip(query.skip)
          .limit(query.limit)
          .sort([['date', -1]])
          .toArray(function (err, data) {
            if (err) {
              console.log(err)
              next(err)
            } else {
              var pagination = Utils.getPagination({
                count: count,
                limit: query.limit,
                skip: query.skip,
                req_query: req.query,
                resource: 'notifications'
              })

              var response = Utils.augment({
                status: true,
                data: data
              }, pagination)

              res.send(response)
            }
          })
      })
  })

/**
*	Create a notification
*	When the event linked to this notification occurs
*	the mailer daemon read the database looking for this kind of notifications.
**/
Router.post('/', Middlewares.verifyClientAuthorization('orders', 'delete'),
  function (req, res, next) {
    var notification = req.body,
      mongodb = req.app.get('mongodb'),
      sequelize = req.app.get('sequelize')

		    sequelize.query(Utils.Queries.getNewUID, {
		      type: sequelize.QueryTypes.SELECT
		    })
      		.then(function (new_id) {
      			notification.id = new_id[1]['0']['LAST_INSERT_ID()']
      			notification.application_id = req.client.application_id

      			mongodb.collection('notifications')
          .insert(notification, function (err, data) {
            if (err) { return next(err) }

            res.send({status: true, data: notification})
          })
      		})
      		.catch(Utils.getSequelizeErrorHandler(req, res, next))
  })

/**
*	Updates a notification
**/
Router.put('/:notification_id',
  Middlewares.verifyClientAuthorization('orders', 'delete'),
  function (req, res, next) {
    delete req.body['_id']
    delete req.body['application_id']
    var db = req.app.get('mongodb')
    console.log('La query', {
      'id': Number(req.params.notification_id),
      'application_id': req.client.application_id
    })
   	console.log('UPPDATE', req.body)
    db.collection('notifications')
      .findAndModify({
        'id': Number(req.params.notification_id),
        'application_id': req.client.application_id
      }, [], {
        $set: req.body
      }, {
        'new': true
      }, function (error, doc) {
        if (error) { return next(err) }

        if (doc === null) {
          return res.status(404).send({
            status: false,
            errors: [new Errors.NotFound()]
          })
        }

        // At some point mongodb startes giving output in the form:
        // {latErrorObject, value}
        // Witch fucked us for some hours :)
        doc = doc.value
        // TODO quando mi manda anche lo _id si sputtana il findAndModify

        res.send({
          status: true,
          data: doc
        })
      })
  })

/**
*	Deletes a notification
**/
Router.delete('/:notification_id', Middlewares.verifyClientAuthorization('orders', 'delete'),
  function (req, res, next) {
    var db = req.app.get('mongodb')

    db.collection('notifications')
      .remove({
        id: Number(req.params.notification_id),
        application_id: req.client.application_id
      }, function (err) {
        if (err) { return next(err) }

        res.send({
          status: true
        })
      })
  })

/**
*	Forcefully send a notification
**/
Router.post('/:notification_name',
  Middlewares.verifyClientAuthorization('orders', 'create'),
  function (req, res, next) {
    // Carico i dati della notifica
    // Se non esiste o errore ritorno errore
    // Se esiste la mando al mailer demon con tutti i dati, dal template agli indirizzi

    var mongodb = req.app.get('mongodb')

    // Every notification need different data
    // For example a order.create notification
    // needs a order_id
    var notification_data = req.body

    mongodb.collection('notifications').findOne({
      application_id: req.client.application_id,
      name: req.params.notification_name
    }, function (err, data) {
      if (err) { return next(err) }

      if (data === null) { return next(new Errors.NotFound('Unable to find notification named ' + req.params.notification_name)) }

      var queue = req.app.get('mail-queue')
      var message = {
        type: 'notification',
        data: data,
        application: req.client.application
      }
    })
  })

module.exports = Router
