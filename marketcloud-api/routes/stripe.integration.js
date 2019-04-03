'use strict'

var express = require('express')
var router = express.Router()
var Errors = require('../models/errors.js')
var Cipher = require('../libs/cipher.js')
var Schematic = require('../libs/validators.js')
var Utils = require('../libs/util.js')

/*
*   @api {get} /integrations/stripe Request Stripe integration status for the current application
*   @apiName GetIntegration
*   @apiGroup Stripe
*
*   @apiSuccessExample {json} Success-Response:
*   {
*     "isActive" : true,
*     "environment": "development"
*   }
*
*/
router.get('/', Utils.fetchApplicationIntegrations, function (req, res, next) {
  if (!req.integrationsData.hasOwnProperty('stripe')) {
    return next(new Errors.NotFound('The Integration "Stripe" is not installed. You can install this application using the dashboard.'))
  }

  // We don't leak sensitive data, only state of the integration.
  var stripeIntegrationData = {
    environment: req.integrationsData.stripe.environment,
    isActive: req.integrationsData.stripe.isActive
  }
  return res.send({status: true, data: stripeIntegrationData})
})

/*
*   @api {post} /integrations/stripe/charges Makes a Charge using Stripe
*   @apiName CreateStripeCharge
*   @apiGroup Stripe
*
*   @apiParam {number} order_id The id of the order to pay
*   @apiParam {string} source The token obtained from Stripe on the frontend using Stripe.js
*
*   @apiSuccessExample {json} Success-Response:
*   {
*     "isActive" : true,
*     "environment": "development"
*   }
*
*/
router.post('/charges', function (req, res, next) {
  var mongodb = req.app.get('mongodb')

  var StripeCharge = new Schematic.Schema('StripeCharge', {

    order_id: {type: 'number', required: true},
    source: {type: 'string', required: true}
  })

  var validation = StripeCharge.validate(req.body)

  if (validation.valid === false) {
    var _err = new Errors.BadRequest()
    _err = Utils.augment(_err, validation)
    return next(_err)
  }

  mongodb
    .collection('applications_integrations')
    .findOne({
      application_id: req.client.application_id,
      'stripe.isActive': true
    }, function (err, result) {
      if (err) {
        return next(err)
      }

      if (result === null) {
        res.status(404).send({
          status: false,
          errors: [new Errors.BadRequest('The Stripe integration is not active for you application. You can activate it from you Dashboard > Integrations > Stripe. For further help, contact us at info@marketcloud.it .')]
        })
        return
      }

      var cipher = new Cipher()

      // Since we are using the key provided by the store owner
      // We don't need to check the environment. We will just use the correct key. (Their key)
      var STRIPE_KEY = cipher.decrypt(result.stripe.secret_key)

      var stripe = require('stripe')(STRIPE_KEY)

      // Looking up the order being paid
      mongodb.collection('orders')
        .findOne({
          application_id: req.client.application_id,
          id: Number(req.body.order_id)
        }, function (err, order) {
          if (err) { return next(err) }

          if (order === null) {
            return res.status(404).send({
              status: false,
              errors: [new Errors.NotFound('Could not find an order with id ' + req.body.order_id)]
            })
          }

          // Priority:
          // 1. order's currency
          // 2. Request's currency
          // 3. App's currency
          var chargeCurrencyCode = order.currency.code || req.body.currency || req.client.application.currency_code

          // If the currency is the base currency, the rate will be 1, so no effects
          // If the currency is not the base currency, then the charge amount is converted
          var convertedOrderTotal = order.total * order.currency.rate

          // This is the amount we pass to stripe, must be in the format required by stripe
          // so $ 20,50 would be 2050<
          var chargeAmount = Math.round(convertedOrderTotal * 100)

          // If the currency is not the base currency, we must translate the amount

          var charge = {
            amount: chargeAmount,
            currency: chargeCurrencyCode,
            source: req.body.source, // obtained with Stripe.js
            description: 'Payment processed by Marketcloud for order #' + order.id,
            metadata: {
              order_id: order.id
            }
          }

          // Calling the Stripe API
          stripe.charges.create(charge, function (err, charge) {
            if (err) {
              console.log('Stripe error', err)

              var _error = new Errors.BadRequest('Stripe transaction error. See object for more details.')
              _error.Stripe = {}
              _error.Stripe = err

              var newFailedPayment = {
                method: 'Stripe',
                created_at: new Date(),
                amount: order.total,
                successful: false,
                description: _error.Stripe.message,
                error: _error.Stripe
              }

              if (order.payments) { order.payments.push(newFailedPayment) } else {
                order.payments = [newFailedPayment]
              }

              return mongodb.collection('orders')
                .update({
                  application_id: req.client.application_id,
                  id: Number(req.body.order_id)
                }, {
                  $set: {
                    status: 'failed',
                    payments: order.payments // we don't use the $push operator from mongodb for more control
                  }
                },
                function (err) {
                  if (err) {
                    return next(err)
                  }

                  return next(_error)
                })
            }

            // If there's no error, then the transaction was successful.

            var newPayment = {
              method: 'Stripe',
              created_at: new Date(),
              amount: order.total,
              description: 'Successful Stripe payment processed by Marketcloud for order #' + order.id,
              successful: true,
              data: charge
            }

            if (order.payments) { order.payments.push(newPayment) } else {
              order.payments = [newPayment]
            }

            // Now we must update the order with the payment.
            mongodb.collection('orders').update({
              application_id: req.client.application_id,
              id: req.body.order_id
            }, {
              $set: {
                payments: order.payments,
                status: 'processing'
              }
            },
            function (err) {
              if (err) { return next(err) }

              // We emit the orders.paid and payments.create event
              var queue = req.app.get('mail-queue')

              var message = {
                type: 'orders.update.processing',
                resource_id: req.body.order_id,
                application: req.client.application
              }

              queue
                .sendToQueue('marketcloud-mail', message)
                .then(function () {
                  return console.log('Message enqueued to Mail queue correctly')
                }).catch(function (err) {
                  return console.log('Message was not enqueued to Mail service', err)
                })
              res.send({
                status: true,
                data: charge,
                _embedded: {
                  order: order
                }
              })
            })
          })
        })
    })
})

module.exports = router
