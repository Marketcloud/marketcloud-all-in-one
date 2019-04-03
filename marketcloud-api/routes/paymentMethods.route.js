var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')

var resource = Resource({
  singularResourceName: 'paymentMethod',
  pluralResourceName: 'paymentMethods',
  validator: Types.PaymentMethod
})

module.exports = resource.router
