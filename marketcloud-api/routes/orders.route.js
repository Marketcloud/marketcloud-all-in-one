/* exported Router,orderController */
'use strict'

var Express = require('express'),
  Router = Express.Router(),
  Types = require('../models/types.js'),
  Errors = require('../models/errors.js'),
  Utils = require('../libs/util.js'),
  Middlewares = require('../middlewares.js'),
  LineItems = require('../libs/line_items.js'),
  OrderModel = require('../libs/order.js'),
  Promise = require('bluebird'),
  Currencies = require('../libs/currencies.js')

const Attachments = require('../libs/templatetopdf')
const azure = require('azure-storage')
const config = require('../config/default.js')
var blobService = azure.createBlobService(config.storage.azureStorageAccountName, config.storage.azureStorageAccountAccessKey)

// This values are used to filter the query
var attributes = [
  'id', // Bigint
  'products',
  'billing_address_id',
  'shipping_address_id',
  'user_id',
  'item_total', // without shipment
  'display_item_total',
  'total', // with shipment
  'display_total',
  'status',
  'shipment_id',
  'currency_id'
]

/*
    Things that affects order total

    items
    shipping
    taxes
    payment_method
    promotion
    coupon
*/

var orderController = {

  list: function (req, res, next) {
    var sequelize = req.app.get('sequelize')
    var mongodb = req.app.get('mongodb')

    // Parsing the query object to "revive" integers from strings
    // This object contains filtering options as well as pagination etc.
    var parsed_query = Utils.parseIntegersInObject(req.query)

    // This object will be used to build the SEQUELIZE query
    var query = {
      where_statement: {}
    }

    // Removing operators from the "where part of the query"
    query.where_statement = Utils.subsetInverse(req.query, Utils.OutputOperatorsList)

    // Setting the scope
    query.where_statement.application_id = req.client.application_id

    var operations = Utils.OutputOperatorsList,
      fields = [],
      mongo_fields = {}

    query.projection = {
      _id: 0,
      application_id: 0
    }

    if (req.query.fields) {
      fields = Utils.getFieldsList(String(req.query.fields))

      if (fields.length > 0) {
        // Let's reset the projection first since we cant mix 0 and 1
        query.projection = {}

        // then lets add which fields we want
        fields.forEach(function (f) {
          query.projection[f] = 1
        })
      }
    }

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

    // Checking if the auth level is user
    if (req.client.access === 'user') {
      // Then he can see only his data
      query.where_statement['user.id'] = req.client.user_id
    }

    query.sort = Utils.getMongoSorting(req)

    // Rewriting skip as offset for sequelize
    query.offset = query.skip

    if (req.query.hasOwnProperty('$has')) {
      req.query.$has
        .split(',')
        .forEach((k) => {
          query.where_statement[k] = {
            $exists: true
          }
        })
      delete query.where_statement['$has']
    }

    if (req.query.hasOwnProperty('$has_not')) {
      req.query.$has.split(',')
        .forEach((k) => {
          query.where_statement[k] = {
            $exists: false
          }
        })
      delete query.where_statement['$has_not']
    }

    // Checking for comparisons $<attr_name>_gt and $<attr_name>_lt
    for (var k in query.where_statement) {
      if (k.indexOf('_gt') > 0 && k.charAt(0) === '$') {
        var attr_name = k.substring(1, k.lastIndexOf('_gt'))

        if (!query.where_statement[attr_name]) {
          query.where_statement[attr_name] = {}
        }

        query.where_statement[attr_name]['$gt'] = query.where_statement[k]

        delete query.where_statement[k]
        delete req.query[k]
      }

      if (k.indexOf('_lt') > 0 && k.charAt(0) === '$') {
        var attr_name = k.substring(1, k.lastIndexOf('_lt'))

        if (!query.where_statement[attr_name]) {
          query.where_statement[attr_name] = {}
        }

        query.where_statement[attr_name]['$lt'] = query.where_statement[k]

        delete query.where_statement[k]
        delete req.query[k]
      }
    }

    mongodb.collection('orders')
      .find(query.where_statement, query.projection)
      .count(function (err, count) {
        mongodb.collection('orders')
          .find(query.where_statement, query.projection)
          .sort(query.sort)
          .skip(query.skip)
          .limit(query.limit)
          .toArray(function (err, data) {
            if (err) {
              next(err)
            } else {
              if (req.client.hasOwnProperty('application')) {
                data.forEach(order => {
                  delete order['_id']
                  // We need to check if properties exists because of a possible projection.
                  order = Utils.attachDisplayTotals(order)
                })
              }

              var pagination = Utils.getPagination({
                count: count,
                limit: query.limit,
                skip: query.skip,
                req_query: req.query,
                resource: 'orders'
              })

              var requestedCurrency = Utils.getRequestedCurrency(req)
              if (requestedCurrency) {
                var currencyRate = Utils.getCurrencyRate(requestedCurrency, req.client.application)

                if (currencyRate === null) {
                  return next(new Errors.BadRequest('Cannot use currency ' + requestedCurrency + '. Add it first as supported currency in your store\'s admin panel.'))
                }

                data = data.map(function (order) {
                  return Utils.convertOrderPrices(order, requestedCurrency, currencyRate)
                })
              }

              var response = Utils.augment({
                status: true,
                data: data
              }, pagination)

              res.send(response)
            }
          })
      })
  },
  getById: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.orderId)) {
      next(new Errors.BadRequest('id must be integer'))
      return
    }
    var operations = Utils.OutputOperatorsList

    var query = {}
    var fields = []
    if (req.query.hasOwnProperty('fields')) {
      fields = Utils.getFieldsList(String(req.query.fields))
      if (Utils.whitelistArray(fields, attributes) !== true) {
        res.send(400, {
          status: false,
          errors: [new Errors.BadRequest('Unkown field ' + Utils.whitelistArray(fields, operations))]
        })
        return
      }

      if (fields.length > 0) {
        query.fields = {}
        fields.forEach(function (f) {
          query.fields[f] = true
        })
      } else {
        res.send(400, {
          status: false,
          errors: [new Errors.BadRequest('Unkown field ' + Utils.whitelistArray(fields, operations))]
        })
        return
      }
    }

    // var redis = req.app.get('redis');
    var sequelize = req.app.get('sequelize')
    var mongodb = req.app.get('mongodb')

    query.where = {
      id: Number(req.params.orderId),
      application_id: req.client.application_id
    }

    // Checking if the auth level is user
    if (req.client.access === 'user') {
      // Then he can see only his data
      query.where['user.id'] = req.client.user_id
    }
    query.projection = {
      _id: 0,
      application_id: 0
    }
    req.app.get('mongodb')
      .collection('orders')
      .findOne(query.where, query.projection, function (err, order) {
        if (err) {
          return next(err)
        }

        if (order === null) {
          res.send(404, {
            status: false,
            errors: [new Errors.NotFound()]
          })
          return
        }

        order = Utils.attachDisplayTotals(order)

        var requestedCurrency = Utils.getRequestedCurrency(req)
        if (requestedCurrency) {
          var currencyRate = Utils.getCurrencyRate(requestedCurrency, req.client.application)

          if (currencyRate === null) {
            return next(new Errors.BadRequest('Cannot use currency ' + requestedCurrency + '. Add it first as supported currency in your store\'s admin panel.'))
          }

          order = Utils.convertOrderPrices(order, requestedCurrency, currencyRate)
        }

        res.send({
          status: true,
          data: order
        })
      })
  },

  prepareOrderCreation: function (req, res, next) {
    var sequelize = req.app.get('sequelize'),
      mongodb = req.app.get('mongodb'),
      newOrder = req.body
      // If no billing address is provided, we take it from the shipping
    if (!newOrder.hasOwnProperty('billing_address') && !newOrder.hasOwnProperty('billing_address_id')) {
      if (newOrder.hasOwnProperty('shipping_address')) {
        newOrder.billing_address = newOrder.shipping_address
      }

      if (newOrder.hasOwnProperty('shipping_address_id')) {
        newOrder.billing_address_id = newOrder.shipping_address_id
      }
    }

    // vice-versa if no shipping address is provided, we take it from the billing
    if (!newOrder.hasOwnProperty('shipping_address') && !newOrder.hasOwnProperty('shipping_address_id')) {
      if (newOrder.hasOwnProperty('billing_address')) {
        newOrder.shipping_address = newOrder.billing_address
      }

      if (newOrder.hasOwnProperty('billing_address_id')) {
        newOrder.shipping_address_id = newOrder.billing_address_id
      }
    }

    if (newOrder.hasOwnProperty('items')) {
      if (!Array.isArray(newOrder.items)) {
        return next(new Errors.BadRequest('"items" must be an array of line items.'))
      }

      // Validating line items provided with the order
      var validation = null
      for (var i = 0; i < newOrder.items.length; i++) {
        validation = Types.CartEntry.validate(newOrder.items[i])
        if (validation.valid === false) {
          break
        }
      }

      if (validation.valid === false) {
        var _err = Utils.augment(new Errors.BadRequest(), validation)
        return next(_err)
      }
    }

    if (!newOrder.hasOwnProperty('items') && !newOrder.hasOwnProperty('cart_id')) {
      return next(new Errors.BadRequest('Both "cart_id" and "items" properties are missing. Please provide one of them.'))
    }

    // If it has no one of them, validation will interrupt and send 400

    // This is important because, the orders.js class
    // relies on the fact that we pass the right order object to the constructor

    var order = new OrderModel(newOrder, {
      sequelize: req.app.get('sequelize'),
      mongodb: req.app.get('mongodb'),
      client: req.client
    })

    var promises = {
      items: order.loadItems(),
      shipping_address: order.loadShippingAddress(),
      billing_address: order.loadBillingAddress()
    }

    // Loading the shipping method
    if (req.body.hasOwnProperty('shipping_id')) {
      promises.shipping_method = order.loadShippingMethod()
    }

    // Loading the taxes
    if (req.client.application.tax_type !== 'nothing') {
      promises.taxes = order.loadTaxes()
    }

    // Loading the promotion
    if (req.body.hasOwnProperty('promotion_id')) {
      promises.promotion = order.loadPromotion()
    } else {
      // If a promotion wasnt selected during the order, we get the appliable one with the highest priority
      promises.promotions = order.loadPromotions()
    }

    // Loading the coupon
    if (req.body.hasOwnProperty('coupon_code')) {
      promises.coupon = order.loadCoupon()
    }

    // Loading the coupon
    if (req.body.hasOwnProperty('payment_method_id')) {
      promises.payment_method = order.loadPaymentMethod()
    }

    if (req.client.hasOwnProperty('user_id')) {
      order.user_id = req.client.user_id
      promises['user'] = order.loadUserData()
    }

    if (req.client.access === 'admin' && newOrder.user_id) {
      promises['user'] = order.loadUserData()
    }

    var validation = order.validate()

    if (validation.valid === false) {
      var err = Errors.BadRequest(validation.message)
      Utils.augment(err, validation)
      return next(err)
    }

    // If an array of items is provided it must be validated
    // Not the case when a cart_id id provided. In which case, the items are already validated
    if (newOrder.hasOwnProperty('items')) {
      if (newOrder.items.length <= 0) {
        return next(new Errors.BadRequest('Cannot create order with no items.'))
      }

      var line_items = new LineItems(newOrder.items, {
        sequelize: req.app.get('sequelize'),
        mongodb: req.app.get('mongodb'),
        application_id: req.client.application_id
      })
      promises['items_validation'] = line_items.validate()
    }

    // Order data is stored in base currency
    // the conversion information is stored in the currency object
    if (newOrder.hasOwnProperty('currency')) {
      // We make sure the currency is supported by the app

      if (req.client.application.currencies === null && newOrder.currency !== req.client.application.currency_code) {
        return next(new Errors.BadRequest('Cannot use currency ' + newOrder.currency + '. Add it first as supported currency in your store\'s admin panel.'))
      }

      var availableCurrencies = JSON.parse(req.client.application.currencies)

      var wantedCurrency = availableCurrencies.filter(function (currency) {
        return currency.code === newOrder.currency
      })

      // if the lenght of the result is 0, then we didnt find the currency
      if (wantedCurrency.length === 0) {
        return new Errors.BadRequest('Cannot use currency ' + newOrder.currency + '. Add it first as supported currency in your store\'s admin panel.')
      }

      wantedCurrency = wantedCurrency[0]

      // Now expanding the currency with static currency information
      var currencyData = Currencies[newOrder.currency]
      // Adding rate information (which is dynamic)
      currencyData.rate = wantedCurrency.rate

      // Merging into the currency property inside order object
      newOrder.currency = currencyData
    } else {
      // Defaulting to the application level currency_code
      newOrder.currency = req.client.application.currency_code

      // Now expanding the currency with other information
      newOrder.currency = Currencies[newOrder.currency]

      // The rate to the base currency is obviously 1:1
      newOrder.currency.rate = 1
    }

    // Running promises
    Promise
      .props(promises)
      .then(function (responses) {
        if (responses.items.length === 0) {
          return next(new Errors.BadRequest('Cannot create an order with no line items.'))
        }

        var order_data = {
          items: responses['items'],
          shipping_address: responses['shipping_address'],
          billing_address: responses['billing_address']
        }

        if (responses.shipping_method) {
          order_data.shipping = responses.shipping_method
        }

        if (responses.promotion) {
          order_data.promotion = responses.promotion
        }

        if (responses.promotions) {
          order_data.promotions = responses.promotions
        }

        if (responses.coupon) {
          order_data.coupon = responses.coupon
        }

        if (responses.payment_method) {
          order_data.payment_method = responses.payment_method
        }

        if (responses.taxes) {
          order_data.taxes = responses.taxes
        }

        if (responses.user) {
          order_data.user = responses.user
        }

        if (req.body.hasOwnProperty('notes')) {
          if (!Array.isArray(req.body.notes)) {
            order_data.notes = [req.body.notes]
          } else {
            order_data.notes = req.body.notes
          }
        }

        order_data.application_id = req.client.application_id

        req.order = order_data

        // We initialize an array of notes, this is a useful report of what happened during order creation

        // If the order is made using a cart,
        // then we update the cart setting the status property to 'close'
        if (req.body.hasOwnProperty('cart_id')) {
          if (typeof req.body.cart_id !== 'number') {
            return next(new Errors.BadRequest('Wrong type for cart_id, got ' + typeof req.body.cart_id + 'instead of number.'))
          }
          req.order.cart_id = req.body.cart_id
        }

        // If the order is made using a cart,
        // then we update the cart setting the status property to 'close'
        if (req.body.hasOwnProperty('shipping_id')) {
          if (typeof req.body.shipping_id !== 'number') {
            return next(new Errors.BadRequest('Wrong type for shipping_id, got ' + typeof req.body.shipping_id + 'instead of number.'))
          }
          req.order.shipping_id = req.body.shipping_id
        }

        if (req.body.hasOwnProperty('shipping_fee')) {
          req.order.shipping_fee = Utils.fix2(req.body.shipping_fee)
        }

        if (req.body.hasOwnProperty('user_id')) {
          if (typeof req.body.user_id !== 'number') {
            return next(new Errors.BadRequest('Wrong type for user_id, got ' + typeof req.body.user_id + 'instead of number.'))
          }
          req.order.user_id = req.body.user_id
        }

        return order.populateItems()
      })
      .then(function (products_details) {
        req.order.products = products_details

        var expanded_items = []

        // Validating shipping_id, if at least one product
        // is flagged as "requires_shipping : true" and this order
        // has no shipping.

        if (req.order.products.some(x => x.requires_shipping === true) && !req.order.hasOwnProperty('shipping_id')) {
          next(new Errors.BadRequest('The order contains items that require shippings, but no shipping_id was provided.'))
        }

        /*********************************************************
         *      Handling currency conversions, if needed
         *
         *      Products prices conversions
         *      Shipping fees conversions
         *      Promotions discounts conversions
         *      Coupon discount conversions
         *      Payment method fee conversions
         **********************************************************/

        /*
         *   Calculating items total
         */
        req.order.items_total = req.order.products.map(x => {
          // If the item is a variant, we must check the variant's
          // price and price_discount
          // A variant might not have a price
          if (Utils.hasVariants(x) && x.variant.hasOwnProperty('price_discount')) {
            return x.variant.price_discount * x.quantity
          } else if (Utils.hasVariants(x) && x.variant.hasOwnProperty('price')) {
            return x.variant.price * x.quantity
          } else if (x.hasOwnProperty('price_discount')) {
            return x.price_discount * x.quantity
          } else {
            return x.price * x.quantity
          }
        }).reduce((x, y) => x + y)

        // Solving rounding issues. Tnx javascript
        req.order.items_total = (Math.round(req.order.items_total * 100) / 100)

        // Ho deciso che non salvo sti valori, li aggiungo quando sputo i metodi GET
        // req.order.display_items_total = String(req.order.items_total)+" "+req.client.application.currency_code;

        // Now we calculate the total cost of shipping
        // if (req.order.hasOwnProperty('shipping') && 'undefined' !== typeof req.order.shipping) {

        /*
         *   Calculating shipping total
         */

        // The default value is 0
        req.order.shipping_total = 0

        // An optional shipping fee to be provided at order creation if developers want to override our shipping fee system
        if (req.order.shipping_fee) {
          req.order.shipping_total = req.order.shipping_fee
        }

        // If a shipping_id is provided, then the previous step populated it.
        if (req.order.shipping) {
          var number_items_in_order = req.order.products.map(x => x.quantity).reduce((x, y) => x + y)

          var cost_of_shipping = req.order.shipping.base_cost + number_items_in_order * req.order.shipping.per_item_cost

          req.order.shipping_total = cost_of_shipping
          // Solving rounding issues
          req.order.shipping_total = (Math.round(req.order.shipping_total * 100) / 100)
        }

        /*
         *   Calculating Promotions
         *
         * There are two possible cases,
         *
         * The first is that the promotion_id is provided in the order object from the HTTP request
         * In this case, we just check that its an appliable promotion and apply it.
         *
         * The second is that no promotion_id is provided but there are some active promotions in the system
         * if that's the case, we look for them, filter them and sort them by priority
         */
        if (req.order.promotion) {
          // 1. Check if promotion is appliable to this order, if not refuse everything
          // 2. If it is appliable, lets calculate the impact on the order.

          if (!Utils.isPromotionAppliableToOrder(req.order.promotion, req.order)) {
            // give error
            return next(new Errors.BadRequest('The selected promotion is not appliable to this order.'))
          }
        }

        if (req.order.promotions) {
          // TODO add a configuration flag to allow multiple promotions
          var appliable_promotions = req.order.promotions.filter((promotion) => {
            return Utils.isPromotionAppliableToOrder(promotion, req.order)
          })
            .sort(function (a, b) {
              // Sorting by priority. Highes priority first
              return (b.priority || 0) - (a.priority || 0)
            })

          if (appliable_promotions.length > 0) {
            req.order.promotion = appliable_promotions[0]
          }
          // Otherwise we don't have a promotion appliable to this order

          delete req.order.promotions
        }

        // We selected a single promotion in the previous step
        if (req.order.promotion) {
          req.order.promotion_total = Utils.getPromotionTotal(req.order)
        }

        if (req.order.coupon) {
          // In order to keep a good track of taxation, we must apply discount
          // to single products if the discount type is not cart_coupon
          // This is because if product A is taxed 20% and product B 10%
          // the 10% discount on A product is
          req.order.coupon_total = Utils.getTotalCouponDiscount(req.order.coupon, req.order.products)
        }

        /*
         *   Calculating payment methods fees
         */

        if (req.order.payment_method) {
          req.order.payment_method_total = Utils.getPaymentMethodTotal(req.order)
        }

        /*
         *   Calculating Taxes
         */
        var taxAmount = 0
        switch (req.client.application.tax_type) {
          case 'nothing':

            taxAmount = 0

            break
          case 'all':
            var tax_for_shipping = 0
            if (req.order.shipping) {
              tax_for_shipping = Utils.getTotalTaxesForShipping(req.order, req.client.application)
            }

            var tax_for_products = Utils.getTotalTaxesForProducts(req.order, req.client.application)
            taxAmount = tax_for_shipping + tax_for_products

            break
          case 'products_only':

            taxAmount = Utils.getTotalTaxesForProducts(req.order, req.client.application)

            break
          case 'shipping_only':

            var taxAmount = 0

            if (req.order.shipping) {
              taxAmount = Utils.getTotalTaxesForShipping(req.order, req.client.application)
            }
            break
          default:
            taxAmount = 0
            break
        }

        // Tax total
        req.order.taxes_total = taxAmount

        // Solving rounding issues
        req.order.taxes_total = (Math.round(req.order.taxes_total * 100) / 100)

        // TODO this will take in account discount, taxes, shipping etc....
        // req.order.total = req.order.products.map(x => x.price * x.quantity).reduce((x, y) => x + y);

        req.order.total = 0
        req.order.total += req.order.items_total
        req.order.total += req.order.taxes_total
        req.order.total += req.order.shipping_total

        if (req.order.payment_method) {
          req.order.total = req.order.total + req.order.payment_method_total
        }

        // now we check for the promotion
        if (req.order.promotion) {
          req.order.total = req.order.total - req.order.promotion_total
        }

        if (req.order.coupon) {
          req.order.total = req.order.total - req.order.coupon_total
        }

        // Solving rounding issues. Tnx javascript
        req.order.total = (Math.round(req.order.total * 100) / 100)

        // Ho deciso che non salvo sti valori, li aggiungo quando sputo i metodi GET
        // req.order.display_total = String(req.order.total)+" "+req.client.application.currency_code;

        req.order.created_at = Date.now()

        // This should not be a choice at creation
        // FIXME
        req.order.status = req.order.status || 'pending'

        // Adding developer-defined custom data to the order,
        // If the custom data has fields with the same name as some
        // predefined attributes, then the custom field is ignored.
        for (var k in req.body) {
          // We just ensure that the custom properties do not overwrite predefined properties
          if (!(req.order.hasOwnProperty(k))) {
            req.order[k] = req.body[k]
          }
        }

        next()
      })
      .catch(function (error) {
        console.log(error)
        if (error.code) {
          res.status(error.code).send({
            status: false,
            errors: [error]
          })
        } else {
          res.status(500).send({
            status: false,
            errors: [new Errors.InternalServerError()]
          })
        }
      })
  },
  finalizeOrderCreation: function (req, res, next) {
    var sequelize = req.app.get('sequelize'),
      mongodb = req.app.get('mongodb')

    var items_to_query = req.order.items
      .map(function (i) {
        return {
          product_id: i.product_id,
          variant_id: i.variant_id || 0,
          application_id: req.client.application_id
        }
      })

    var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')
    return Inventory.findAll({
      'where': {
        $or: items_to_query
      }
    })
      .then(function (inventory_data) {
        var products_with_finite_inventory = inventory_data.map(x => x.toJSON()).filter(x => x.stock_type === 'track')
        var prod_quantity_in_order_map = {}
        req.order.items.forEach(function (i) {
          prod_quantity_in_order_map[i.product_id + '_' + i.variant_id] = i.quantity
        })

        return sequelize.transaction(function (t) {
          // chain all your queries here. make sure you return them.
          // sequelize.query('',{transaction:t, type : sequelize.QueryTypes.UPDATE})
          return sequelize.Promise.map(products_with_finite_inventory, function (p) {
            return sequelize.query('UPDATE inventory SET stock_level = stock_level - :quantity WHERE product_id = :product_id AND variant_id = :variant_id AND application_id = :applicationId;', {
              transaction: t,
              type: sequelize.QueryTypes.UPDATE,
              replacements: {
                quantity: prod_quantity_in_order_map[p.product_id + '_' + p.variant_id],
                applicationId: req.client.application_id,
                product_id: p.product_id,
                variant_id: p.variant_id
              }
            })
          })
            .then(function (updated_products) {
              var query_options = {
                type: sequelize.QueryTypes.SELECT,
                transaction: t
              }
              return sequelize.query(Utils.Queries.getNewUID, query_options)
            })
            .then(function (new_id) {
              req.order.id = new_id[1]['0']['LAST_INSERT_ID()']
              var order = new OrderModel({}, {
                sequelize: req.app.get('sequelize'),
                mongodb: req.app.get('mongodb'),
                client: req.client
              })
              return order.save(req.order)
            })
        }) // transaction
      })
      .then(function (final_result) {
        var queue = req.app.get('mail-queue')

        var message = {
          type: 'orders.create',
          resource_id: final_result.id,
          application: req.client.application
        }

        queue
          .sendToQueue('marketcloud-mail', message)
          .then(function () {
            return console.log('Message (' + message.type + ') enqueued to Mail queue correctly')
          }).catch(function (err) {
            return console.log('Message was not enqueued to Mail service', err)
          })

        var order = new OrderModel(req.order, {
          sequelize: req.app.get('sequelize'),
          mongodb: req.app.get('mongodb'),
          client: req.client
        })

        // If the order is made using a cart,
        // then we update the cart setting the status property to 'close'
        if (req.order.hasOwnProperty('cart_id')) {
          order.closeCart()
            .then(function (closed_cart) {
              // Then we must check if the coupon usages must be decreased.
              if ('coupon' in final_result) {
                // Building the coupon update object
                var coupon_update = {}

                if ('usages_left' in final_result.coupon) {
                  coupon_update.usages_left = final_result.coupon.usages_left - 1
                  // We also set it to inactive if the usages left are 0
                  if (coupon_update.usages_left <= 0) {
                    coupon_update.active = false
                  }
                }

                // We count the number of times the coupon was used.
                if (!('total_usages' in final_result.coupon)) {
                  coupon_update.total_usages = 1
                } else {
                  coupon_update.total_usages = final_result.coupon.total_usages + 1
                }

                // We must decrease the coupon
                return new Promise(function (resolve, reject) {
                  mongodb.collection('coupons')
                    .update({
                      application_id: req.client.application_id,
                      id: final_result.coupon.id
                    }, {
                      $set: coupon_update
                    }, function (err) {
                      if (err) {
                        return reject(err)
                      }

                      return resolve({})
                    })
                })
              }
            })
            .then(function (response) {
              // Coupon is updated if the update was needed

            })
            .catch(function (error) {
              console.log('An error has occurred, cart not closed or coupon not updated')
            })
        }

        delete final_result['_id']

        final_result = Utils.attachDisplayTotals(final_result)

        res.send({
          status: true,
          data: final_result
        })
      })

      .catch(function (error) {
      // TODO, handle error.
      // If the error occurs after the inventory has been updated
      // then we must revert the inventory.

        console.log(error)

        if (error.stack) {
          console.log(error.stack)
        }
        if (error.code) {
          res.status(error.code).send(error)
        } else {
          res.status(500).send({
            status: false,
            errors: [new Errors.InternalServerError()]
          })
        }
      })
  },

  delete: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.orderId)) {
      return next(new Errors.BadRequest('id must be integer'))
    }
    var mongodb = req.app.get('mongodb')
    mongodb.collection('orders').findOne({
      application_id: req.client.application_id,
      id: Number(req.params.orderId)
    }, function (err, order) {
      if (err) {
        return next(err)
      }

      if (order === null) {
        // We considere delete idempotent, so deleting non-existing item results in 200
        return res.ok()
      }

      // Devo grabbare tutti gli oggettini
      var line_items = order.products

      // Questo array conterrà quelle entry dell'inventario che vanno riagigunte
      var items_to_update = line_items
        .filter((item) => {
          if (Utils.hasVariants(item)) {
            return item.variant.stock_type === 'track'
          } else {
            return item.stock_type === 'track'
          }
        })
        .map(function (item) {
          var variant_id = 0

          if (Utils.hasVariants(item)) {
            variant_id = item.variant.id
          }

          return {
            application_id: req.client.application_id,
            product_id: item.id,
            variant_id: variant_id,
            quantity: item.quantity
          }
        })

      // We must update the inventory in a transaction all or nothing!
      var sequelize = req.app.get('sequelize')

      // Little optimization, we check the number of items to update on the inventory
      // If its zero, we jump to deleting the order.

      if (line_items.length === 0) {
        return mongodb.collection('orders').remove({
          application_id: req.client.application_id,
          id: Number(req.params.orderId)
        }, function (err) {
          if (err) {
            return next(err)
          } else {
            res.status(200).send({
              status: true
            })
          }
        })
      }

      return sequelize.transaction(function (t) {
        // chain all your queries here. make sure you return them.
        // sequelize.query('',{transaction:t, type : sequelize.QueryTypes.UPDATE})
        return sequelize.Promise.map(items_to_update, function (p) {
          return sequelize.query('UPDATE inventory SET stock_level = stock_level + :quantity WHERE product_id = :product_id AND variant_id = :variant_id AND application_id = :applicationId;', {
            transaction: t,
            type: sequelize.QueryTypes.UPDATE,
            replacements: {
              quantity: p.quantity,
              applicationId: p.application_id,
              product_id: p.product_id,
              variant_id: p.variant_id
            }
          })
        })
      })
        .then(function (updated_products) {
          // transaction committed
          // we can delete the order
          //
          mongodb.collection('orders').remove({
            application_id: req.client.application_id,
            id: Number(req.params.orderId)
          }, function (err) {
            if (err) {
              return next(err)
            } else {
              res.status(200).send({
                status: true
              })
            }
          })
        })
        .catch(function (error) {
          console.log('Order delete transaction error', error)
          if (error.stack) {
            console.log(error.stack)
          }
          if (error.code) {
            res.status(error.code).send(error)
          } else {
            res.status(500).send({
              status: false,
              errors: [new Errors.InternalServerError()]
            })
          }
        })
    })
  },

  update: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.orderId)) {
      res.send(400, {
        status: false,
        errors: [new Errors.BadRequest('id must be integer')]
      })
      return
    }

    // TODO add validation
    var mongodb = req.app.get('mongodb')

    mongodb.collection('orders')
      .findAndModify({
        application_id: req.client.application_id,
        id: Number(req.params.orderId)
      }, [], {
        $set: req.body
      }, {
        'new': true
      },
      function (err, updated_order) {
        if (err) {
          return next(err)
        }

        updated_order = updated_order.value

        // If the update included a status update
        // we might have to send a notification to the customer
        // So we enqueue a notification
        if (req.body.hasOwnProperty('status')) {
          var queue = req.app.get('mail-queue')

          var message = {
            type: 'orders.update.' + req.body.status,
            resource_id: Number(req.params.orderId),
            application: req.client.application
          }

          queue
            .sendToQueue('marketcloud-mail', message)
            .then(function () {
              return console.log('Message (' + message.type + ') enqueued to Mail queue correctly')
            }).catch(function (err) {
              return console.log('Message was not enqueued to Mail service', err)
            })
        }

        res.send({
          status: true,
          data: updated_order
        })
      })
  }
}

/*
    @route /orders/:orderId/shipments
 */
var shipmentsController = {
  create: function (req, res, next) {
    var order_id = Number(req.params.orderId)

    var new_shipment = req.body

    new_shipment.date = req.body.date || new Date()
    new_shipment.delivery_date = req.body.delivery_date || new Date()

    var validation = Types.Shipment.validate(new_shipment)

    if (validation.valid === false) {
      return next(new Errors.ValidationError(validation))
    }

    var mongodb = req.app.get('mongodb')

    mongodb.collection('orders')
      .findOne({
        application_id: req.client.application_id,
        id: order_id
      }, function (err, order) {
        if (err) {
          return next(err)
        }

        if (order === null) {
          return res.status(404).send({
            status: false,
            errors: [new Errors.NotFound('Cannot find an order with id ' + order_id)]
          })
        }

        if (order.hasOwnProperty('shipments') && order.shipments instanceof Array) {
          order.shipments.push(new_shipment)
        } else {
          order.shipments = [new_shipment]
        }

        mongodb.collection('orders')
          .update({
            application_id: req.client.application_id,
            id: order_id
          }, {
            $set: {
              shipments: order.shipments
            }
          }, function (err, result) {
            if (err) {
              return next(err)
            } else {
              return res.send({
                status: true,
                data: order
              })
            }
          })
      })
  },
  update: function (req, res, next) {
    var orderId = Number(req.params.orderId)
    var shipmentId = Number(req.params.shipmentId)
    var mongodb = req.app.get('mongodb')
    mongodb
      .collection('orders')
      .findOne({
        application_id: req.client.application_id,
        id: orderId
      }, function (err, order) {
        if (err) {
          return next(err)
        }

        if (order === null) {
          return next(new Errors.NotFound())
        }

        order.shipments = order.shipments || []

        // order.shipments.forEach(function (shipment) {

        var shipment = order.shipments[shipmentId]
        if (!shipment) {
          return next(new Errors.NotFound('Shipment not found in order ' + orderId + '.'))
        }

        for (var k in req.body) {
          shipment[k] = req.body[k]
        }

        var validation = Types.Shipment.validate(shipment)

        if (validation.valid === false) {
          return next(new Errors.ValidationError(validation))
        }

        mongodb.collection('orders')
          .update({
            application_id: req.client.application_id,
            id: orderId
          }, order, function (err) {
            if (err) {
              return next(err)
            }

            return res.send({status: true, data: shipment})
          })
      })
  }
}

/*
    @route /orders/:orderId/paymentd
 */
var paymentsController = {
  create: function (req, res, next) {
    var order_id = Number(req.params.orderId)

    var newPayment = {
      successful: true,
      amount: 0, // This is only for passing validation. We set the real value later.
      application_id: req.client.application_id,
      order_id: order_id,
      description: req.body.description || '',
      created_at: req.body.created_at || new Date()
    }

    if (req.body.method) {
      newPayment.method = req.body.method
    }

    if (req.body.payment_method_id) {
      newPayment.method = 'Custom'
      newPayment.payment_method_id = req.body.payment_method_id
    }

    // Check that it has an existing paymentMethod name

    var validation = Types.Payment.validate(newPayment)
    if (validation.valid !== true) {
      return next(Utils.augment(new Errors.BadRequest(), validation))
    }

    var mongodb = req.app.get('mongodb')

    // TODO add validation
    // A payment should look like
    // {
    //  id : <id>
    //  method : <object> a copy of the shipping method <required>
    //  description : <string> Text describing the shipment
    //  date: <Date> Date shipped
    //
    // }
    mongodb.collection('orders')
      .findOne({
        application_id: req.client.application_id,
        id: order_id
      },
      function (err, order) {
        if (err) {
          return next(err)
        }

        if (order === null) {
          return next(new Errors.NotFound('Cannot find an order with id ' + order_id))
        }

        newPayment.amount = order.total

        if (order.hasOwnProperty('payments')) {
          order.payments.push(newPayment)
        } else {
          order.payments = [newPayment]
        }

        mongodb.collection('orders')
          .update({
            application_id: req.client.application_id,
            id: order_id
          }, {
            $set: {
              status: 'processing',
              payments: order.payments
            }
          }, function (err, result) {
            if (err) {
              return next(err)
            } else {
              return res.send({
                status: true,
                data: order
              })
            }
          })
      })
  }
}

// Mounting the routes
Router.get('/', Middlewares.verifyClientAuthorization('orders', 'list'), orderController.list)
Router.post('/', Middlewares.verifyClientAuthorization('orders', 'create'), orderController.prepareOrderCreation, orderController.finalizeOrderCreation)
Router.get('/:orderId', Middlewares.verifyClientAuthorization('orders', 'getById'), orderController.getById)
Router.delete('/:orderId', Middlewares.verifyClientAuthorization('orders', 'delete'), orderController.delete)
Router.put('/:orderId', Middlewares.verifyClientAuthorization('orders', 'update'), orderController.update)
Router.patch('/:orderId', Middlewares.verifyClientAuthorization('orders', 'update'), orderController.update)

// Shipments
Router.post('/:orderId/shipments', Middlewares.verifyClientAuthorization('orders', 'update'), shipmentsController.create)
Router.put('/:orderId/shipments/:shipmentId', Middlewares.verifyClientAuthorization('orders', 'update'), shipmentsController.update)

// Payments
Router.post('/:orderId/payments', Middlewares.verifyClientAuthorization('payments', 'create'), paymentsController.create)

// Refunds

var RefundsController = require('../controllers/refunds.controller')

Router.post('/:orderId/refunds',
  Middlewares.verifyClientAuthorization('orders', 'update'),
  RefundsController.create)

/**
 * Creates the PDF for the input refund and uploads it to CDN to a public address. It returns the url to the client.
 */
Router.post('/:orderId/refunds/:refundId/pdf', function (req, res, next) {
  var db = req.app.get('mongodb')

  db.collection('orders')
    .findOne({
      application_id: req.client.application_id,
      id: Number(req.params.orderId)
    }, function (err, data) {
      if (err) {
        return next(err)
      }

      if (data === null) {
        return next(new Errors.NotFound('Cannot find order with id ' + req.params.orderId))
      }

      var wantedRefund = null

      data.refunds.forEach(function (refund) {
        if (refund.id === Number(req.params.refundId)) { wantedRefund = refund }
      })

      if (wantedRefund === null) {
        return next(new Errors.NotFound('Order ' + req.params.orderId + ' does not have any refund with id ' + req.params.refundId))
      }

      // This object wll be passed to the EJS compiler to render the template
      var context = {
        order: data,
        application: req.client.application,
        refund: wantedRefund
      }

      Attachments.getRefundPDF(context, function (err, buffer) {
        if (err) {
          console.log('getRefundPDF ERROR', err)
          return next(err)
        }

        if (buffer) {
          // Now we must upload this buffer to the CDN and make it available

          // Upload options
          var options = {
            contentSettings: {
              contentType: 'application/pdf'
              // contentEncoding: 'base64'
            }
          }
          var azureContainerName = 'refunds'
          var filename = 'Refund-' + req.client.application_id + '-' + String(Date.now()) + '.pdf'
          blobService.createBlockBlobFromText(azureContainerName, filename, buffer, options, function (error, result, response) {
            if (error) {
              return next(error)
            }

            var pdfUrl = config.storage.azureStorageCDNBaseUrl + '/refunds/' + result.name

            data.refunds.forEach(function (refund) {
              if (refund.id === wantedRefund.id) {
                refund.refund_pdf_url = pdfUrl
              }
            })

            // Now we can update the order setting the invoice pdf

            db.collection('orders')
              .update({
                application_id: req.client.application_id,
                id: data.order_id
              }, {
                $set: data
              },
              function (err) {
                if (err) {
                  return next(err)
                }

                res.send({
                  status: true,
                  data: {
                    url: config.storage.azureStorageCDNBaseUrl + '/refunds/' + result.name

                  }
                })
              })
          }) // createBlockBlob
        } else {
          // Buffer not created for whatever reason
          return next(new Errors.ServiceUnavailable())
        }
      }) // getRefundPDF
    }) // orders.findOne
})

module.exports = Router
