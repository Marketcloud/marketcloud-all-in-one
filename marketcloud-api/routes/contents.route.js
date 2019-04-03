var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')

var resource = Resource({
  singularResourceName: 'content',
  pluralResourceName: 'contents',
  validator: Types.Content
})

module.exports = resource.router
