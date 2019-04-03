var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')

var resource = Resource({
  singularResourceName: 'variable',
  pluralResourceName: 'variables',
  validator: Types.Variable
})

module.exports = resource.router
