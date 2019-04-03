var Resource = require('../libs/resource')
var Utils = require('../libs/util')
var Types = require('../models/types')
var Errors = require('../models/errors')
var Middlewares = require('../middlewares.js')
var async = require('async')

var resource = Resource({
  singularResourceName: 'promotion',
  pluralResourceName: 'promotions',
  validator: Types.Promotion,
  hooks: {
    beforeCreate: applyDefaults,
    afterList: Utils.convertPromotionCurrency,
    afterGetById: Utils.convertPromotionCurrency
  }
})

var Router = resource.router

function applyDefaults (req, res, next) {
  var newPromotion = req.body

  if (!newPromotion.hasOwnProperty('active')) { newPromotion.active = false }

  return next()
}

function getCompatiblePromotionsByCart (req, res, next) {
  var mongodb = req.app.get('mongodb')

  var fetchCartById = function (callback) {
    var query = {
      where: {
        application_id: req.client.application_id,
        id: Number(req.params.cartId)
      }
    }
    query.projection = {
      _id: 0,
      application_id: 0
    }
    mongodb.collection('carts')
      .findOne(query.where, query.projection, function (err, cart) {
        if (err) { return callback(err, null) }

        if (cart === null) {
          return callback(new Errors.BadRequest('Unable to find cart with given id' + Number(req.params.cartId)))
        }

        return callback(null, cart)
      })
  }

  var fetchCartContents = function (cart, callback) {
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

    req.app.get('mongodb').collection('products')
      .find(query.where, query.projection)
      .toArray(function (err, dbproducts) {
        var products = dbproducts
        if (err) {
          callback(err, null)
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

          cart.items = toSend
          callback(null, cart)
        }
      })
  }

  async.waterfall([
    fetchCartById,
    fetchCartContents
  ], function (err, result) {
    if (err) {
      return next(err)
    }

    mongodb.collection('promotions').find({
      application_id: req.client.application_id,
      active: true
    })
      .toArray(function (err, promotions) {
        if (err) {
          return next(err)
        }

        result.products = result.items

        var appliablePromotions = Utils.getAppliablePromotions(promotions, result)

        // Foreach promotion, we should calculate the impact on the cart
        appliablePromotions.forEach(promotion => {
          var promotionTotal = 0
          var itemsTotal = result.items.map(x => x.price * x.quantity).reduce((a, b) => a + b, 0)
          promotion.effects.forEach(effect => {
            switch (effect.type) {
              case 'CART_VALUE_NET_REDUCTION':
                promotionTotal += effect.value
                // TODO check for strange effect values
                break
              case 'CART_VALUE_PERCENTAGE_REDUCTION':
                // The entity of the reduction
                promotionTotal += (itemsTotal / 100) * effect.value
                break
              case 'CART_ITEMS_NET_REDUCTION':
                // each item's price is reduced by effect.value
                promotionTotal += result.products.map(p => p.quantity * effect.value).reduce((a, b) => a + b, 0)
                break
              case 'CART_ITEMS_PERCENTAGE_REDUCTION':
                // each item's price is reduced by effect.value
                promotionTotal += result.products.map(p => {
                  if (p.hasOwnProperty('price_discount')) { return p.quantity * ((p.price_discount / 100) * effect.value) } else {
                    return p.quantity * ((p.price / 100) * effect.value)
                  }
                }).reduce((a, b) => a + b, 0)
                break
              case 'FREE_SHIPPING':
                promotionTotal += 0
                break
              default:
                throw new Error('Invalid promotion effect type')
            }
          })
          promotion.promotion_total = promotionTotal
        })

        // Handling currencies
        var requestedCurrency = Utils.getRequestedCurrency(req)

        if (requestedCurrency) {
          var currencyRate = Utils.getCurrencyRate(requestedCurrency, req.client.application)

          if (currencyRate === null) { return next(new Errors.BadRequest('Cannot use currency ' + requestedCurrency + '. Add it first as supported currency in your store\'s admin panel.')) }

          appliablePromotions = appliablePromotions.map(function (promotion) {
            return Utils.convertPromotionPrices(promotion, currencyRate)
          })
        }

        res.send({
          status: true,
          data: appliablePromotions
        })
      })
  })
};

Router.get('/cart/:cartId',
  Middlewares.verifyClientAuthorization('promotions', 'list'),
  getCompatiblePromotionsByCart)

module.exports = Router
