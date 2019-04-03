var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')

var resource = Resource({
  singularResourceName: 'store',
  pluralResourceName: 'stores',
  validator: Types.Store
})

module.exports = resource.router
