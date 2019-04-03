var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')

var resource = Resource({
  singularResourceName: 'address',
  pluralResourceName: 'addresses',
  validator: Types.Address,
  hooks: {
    beforeCreate: setUserIdForNewAddress,
    beforeList: setUserIdForReadOperation,
    beforeGetById: setUserIdForReadOperation
  }
})

// We set the ownership of the address
function setUserIdForNewAddress (req, res, next) {
  if (req.client.access === 'user') {
    req.body.user_id = req.client.user_id
  }

  return next()
}

function setUserIdForReadOperation (req, res, next) {
  if (req.client.access === 'user') {
    req.data_query.where_statement['user_id'] = req.client.user_id
  }

  return next()
}

module.exports = resource.router
