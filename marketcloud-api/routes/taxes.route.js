var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')

var resource = Resource({
  singularResourceName: 'tax',
  pluralResourceName: 'taxes',
  validator: Types.Tax
})

module.exports = resource.router
