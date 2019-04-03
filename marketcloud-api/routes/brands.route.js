var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')

var resource = Resource({
  singularResourceName: 'brand',
  pluralResourceName: 'brands',
  validator: Types.Brand
})

module.exports = resource.router
