'use strict'

// Dependencies
var Errors = require('./models/errors.js')
var Schematic = require('./libs/validators.js')
var Utils = require('./libs/util.js')

// Main exported module
var Rewrites = {}



/*
*   Payments rewrites
*
*   This middleware takes all requests to /v0/payments and re-route them to
*   Braintree
*   Stripe
*   Custom payment endpoint
*/
Rewrites.payments = function (req, res, next) {
  if (!req.body.hasOwnProperty('method') && !req.body.hasOwnProperty('payment_method_id')) {
    return res.status(400).send({
      status: false,
      errors: [new Errors.BadRequest('Missing parameter "method" and "payment_method_id". Please provide at least one.')]
    })
  }

  if (!req.body.hasOwnProperty('order_id')) {
    return res.status(400).send({
      status: false,
      errors: [new Errors.BadRequest('Missing required parameter "order_id".')]
    })
  }

  var Params = new Schematic.Schema('PaymentParams', {
    'method': {
      type: 'string'
    },
    'payment_method_id': {
      type: 'number'
    },
    'order_id': {
      type: 'number',
      required: true
    }
  })

  var validation = Params.validate(req.body)
  if (validation.valid === false) {
    var error = new Errors.BadRequest()
    Utils.augment(error, validation)
    res.status(400).send({
      status: false,
      errors: [error]
    })
    return
  }

  switch (req.body.method) {
    case 'Braintree':
      req.url = '/v0/integrations/braintree/transactions/sale'
      break
    case 'Stripe':
      req.url = '/v0/integrations/stripe/charges'
      break
    default:
      req.url = '/v0/orders/' + req.body.order_id + '/payments'
      break
  }

  next()
}

module.exports = Rewrites
