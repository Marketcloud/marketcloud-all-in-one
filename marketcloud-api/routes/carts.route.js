var express = require('express')
var router = express.Router()
var Types = require('../models/types.js')
var Errors = require('../models/errors.js')
var Utils = require('../libs/util.js')
var Middlewares = require('../middlewares.js')

var Cart = require('../libs/cart.js')

/*
 * @param {Array<LineItem>} Array of cart line items (Not update)
 *
 * @returns {Number} the index of the first invalid line item found or -1.
 */
function indexOfInvalidLineItem (items) {
  var lastIndex = -1
  items.every(function (item, index) {
    var result = (
      Utils.hasAllKeys(item, ['product_id', 'quantity']) &&
      Utils.stringIsInteger(item.product_id) &&
      Utils.stringIsInteger(item.quantity) &&
      (typeof item.variant_id === 'undefined' || Utils.stringIsInteger(item.variant_id))
    )

    if (result === false) {
      lastIndex = index
    }

    return result
  })
  return lastIndex
}

/*
    @param cartItems Array<LineItems> An array of cart items
    @param inventoryItems Array<InventoryEntries> An array of inventory entries

    @return Boolean | String
 */
function validateLineItemsInventory (cartItems, inventoryItems) {
  var index = {}
  inventoryItems.forEach(function (i) {
    var key = i.product_id + '_' + (i.variant_id || '0')
    index[key] = i
  })
  for (var k = 0; k < cartItems.length; k++) {
    var item = cartItems[k]

    // Se non è nell'inventario, do errore
    if (!Utils.arrayHasObject(inventoryItems, item)) {
      return 'The requested product with id ' + item.product_id + ' and variant_id ' + item.variant_id + ' was not found in the inventory.'
    }

    var inventoryEntry = index[item.product_id + '_' + (item.variant_id || '0')]

    // Se non ho abbastanza in inventario do errore
    if (inventoryEntry.stock_type === 'track' && inventoryEntry.stock_level < item.quantity) {
      return 'The requested quantity for product with id ' + item.product_id + ' is not available'
    }

    // Se non è in stock do errore
    if (inventoryEntry.stock_type === 'status' && inventoryEntry.stock_status !== 'in_stock') {
      return 'The product with id ' + item.product_id + ' is not available (Out of stock).'
    }
  }

  return true
}

var cartController = {

  count: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.cartId)) {
      return next(new Errors.BadRequest('id must be integer'))
    }
    var db = req.app.get('mongodb')

    var query = {}
    query.where = {
      'application_id': req.client.application_id,
      'id': req.params.id
    }
    query.projection = {
      _id: 0,
      application_id: 0
    }

    db.collection('carts').findOne(query.where, query.projection, function (err, cart) {
      if (err) {
        next(err)
      } else {
        res.status(200).send({
          status: true,
          data: cart.items.length
        })
      }
    })
  },
  list: function (req, res, next) {
    var db = req.app.get('mongodb')

    var query = {}

    query.where = Utils.subsetInverse(req.query, Utils.OutputOperatorsList)
    query.where.application_id = req.client.application_id

    var fields = []

    if (req.query.hasOwnProperty('fields')) {
      fields = Utils.getFieldsList(String(req.query.fields))
    }

    fields['_id'] = 0
    fields['application_id'] = 0

    // Default skip and limit values
    query.skip = 0
    query.limit = 20

    // per_page query param tells how many result
    if (req.query.hasOwnProperty('per_page')) {
      if (!Utils.isInteger(req.query.per_page)) {
        return res.status(400).send({
          status: false,
          errors: [new Errors.BadRequest('per_page parameter must be an integer number.')]
        })
      }

      query.limit = Number(req.query.per_page)
    }

    // page query param tells which interval of produccts should be showed
    if (req.query.hasOwnProperty('page')) {
      if (!Utils.isInteger(req.query.page)) {
        return res.status(400).send({
          status: false,
          errors: [new Errors.BadRequest('page parameter must be an integer number.')]
        })
      }
      query.skip = (Number(req.query.page) - 1) * query.limit
    }
    query.application_id = req.client.application_id

    // Handle comparisons operators
    for (var k in query.where) {
      var attributeName

      if (k.indexOf('_gt') > 0 && k.charAt(0) === '$') {
        attributeName = k.substring(1, k.lastIndexOf('_gt'))

        if (!query.where[attributeName]) { query.where[attributeName] = {} }

        query.where[attributeName]['$gt'] = query.where[k]

        delete query.where[k]
        delete req.query[k]
      }

      if (k.indexOf('_lt') > 0 && k.charAt(0) === '$') {
        attributeName = k.substring(1, k.lastIndexOf('_lt'))

        if (!query.where[attributeName]) {
          query.where[attributeName] = {}
        }

        query.where[attributeName]['$lt'] = query.where[k]

        delete query.where[k]
        delete req.query[k]
      }
    }

    if (req.client.access === 'user') {
      // If it's a user who's asking for carts
      // we send them only thelast

      query.user_id = req.client.user_id
      if (req.client.access !== 'user') {
        return res.status('404').send({
          status: false,
          errors: [new Errors.NotFound('This cart belongs to another user')]
        })
      }

      query.projection = {
        _id: 0,
        application_id: 0
      }
      query.where = {
        application_id: req.client.application_id,
        user_id: req.client.user_id
      }

      db
        .collection('carts')
        .find(query.where, query.projection)
        .sort([
          ['_id', -1]
        ])
        .limit(1)
        .toArray(function (err, data) {
          if (err) {
            return next(err)
          }

          if (data.length === 0) {
            return res.status(404).send({
              status: false,
              errors: [new Errors.NotFound('The user has no carts.')]
            })
          } else {
            var cart = data[0]
            var productIds = cart.items.map(function (i) {
              return i.product_id
            })
            req.app.get('mongodb')
              .collection('products')
              .find({
                application_id: req.client.application_id,
                id: {
                  $in: productIds
                }
              }, query.projection)
              .toArray(function (err, products) {
                if (err) {
                  return next(err)
                }

                cart.items.forEach(function (i) {
                  // Augmenting products from catalogue
                  // with cart related properties (product_id, variant_id and quantity)
                  products.forEach(function (p) {
                    if (i.product_id === p.id) {
                      p.quantity = i.quantity
                      p.product_id = i.product_id
                      p.variant_id = i.variant_id || 0
                    }
                  })
                })

                cart.items = products

                res.send({
                  status: true,
                  data: cart
                })
              })
          }
        })
    } else {
      // Else, it's not an authenticated user
      // who is making the requests

      // TODO ADD SORTING
      // If the access is admin, then he can look for a particular user's cart
      query.projection = {
        _id: 0,
        application_id: 0
      }

      if (req.client.access === 'admin' && req.query.hasOwnProperty('user_id')) {
        query.where.user_id = req.query.user_id
      }

      db
        .collection('carts')
        .find(query.where, fields)
        .skip(query.skip)
        .limit(query.limit)
        .sort([
          ['_id', -1]
        ])
        .toArray(function (err, data) {
          if (err) {
            return next(err)
          }

          data = data.map(function (c) {
            delete c._id
            return c
          })

          req.carts = data
          next()
        })
    }
  },

  populateCartListItems: function (req, res, next) {
    // This middleware takes the list of line items inside every cart
    // fetches the correlated product information and expands line items with it
    // Unlike populateCartItems, this middleware DOES NOT remove no-longer existing items
    var carts = req.carts

    var ids = []
    carts.forEach(function (cart) {
      if (cart.hasOwnProperty('items')) {
        ids = ids.concat(cart.items.map(i => i.product_id))
      }
    })

    // Lets be sure that each product gets fetched only once
    var temporaryProductIdsMap = {}
    ids = ids.filter(id => {
      if (temporaryProductIdsMap.hasOwnProperty(id)) {
        return false
      }
      temporaryProductIdsMap[id] = true
      return true
    })

    var query = {}
    query.where = {
      application_id: req.client.application_id,
      id: {
        $in: ids
      }
    }
    query.projection = {
      _id: 0,
      application_id: 0
    }

    req.app.get('mongodb')
      .collection('products')
      .find(query.where, query.projection)
      .toArray(function (err, dbproducts) {
        if (err) {
          return next(err)
        }

        // building hash table of fetcheed products
        var productsMap = {}
        dbproducts.forEach(p => {
          productsMap[p.id] = p
        })

        // Expanding line items
        carts.forEach(cart => {
          if (cart.hasOwnProperty('items')) {
            cart.items = cart.items.map(item => {
              item = Utils.augment(item, productsMap[item.product_id])

              if (item.hasOwnProperty('variants') && Array.isArray('variants')) {
                item.variants.forEach(function (v) {
                  if (v.id === item.variant_id) {
                    item.variant = v
                    delete item['variants']
                  }
                })
              }

              return item
            })
          }
        })

        req.toSend = {
          status: true,
          data: carts
        }
        return next()
      })
  },
  populateCartItems: function (req, res, next) {
    // This middleware takes the list of line items inside the cart
    // fetches the correlated product information and expands line items with it
    // As final step, it removes from caart those items that no longer exist.

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

    var howManyLineItems = productIds.length

    req.app.get('mongodb')
      .collection('products')
      .find(query.where, query.projection)
      .toArray(function (err, dbproducts) {
        var products = dbproducts
        if (err) {
          next(err)
        } else {
          var toSend = []
          var productsMap = {}
          products.forEach(function (p) {
            productsMap[p.id] = p
          })

          cart.items.forEach(function (i) {
            // Può capitare che un productsMap[i.product_id] sia undefined
            // questo perchè magari un utente ha nel carrello un prodotto eliminato
            // dallo store, quindi in tal caso, il carrello è in uno stato inconsistente
            // Per ovviare al problema, devo fare in modo che questo elemento venga rimosso dal carrello
            // Per ora lo skippiamo semplicemente
            if (!Utils.hasValue(productsMap[i.product_id])) {
              return
            }

            var expandedLineItem = JSON.parse(JSON.stringify(productsMap[i.product_id]))

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

            toSend.push(expandedLineItem)
          })

          // Now if some products were deleted , we must remove them
          // from the cart.
          cart.items = toSend

          // Here we make sure that items in cart are available, if not we remove them
          if (cart.items.length < howManyLineItems) {
            // THen some product in the cart is no longer in the app
            // because it was DELETED (not about avaliability)
            var availableIds = cart.items.map(i => i.product_id)

            var deletedItems = productIds.filter(id => {
              return availableIds.indexOf(id) < 0
            })

            req.app.get('mongodb')
              .collection('carts')
              .update({
                id: req.cart.id
              }, {
                $pull: {
                  items: {
                    product_id: {
                      $in: deletedItems
                    }
                  }
                }
              },
              function (err) {
                if (err) {
                  return next(err)
                }

                console.log('[NOTICE] Some items were no longer available in the app, so i removed them from the cart.')

                req.toSend = {
                  status: true,
                  data: cart
                }
                return next()
              })
          } else {
            req.toSend = {
              status: true,
              data: cart
            }
            return next()
          }
        }
      })
  },
  sendToClient: function (req, res, next) {
    res.send(req.toSend)
  },
  applyComputedProperties: function (req, res, next) {
    var payload = req.toSend
    var currencyCode = Utils.getRequestedCurrency(req) || req.client.application.currency_code

    var applyProperties = function (cart) {
      cart.items = cart.items.map(function (lineItem) {
        return Utils.attachDisplayPrices(lineItem, currencyCode)
      })

      cart.items_total = Utils.getTotalItemsValue(cart.items)
      cart.total = cart.items_total
      cart.total_weight = Utils.getTotalItemsWeight(cart.items)

      if (cart.coupon) {
        cart.coupon_discount = Utils.getTotalCouponDiscount(cart.coupon, cart.items)

        cart.total -= cart.coupon_discount
      }

      if (cart.total < 0) {
        cart.total = 0
      }

      cart.display_total = String(cart.total) + ' ' + currencyCode
      cart.display_items_total = String(cart.items_total) + ' ' + currencyCode
      // add items total
      return cart
    }

    if (Array.isArray(payload.data)) {
      payload.data = payload.data.map(applyProperties)
    } else {
      payload.data = applyProperties(payload.data)
    }

    return next()
  },
  applyTaxes: function (req, res, next) {
    if (req.client.application.show_prices_plus_taxes !== true) { return next() }

    var payload = req.toSend

    // var taxes = req.toSend._embedded.taxes;

    var taxIdsToFetch = []
    // Fetching taxes
    if (Array.isArray(payload.data)) {
      payload.data.forEach(function (cart) {
        cart.items.forEach(function (item) {
          if (item.hasOwnProperty('tax_id')) { taxIdsToFetch.push(item.tax_id) }
        })
      })
    } else {
      payload.data.items.forEach(function (item) {
        if (item.hasOwnProperty('tax_id')) { taxIdsToFetch.push(item.tax_id) }
      })
    }

    var mongodb = req.app.get('mongodb')
    mongodb.collection('taxes')
      .find({
        application_id: req.client.application_id,
        id: {
          $in: taxIdsToFetch
        }
      }, {_id: 0})
      .toArray(function (err, taxes) {
        if (err) { return next(err) }

        if (Array.isArray(payload.data)) {
          payload.data.forEach(function (cart) {
            cart.items = cart.items.map(function (item) {
              return Utils.applyTaxesToProduct(item, req.client.application, taxes)
            })
          })
        } else {
          payload.data.items.forEach(function (item) {
            item = Utils.applyTaxesToProduct(item, req.client.application, taxes)
          })
        }

        next()
      })
  },
  convertCartCurrency: function (req, res, next) {
    var payload = req.toSend

    var requestedCurrency = Utils.getRequestedCurrency(req)

    if (!requestedCurrency) {
      return next()
    }

    // the requested currency's symbol, like USD or EUR

    var currencyRate = Utils.getCurrencyRate(requestedCurrency, req.client.application)

    if (currencyRate === null) {
      return next(new Errors.BadRequest('Cannot use currency ' + requestedCurrency + '. Add it first as supported currency in your store\'s admin panel.'))
    }

    if (Array.isArray(payload.data)) {
      payload.data = payload.data.map(cart => {
        return Utils.convertCartPrices(cart, requestedCurrency, currencyRate)
      })
    } else {
      payload.data = Utils.convertCartPrices(payload.data, requestedCurrency, currencyRate)
    }

    return next()
  },
  getById: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.cartId)) {
      return next(new Errors.BadRequest('id must be integer'))
    }
    var db = req.app.get('mongodb')

    var fields = []
    if (req.query.hasOwnProperty('fields')) {
      fields = Utils.getFieldsList(String(req.query.fields))
    }

    fields['_id'] = 0
    fields['application_id'] = 0

    var cartQuery = {
      'id': Number(req.params.cartId),
      'application_id': req.client.application_id
    }
    // If the client is an authenticated user, then it can only
    // read its carts
    if (req.client.access === 'user') {
      cartQuery['$or'] = [{
        user_id: req.client.user_id
      }, {
        user_id: {
          $exists: false
        }
      }]
    }

    // If the client is not authenticated, then he can only read
    // public carts. This should be fixed using a token
    if (req.client.access === 'public') {
      cartQuery.user_id = {
        '$exists': false
      }
    }
    db
      .collection('carts')
      .findOne(cartQuery, fields, function (err, cart) {
        if (err) {
          next(err)
        } else if (cart === null) {
          return next(new Errors.NotFound('Cannot find cart with id ' + cartQuery.id))
        } else {
          delete cart._id

          req.cart = cart
          next()
        }
      })
  },

  create: function (req, res, next) {
    var sequelize = req.app.get('sequelize')
    var mongodb = req.app.get('mongodb')

    var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')

    if (
      req.body.hasOwnProperty('items') &&
      !(req.body.items instanceof Array)
    ) {
      return next(new Errors.BadRequest('The required field "items" must be array'))
    }

    // Validating only accepted parameters we don't want side effects

    // Validating single item instances
    // Must have this structure: {product_id : 123, quantity : 123}
    // But can also be {product_id:123,quantity:7,variant_id:1}
    if (req.body.hasOwnProperty('items') && req.body.items.length > 0) {
      var indexInvalidLineItem = indexOfInvalidLineItem(req.body.items)
      if (indexInvalidLineItem > -1) {
        return next(new Errors.BadRequest('Malformed cart entry found: ' + JSON.stringify(req.body.items[indexInvalidLineItem], null, 2)))
      }

      req.body.items = req.body.items.map(function (lineItem) {
        lineItem.product_id = Number(lineItem.product_id)
        lineItem.quantity = Number(lineItem.quantity)

        if (lineItem.variant_id) {
          lineItem.variant_id = Number(lineItem.variant_id)
        } else {
          lineItem.variant_id = 0
        }

        return lineItem
      })
    }

    // Actually generates an id and puts stuff in the cart
    // it also save it into mongodb
    var createTheCart = function () {
      var items = req.body.items || []

      items = items.map(function (i) {
        if (!i.variant_id) {
          i.variant_id = 0
        }
        return {
          product_id: i.product_id,
          variant_id: i.variant_id,
          quantity: i.quantity
        }
      })

      var cart = {
        created_at: (new Date()).toISOString(),
        application_id: req.client.application_id,
        items: items,
        status: req.body.status || 'open'
      }

      // If the token is a user, then this cart is bound to that user
      if (req.client.access === 'user') {
        cart.user_id = req.client.user_id
      }

      if (req.client.access === 'admin' && req.body.hasOwnProperty('user_id')) {
        cart.user_id = req.body.user_id
      }

      sequelize
        .query(Utils.Queries.getNewUID, {
          type: sequelize.QueryTypes.SELECT
        })
        .then(function (id) {
          cart.id = id[1]['0']['LAST_INSERT_ID()']
          mongodb.collection('carts')
            .insert(cart, function (err) {
              if (err) {
                return next(err)
              } else {
                req.cart = Utils.subsetInverse(cart, ['_id'])
                return next()
              }
            })
        })
        .catch(Utils.getSequelizeErrorHandler(req, res, next))
    }

    if (!req.body.hasOwnProperty('items') || req.body.items.length === 0) {
      createTheCart()
      return
    }

    var itemsInCart = req.body.items.map(function (i) {
      return {
        product_id: i.product_id,
        variant_id: i.variant_id || 0,
        application_id: req.client.application_id
      }
    })

    Inventory.findAll({
      'where': {
        $or: itemsInCart
      }
    })
      .then(function (itemsInInventory) {
        itemsInInventory = itemsInInventory.map(function (e) {
          return e.toJSON()
        })

        var lineItemsValidation = validateLineItemsInventory(itemsInCart, itemsInInventory)

        if (lineItemsValidation !== true) {
          return res.status(400).send({
            status: false,
            errors: [new Errors.BadRequest(lineItemsValidation)]
          })
        }

        var cart = new Cart(req.body)
        var cartValidation = cart.validateAgainstInventory(itemsInInventory)

        if (!cartValidation.valid) {
          return res.status(400).send({
            status: false,
            errors: [new Errors.BadRequest(cartValidation.error)]
          })
        }

        createTheCart()
      })
      .catch(Utils.getSequelizeErrorHandler(req, res, next))
  },

  delete: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.cartId)) {
      return next(new Errors.BadRequest('id must be integer'))
    }

    var query = {
      application_id: req.client.application_id,
      id: Number(req.params.cartId)
    }

    // Protecting other users carts
    if (req.client.access === 'user') {
      query.user_id = req.client.user_id
    }

    req.app.get('mongodb')
      .collection('carts')
      .remove(query, function (err) {
        if (err) {
          next(err)
        } else {
          res.send({
            status: true
          })
        }
      })
  },

  addCoupon: function (req, res, next) {
    if (!req.body.hasOwnProperty('coupon_code')) {
      return next(new Errors.BadRequest('Missing required property coupon_code'))
    }

    req.app.get('mongodb')
      .collection('coupons')
      .findOne({
        application_id: req.client.application_id,
        code: req.body.coupon_code,
        active: true
      }, {
        fields: {
          _id: 0
        }
      }, function (err, couponData) {
        if (err) {
          return next(err)
        }

        if (couponData === null) {
          return next(new Errors.NotFound('Unable to find coupon with code ' + req.body.coupon_code))
        }

        req.app.get('mongodb')
          .collection('carts')
          .findAndModify({
            id: Number(req.params.cartId),
            application_id: req.client.application_id
          }, [], {
            $set: {
              coupon: couponData
            }
          }, {
            'new': true
          }, function (err, cart) {
            if (err) {
              return next(err)
            }

            if (cart.value === null) {
              return next(new Errors.BadRequest('Unable to find cart with id ' + req.params.cartId))
            }

            req.cart = cart.value
            return next()
          })
      })
  },

  validateCartUpdate: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.cartId)) {
      return next(new Errors.BadRequest('id must be integer'))
    }

    var cartUpdate = req.body

    if (cartUpdate instanceof Array) {
      cartUpdate = cartUpdate[0]
    }

    var validation = Types.CartUpdate.validate(cartUpdate)

    if (validation.valid === false) {
      var error = new Errors.BadRequest()
      Utils.augment(error, validation)
      return next(error)
    }

    cartUpdate.items.forEach(function (item) {
      item.product_id = Number(item.product_id)

      if (item.quantity) {
        item.quantity = Number(item.quantity)
      }

      if (item.variant_id) {
        item.variant_id = Number(item.variant_id)
      }
    })

    // Additional validation for "add" and "update" ops
    var lastCheckedItem = null

    function lineItemIsInvalid (lineItem) {
      lastCheckedItem = lineItem

      if (Types.CartUpdateEntry.validate(lineItem).valid === false) {
        return true
      }

      if ((cartUpdate.op === 'add' || cartUpdate.op === 'update')) {
        if (!(lineItem.hasOwnProperty('quantity') && (Number(lineItem.quantity) === lineItem.quantity && lineItem.quantity % 1 === 0))) {
          return true
        }
      }

      if (lineItem.hasOwnProperty('variant_id') && typeof lineItem.product_id !== 'number') {
        return true
      }
    }

    if (cartUpdate.items.some(lineItemIsInvalid)) {
      return next(new Errors.BadRequest('The cart update contains an invalid entry: ' + JSON.stringify(lastCheckedItem)))
    }

    return next()
  },
  updateCartContent: function (req, res, next) {
    var cartId = Number(req.params.cartId)
    // Must have product_id and quantity in body

    var cartUpdate = req.body
    // Validating the patch
    //

    if (cartUpdate instanceof Array) {
      cartUpdate = cartUpdate[0]
    }

    // Loading services
    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')
    var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')

    var query = {}
    query.projection = {
      _id: 0,
      application_id: 0
    }
    // Adjusting the query
    var cartQuery = {
      'id': cartId,
      'application_id': req.client.application_id
    }
    // If the client is an authenticated user, then it can only
    // read its carts

    if (req.client.access === 'user') {
      cartQuery['$or'] = [{
        user_id: req.client.user_id
      }, {
        user_id: {
          $exists: false
        }
      }]
    }

    // If the client is not authenticated, then he can only read
    // public carts. This should be fixed using a token
    if (req.client.access === 'public') {
      cartQuery.user_id = {
        '$exists': false
      }
    }

    // Retrieving the current cart
    mongodb.collection('carts')
      .findOne(cartQuery, query.projection, function (err, theCart) {
        if (err) {
          return next(err)
        }

        if (theCart === null) {
          return next(new Errors.NotFound('Cannot find cart with id ' + cartQuery.id))
        } else {
          // Creating the cart object from db data
          var cartObject = new Cart(theCart)

          cartObject.patch(cartUpdate)
          // Building the iinventory query
          var inventoryQuery = cartObject.items.map(function (i) {
            return {
              product_id: i.product_id,
              variant_id: i.variant_id || 0,
              application_id: req.client.application_id
            }
          })

          // Querying the inventory
          Inventory.findAll({
            'where': {
              $or: inventoryQuery
            }
          })
            .then(function (inventory) {
              // Check if the added products really exists
              inventory = inventory.map(function (e) {
                return e.toJSON()
              })
              // Validating the cart contents with inventory informations
              //
              var cartValidation = cartObject.validateAgainstInventory(inventory)

              // If invalid, notify
              if (!cartValidation.valid) {
                return res.status(400).send({
                  status: false,
                  errors: [new Errors.BadRequest(cartValidation.error)]
                })
              }

              // Else, let's update the cart
              return mongodb.collection('carts')
                .update(
                  cartQuery, {
                    $set: {
                      items: cartObject.items
                    }
                  },
                  function (err, result) {
                    if (err) {
                      return next(err)
                    }

                    req.cart = cartObject.getData()
                    next()
                    // res.send({status:true, data : cartObject.getData()})
                  })
            })
            .catch(Utils.getSequelizeErrorHandler(req, res, next))
        }
      })
  },

  /*
      As opposed to updateCartContent, this updates the cart content without a single op
  */
  updateCart: function (req, res, next) {
    var cartId = Number(req.params.cartId)
    // Must have product_id and quantity in body

    var cartUpdate = req.body
    // Validating the patch
    //

    if (cartUpdate instanceof Array) {
      cartUpdate = cartUpdate[0]
    }

    // Loading services
    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')
    var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')

    var query = {}
    query.projection = {
      _id: 0,
      application_id: 0
    }
    // Adjusting the query
    var cartQuery = {
      'id': cartId,
      'application_id': req.client.application_id
    }
    // If the client is an authenticated user, then it can only
    // read its carts

    if (req.client.access === 'user') {
      cartQuery['$or'] = [{
        user_id: req.client.user_id
      }, {
        user_id: {
          $exists: false
        }
      }]
    }

    // If the client is not authenticated, then he can only read
    // public carts. This should be fixed using a token
    if (req.client.access === 'public') {
      cartQuery.user_id = {
        '$exists': false
      }
    }

    // Retrieving the current cart
    mongodb.collection('carts')
      .findOne(cartQuery, query.projection, function (err, theCart) {
        if (err) {
          return next(err)
        }

        if (theCart === null) {
          return next(new Errors.NotFound('Cannot find cart with id ' + cartQuery.id))
        } else {
          // Applying the update
          for (var k in req.body) {
            if (req.body[k] === null) {
              delete theCart[k]
            } else {
              theCart[k] = req.body[k]
            }
          }

          // Must validate the cart
          var validation = Types.Cart.validate(theCart)

          if (validation.valid === false) {
            var _err = new Errors.BadRequest()
            return next(Utils.augment(_err, validation))
          }

          var indexInvalidLineItem = indexOfInvalidLineItem(theCart.items)
          if (indexInvalidLineItem > -1) {
            return next(new Errors.BadRequest('Malformed cart entry found: ' + JSON.stringify(theCart.items[indexInvalidLineItem])))
          }

          var inventoryQuery = theCart.items.map(function (i) {
            return {
              product_id: i.product_id,
              variant_id: i.variant_id || 0,
              application_id: req.client.application_id
            }
          })

          var cartObject = new Cart(theCart)
          // Querying the inventory
          Inventory.findAll({
            'where': {
              $or: inventoryQuery
            }
          })
            .then(function (inventory) {
              // Check if the added products really exists
              inventory = inventory.map(function (e) {
                return e.toJSON()
              })
              // Validating the cart contents with inventory informations
              //
              var cartValidation = cartObject.validateAgainstInventory(inventory)

              // If invalid, notify
              if (!cartValidation.valid) {
                return res.status(400).send({
                  status: false,
                  errors: [new Errors.BadRequest(cartValidation.error)]
                })
              }

              // Else, let's update the cart
              return mongodb.collection('carts')
                .update(
                  cartQuery, {
                    $set: theCart
                  },
                  function (err, result) {
                    if (err) {
                      return next(err)
                    }

                    req.cart = theCart
                    next()
                  })
            })
            .catch(Utils.getSequelizeErrorHandler(req, res, next))
        }
      })
  }

}

// Transform put/patch requests
var optionsToVariantId = function (req, res, next) {
  // Piccolo tweak di ottimizzazione, se nessuno ha varianti, non prendo per nulla ,l'inv
  if (req.body instanceof Array) {
    req.body = req.body[0]
  }

  if (!req.body.hasOwnProperty('items')) {
    return next(new Errors.BadRequest('Missing required parameter "items".'))
  }

  var productIdsToFetch = req.body.items
    .filter(x => x.hasOwnProperty('options'))
    .map(x => {
      return x.product_id
    })

  req.app.get('mongodb')
    .collection('products')
    .find({
      application_id: req.client.application_id,
      id: {
        $in: productIdsToFetch
      }
    })
    .toArray(function (err, products) {
      if (err) {
        return next(err)
      }

      req.body.items.forEach(function (itemFromCart) {
        products.forEach(function (itemFromDb) {
          if (itemFromDb.id !== itemFromCart.product_id) {
            return
          }

          // Se mi chiedi delle option di un prodotto con no varianti
          // è un errore
          if (!Utils.hasVariants(itemFromDb)) {
            return next(new Errors.BadRequest('Product with id ' + itemFromDb.id + ' has no variants, but some options were requested.'))
          }

          // Check sulle variant definition per vedere s eme la hai chieste sbagliate
          // TODO?

          // ora cerco la variante giusta
          var wantedVariantId = null

          itemFromDb.variants.forEach(function (v) {
            // Per ogni variante, controllo quella con le opzioni uguali
            var variantMatch = true

            for (var option in itemFromCart.options) {
              if (itemFromCart.options[option] !== v[option]) {
                variantMatch = false
              }
            }

            if (variantMatch === true) {
              wantedVariantId = v.id
            }
          })

          // Ho trovato la variante che corrisponde a quelle opzioni
          // QUindi rimuovo options e scrivo l'id corretto così che
          // la rotta possa processarla
          //
          itemFromCart.variant_id = wantedVariantId
          delete itemFromCart['options']
        })
      })
      next()
    })
}

/*
 *   GET api.marketcloud.it/v0/carts
 */
router.get('/',
  Middlewares.verifyClientAuthorization('carts', 'list'),
  cartController.list,
  cartController.populateCartListItems,
  cartController.applyTaxes,
  cartController.convertCartCurrency,
  cartController.applyComputedProperties,
  cartController.sendToClient)

/*
 *   GET api.marketcloud.it/v0/carts/:cardId
 */
router.get('/:cartId',
  Middlewares.verifyClientAuthorization('carts', 'getById'),
  cartController.getById,
  cartController.populateCartItems,
  cartController.applyTaxes,
  cartController.convertCartCurrency,
  cartController.applyComputedProperties,
  cartController.sendToClient)

/*
 *   POST api.marketcloud.it/v0/carts
 */
router.post('/',
  Middlewares.verifyClientAuthorization('carts', 'create'),
  cartController.create,
  cartController.populateCartItems,
  cartController.applyTaxes,
  cartController.applyComputedProperties,
  cartController.sendToClient)

/*
 *   DELETE api.marketcloud.it/v0/carts/:cardId
 */
router.delete('/:cartId',
  Middlewares.verifyClientAuthorization('carts', 'delete'),
  cartController.delete)

/*
 *   PUT api.marketcloud.it/v0/carts/:cardId
 */
router.put('/:cartId',
  Middlewares.verifyClientAuthorization('carts', 'update'),
  cartController.updateCart,
  cartController.populateCartItems,
  cartController.applyTaxes,
  cartController.applyComputedProperties,
  cartController.sendToClient)

/*
 *   PATCH api.marketcloud.it/v0/carts/:cardId
 */
router.patch('/:cartId',
  cartController.validateCartUpdate,
  optionsToVariantId,
  Middlewares.verifyClientAuthorization('carts', 'update'),
  cartController.updateCartContent,
  cartController.populateCartItems,
  cartController.applyTaxes,
  cartController.applyComputedProperties,
  cartController.sendToClient)

/*
 *   GET api.marketcloud.it/v0/carts/:cardId/count
 */
router.get('/:cartId/count',
  Middlewares.verifyClientAuthorization('carts', 'count'),
  cartController.count)

/*
 *   PUT api.marketcloud.it/v0/carts/:cardId/coupon
 */
router.put('/:cartId/coupon',
  Middlewares.verifyClientAuthorization('carts', 'update'),
  cartController.addCoupon,
  cartController.populateCartItems,
  cartController.applyTaxes,
  cartController.applyComputedProperties,
  cartController.sendToClient)

module.exports = router
