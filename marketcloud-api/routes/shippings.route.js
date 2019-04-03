var Resource = require('../libs/resource')
var Utils = require('../libs/util')
var Types = require('../models/types')
var Errors = require('../models/errors')
var Middlewares = require('../middlewares.js')

var resource = Resource({
  singularResourceName: 'shipping',
  pluralResourceName: 'shippings',
  validator: Types.Shipping,
  hooks: {
    beforeCreate: applyDefaults,
    beforeList: [handleZonesQuery, handleConstraintsQuery],
    afterList: [Utils.convertShippingCurrency],
    afterGetById: Utils.convertShippingCurrency
  }
})

var Router = resource.router

var rules = [
  'value',
  'weight',
  'width',
  'height',
  'depth'
]

// Handles the "zone" GET paramerter which filters shipping rules bby zone
function handleZonesQuery (req, res, next) {
  if (req.query.hasOwnProperty('zone')) {
    req.data_query.where_statement.zones = {
      $elemMatch: {
        $or: [{
          name: req.query.zone
        }, {
          code: 'ALL'
        }]
      }
    }

    delete req.data_query.where_statement['zone']
  }
  return next()
}

function handleConstraintsQuery (req, res, next) {
  var query = req.data_query

  var constraints = []
  rules
    .forEach(function (e) {
      if (query.where_statement.hasOwnProperty(e)) {
        // O il campo non esiste, quindi la regola è lasciata passare
        // oppure esiste e la regola ammette il valore
        var maxOptions = {}
        maxOptions['max_' + e] = {
          $gte: query.where_statement[e]
        }

        var nonExistingMaxOptions = {}
        nonExistingMaxOptions['max_' + e] = {
          $exists: false
        }

        constraints.push({
          '$or': [maxOptions, nonExistingMaxOptions]
        })

        var minOptions = {}
        minOptions['min_' + e] = {
          $lte: query.where_statement[e]
        }

        var nonExistingMinOptions = {}
        nonExistingMinOptions['min_' + e] = {
          $exists: false
        }

        constraints.push({
          '$or': [minOptions, nonExistingMinOptions]
        })

        delete query.where_statement[e]
      }
    })
  if (constraints.length > 0) {
    query.where_statement['$and'] = constraints
  }

  return next()
}

function applyDefaults (req, res, next) {
  var newShipping = req.body

  if (!newShipping.hasOwnProperty('base_cost')) {
    newShipping.base_cost = 0
  }

  if (!newShipping.hasOwnProperty('per_item_cost')) {
    newShipping.per_item_cost = 0
  }

  if (!newShipping.hasOwnProperty('zones')) {
    newShipping.zones = []
  }

  return next()
}

function getShippingRulesByCart (req, res, next) {
  var cartId = Number(req.params.cart_id)

  req.app.get('mongodb')
    .collection('carts')
    .findOne({
      application_id: req.client.application_id,
      id: cartId
    }, function (err, cart) {
      if (err) {
        return next(err)
      }

      if (cart === null) {
        return next(new Errors.NotFound('Cannot find cart with id ' + cartId))
      }

      req.cart = cart
      return next()
    })
}

function populateCartItems (req, res, next) {
  var cart = req.cart

  var productIds = cart.items.map(i => i.product_id)
  var query = {}
  query.where = {
    application_id: req.client.application_id,
    id: {
      $in: productIds
    }
  }
  query.projection = {
    _id: 0,
    application_id: 0
  }

  /*
      takes an array of products and if they are grouped
      it expands them
  */

  req.app.get('mongodb')
    .collection('products')
    .find(query.where, query.projection)
    .toArray(function (err, dbproducts) {
      var products = dbproducts
      if (err) {
        next(err)
      } else {
        var listOfLineItems = []
        var productsHashMap = {}
        products.forEach(function (p) {
          productsHashMap[p.id] = p
        })

        cart.items.forEach(function (i) {
          // Può capitare che un productsHashMap[i.product_id] sia undefined
          // questo perchè magari un utente ha nel carrello un prodotto eliminato
          // dallo store, quindi in tal caso, il carrello è in uno stato inconsistente
          // Per ovviare al problema, devo fare in modo che questo elemento venga rimosso dal carrello
          // Per ora lo skippiamo semplicemente
          if (!Utils.hasValue(productsHashMap[i.product_id])) {
            return
          }

          var expandedLineItem = JSON.parse(JSON.stringify(productsHashMap[i.product_id]))

          expandedLineItem.product_id = i.product_id
          expandedLineItem.variant_id = i.variant_id || 0
          expandedLineItem.quantity = i.quantity

          // If the item in cart is a variant, then we must edit the product a bit
          if (i.variant_id !== 0) {
            expandedLineItem.variants.forEach(function (v) {
              if (v.id === i.variant_id) {
                expandedLineItem.variant = v
                delete expandedLineItem['variants']
              }
            })
          }

          listOfLineItems.push(expandedLineItem)
        })

        // Now if some products were deleted , we must remove them
        // from the cart.
        cart.items = listOfLineItems

        cart.items_total = Utils.getTotalItemsValue(cart.items)

        cart.total = cart.items_total

        /*
        // TODO implement Utils.getTotalPromotionDiscount();
        // Now we check for promotion discount
        */

        // Now we check for coupons and we get the total discount
        if (cart.coupon) {
          cart.coupon_discount = Utils.getTotalCouponDiscount(cart.coupon, cart.items)

          cart.total -= cart.coupon_discount
        }

        // Now we do some maths to calculate total weight etc.
        cart.total_weight = Utils.getTotalItemsWeight(cart.items)

        // We check for currencies before removing non-existing product from cart
        // it seems to be a de-opt but it actually allows to simplify async code.
        var requestedCurrency = Utils.getRequestedCurrency(req)
        if (requestedCurrency) {
          var currencyRate = Utils.getCurrencyRate(requestedCurrency, req.client.application)

          if (currencyRate === null) {
            return next(new Errors.BadRequest('Cannot use currency ' + requestedCurrency + '. Add it first as supported currency in your store\'s admin panel.'))
          }

          cart = Utils.convertCartPrices(cart, requestedCurrency, currencyRate)
        }

        req.cart = cart
        return next()
      }
    })
};

function getTotalAttribute (attribute, products) {
  return products.map(item => {
    if (attribute === 'value') {
      return Utils.getLineItemPrice(item) // This is a lineItem so when calculating the value we should take the quantity in account
    }

    if (item.variant) { return item.variant[attribute] || 0 } else {
      return item[attribute] || 0
    }
  })
    .reduce((a, b) => a + b, 0)
}

function searchShippingsByCart (req, res, next) {
  var query = {
    application_id: req.client.application_id
  }

  rules.forEach(rule => {
    var cartRuleValue = getTotalAttribute(rule, req.cart.items)

    if (cartRuleValue > 0) {
      query[rule] = cartRuleValue
    }
  })

  var constraints = []
  rules
    .forEach(function (e) {
      if (query.hasOwnProperty(e)) {
        // O il campo non esiste, quindi la regola è lasciata passare
        // oppure esiste e la regola ammette il valore
        var maxOptions = {}
        maxOptions['max_' + e] = {
          $gte: query[e]
        }

        var nonExistingMaxOptions = {}
        nonExistingMaxOptions['max_' + e] = {
          $exists: false
        }

        constraints.push({
          '$or': [maxOptions, nonExistingMaxOptions]
        })

        var minOptions = {}
        minOptions['min_' + e] = {
          $lte: query[e]
        }

        var nonExistingMinOptions = {}
        nonExistingMinOptions['min_' + e] = {
          $exists: false
        }

        constraints.push({
          '$or': [minOptions, nonExistingMinOptions]
        })

        delete query[e]
      }
    })
  if (constraints.length > 0) {
    req.data_query.where_statement['$and'] = constraints
  }

  req.app.get('mongodb')
    .collection('shippings')
    .find(req.data_query.where_statement)
    .toArray((err, shippings) => {
      if (err) {
        return next(err)
      }

      res.send({
        status: true,
        data: shippings
      })
    })
}
function prepareQuery (req, res, next) {
  req.data_query = {
    where_statement: {}
  }
  next()
}

function addWhereStatement (req, res, next) {
  var query = req.data_query

  query.where_statement = Utils.subsetInverse(req.query, Utils.OutputOperatorsList)

  // Now managing active/inactive resources as well as published unpublished
  if (req.client.access !== 'admin') {
    query.where_statement.$and = query.where_statement.$and || []

    // If the access level is not admin, then we display only active/published resources
    query.where_statement.$and.push({
      $or: [{
        active: true
      }, {
        active: {
          $exists: false
        }
      }]
    })

    query.where_statement.$and.push({
      $or: [{
        published: true
      }, {
        published: {
          $exists: false
        }
      }]
    })
  }

  // Making sure that, if the resource has an ownership ACL rule
  // the current user is authorized to work on the current resource
  if (req.client.access === 'user' && req.acl === '$owner') {
    query.where_statement.user_id = req.client.user_id
  }

  query.where_statement['application_id'] = req.client.application_id
  next()
}

Router.get('/cart/:cart_id',
  Middlewares.verifyClientAuthorization('shippings', 'list'),
  prepareQuery,
  addWhereStatement,
  handleZonesQuery,
  getShippingRulesByCart,
  populateCartItems,
  searchShippingsByCart
)

module.exports = Router
