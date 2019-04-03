'use strict'

var Utils = require('./util.js')
var Types = require('../models/types.js')
var Errors = require('../models/errors.js')
Promise = require('bluebird')

var clean = function(data) {
  return Utils.subsetInverse(data, ['_id', 'application_id', 'password'])
}

var Order = function(data, config) {
  for (var k in data) {
    this[k] = data[k]
  }

  if (this.items) {
    this.items.forEach(function(i) {
      i.variant_id = i.variant_id || 0
    })
  }

  this.mongodb = config.mongodb
  this.client = config.client
    //  this.sequelize = config.sequelize;
}

Order.prototype.validate = function() {
  var validation = {
    valid: true
  }
  if (!(this.hasOwnProperty('shipping_address_id') || this.hasOwnProperty('shipping_address'))) {
    return {
      valid: false,
      message: 'An order must have a shipping_address_id or a shipping_address object'
    }
  }

  if (!(this.hasOwnProperty('billing_address_id') || this.hasOwnProperty('billing_address'))) {
    return {
      valid: false,
      message: 'An order must have a billing_address_id or a billing_address object'
    }
  }

  if (!(this.hasOwnProperty('cart_id') || this.hasOwnProperty('items'))) {
    return {
      valid: false,
      message: 'An order must have a cart_id or an array of items'
    }
  }

  if (this.hasOwnProperty('shipping_address')) {
    validation = Types.Address.validate(this.shipping_address)
    if (validation.valid === false) {
      validation.message = 'Invalid shipping_address'
      return validation
    }
  }

  if (this.hasOwnProperty('billing_address')) {
    validation = Types.Address.validate(this.billing_address)
    if (validation.valid === false) {
      validation.message = 'Invalid billing_address'
      return validation
    }
  }

  if (this.hasOwnProperty('items')) {
    var itemValidation = null
    for (var i = 0; i < this.items.length; i++) {
      itemValidation = Types.CartEntry.validate(this.items[i])

      if (itemValidation.valid === false) {
        break
      }
    }
    if (itemValidation !== null && itemValidation.valid === false) {
      itemValidation.message = 'Invalid item in order'
      return itemValidation
    }
  }

  return {
    valid: true
  }
}

Order.prototype.validatePromise = function() {
  var _this = this
  return new Promise(function(resolve, reject) {
    var validation = _this.validate()
    if (validation.valid) {
      resolve(validation)
    } else {
      reject(validation)
    }
  })
}

Order.prototype.closeCart = function() {
  var _this = this
  var query = {
    id: _this.cart_id,
    application_id: _this.client.application_id
  }
  return new Promise(function(resolve, reject) {
    _this.mongodb
      .collection('carts')
      .findOneAndUpdate(query, {
          $set: {
            status: 'closed'
          }
        }, {
          returnOriginal: false
        },
        function(err, cartData) {
          if (err) {
            return reject(err)
          }

          resolve(clean(cartData))
        })
  })
}

Order.prototype.loadShippingAddress = function() {
  var _this = this
  return new Promise(function(resolve, reject) {
    if (_this.hasOwnProperty('shipping_address')) {
      return resolve(_this.shipping_address)
    }

    var query = {
      id: _this.shipping_address_id,
      application_id: _this.client.application_id
    }

    if (_this.client.hasOwnProperty('user_id')) {
      query.user_id = _this.client.user_id
    }

    _this.mongodb
      .collection('addresses')
      .findOne(query,{ fields : {"_id" : 0}}, function(err, addresses) {
        if (err) {
          reject(err)
        } else {
          if (addresses === null) {
            reject(new Errors.NotFound('Cannot find shipping address with id ' + _this.shipping_address_id))
          }

          resolve(addresses)
        }
      })
  })
}

Order.prototype.loadBillingAddress = function() {
  var _this = this
  return new Promise(function(resolve, reject) {
    if (_this.hasOwnProperty('billing_address')) {
      return resolve(_this.billing_address)
    }

    var query = {
      id: _this.billing_address_id,
      application_id: _this.client.application_id
    }

    if (_this.client.hasOwnProperty('user_id')) {
      query.user_id = _this.client.user_id
    }

    _this.mongodb
      .collection('addresses')
      .findOne(query,{ fields : {"_id" : 0}}, function(err, addresses) {
        if (err) {
          reject(err)
        } else {
          if (addresses === null) {
            reject(new Errors.NotFound('Cannot find billing address with id ' + _this.billing_address_id))
          }

          resolve(addresses)
        }
      })
  })
}

Order.prototype.loadItems = function() {
  var _this = this
  return new Promise(function(resolve, reject) {
    if (_this.hasOwnProperty('items')) {
      return resolve(_this.items)
    }

    // Se non ha gli items, ha il cart_id

    var query = {
      id: _this.cart_id,
      application_id: _this.client.application_id
    }

    // if the current access scope
    // is public, then the cart must be a public cart.
    if (_this.client.role === 'public') {
      query.user_id = {
        $exists: false
      }
    }

    // If the user is logged in, let's be sure he acts on its cart.
    if (_this.client.role === 'user') {
      query.user_id = _this.client.user_id
    }


    _this.mongodb
      .collection('carts')
      .findOne(query,{ fields : {"_id" : 0}}, function(err, cartData) {
        if (err) {
          reject(err)
        }
        if (cartData === null) {
          reject(new Errors.NotFound('Cannot find cart with id :', _this.cart_id))
        } else {
          _this.items = cartData.items
          resolve(cartData.items)
        }
      })
  })
}

Order.prototype.loadPromotion = function() {
  var _this = this
  var query = {
    application_id: _this.client.application_id,
    active: true,
    id: Number(_this.promotion_id)
  }

  return new Promise(function(resolve, reject) {
    _this.mongodb
      .collection('promotions')
      .findOne(query,{ fields : {"_id" : 0}}, function(err, promotions) {
        if (err) {
          reject(err)
        } else {
          _this.promotions = promotions
          resolve(promotions)
        }
      })
  })
}

Order.prototype.loadPromotions = function() {
  var _this = this
  var query = {
    application_id: _this.client.application_id,
    active: true
  }

  return new Promise(function(resolve, reject) {
    _this.mongodb
      .collection('promotions')
      .find(query)
      .project({"_id" : 0})
      .toArray(function(err, promotions) {
        if (err) {
          reject(err)
        } else {
          _this.promotions = promotions
          resolve(promotions)
        }
      })
  })
}

Order.prototype.loadTaxes = function() {
  var _this = this
  var query = {
    application_id: _this.client.application_id
  }

  return new Promise(function(resolve, reject) {
    _this.mongodb
      .collection('taxes')
      .find(query)
      .project({"_id" : 0})
      .toArray(function(err, taxes) {
        if (err) {
          reject(err)
        } else {
          _this.taxes = taxes
          resolve(taxes)
        }
      })
  })
}

Order.prototype.loadCoupon = function() {
  var _this = this
  var query = {
    application_id: _this.client.application_id,
    active: true,
    code: _this.coupon_code
  }

  return new Promise(function(resolve, reject) {
    _this.mongodb
      .collection('coupons')
      .findOne(query,{ fields : {"_id" : 0}}, function(err, coupon) {
        if (err) {
          reject(err)
        } else {
          if (coupon === null) {
            return reject(new Errors.BadRequest('The requested coupon does not exist'))
          }

          if (typeof coupon.usages_left === 'number' && coupon.usages_left <= 0) {
            return reject(new Errors.BadRequest('The requested coupon cannot be used anymore'))
          }

          if ('expirationDate' in coupon) {
            var now = Date.now()
            var expirationDate = (new Date(coupon.expirationDate)).getTime()

            if (now > expirationDate) {
              return reject(new Errors.BadRequest('The requested coupon has expired'))
            }
          }

          _this.coupon = coupon
          resolve(coupon)
        }
      })
  })
}

Order.prototype.loadPaymentMethod = function() {
    var _this = this;
    var query = {
      application_id: _this.client.application_id,
      id: _this.payment_method_id
    }
    return new Promise(function(resolve, reject) {
      _this.mongodb
        .collection('paymentMethods')
        .findOne(query, { fields : {"_id" : 0}}, function(err, payment_method) {
          if (err)
            reject(err);
          else {

            _this.payment_method = payment_method;
            resolve(payment_method);
          }


        })
    })
}

    Order.prototype.loadShippingMethod = function() {
      var _this = this

      var query = {
        application_id: _this.client.application_id,
        id: Number(_this.shipping_id)
      }

      return new Promise(function(resolve, reject) {
        _this.mongodb
          .collection('shippings')
          .findOne(query,{ fields : {"_id" : 0}}, function(err, shippingData) {
            if (err) {
              reject(err)
            } else if (shippingData === null) {
              reject(new Errors.NotFound('Cannot find shipping method with id ' + _this.shipping_id))
            } else {
              _this.shippping = shippingData
              resolve(shippingData)
            }
          })
      })
    }

    Order.prototype.save = function(order) {
      var _this = this
      return new Promise(function(resolve, reject) {
        _this.mongodb
          .collection('orders')
          .insert(order, function(err) {
            if (err) {
              reject(err)
            } else {
              resolve(order)
            }
          })
      })
    }

    Order.prototype.getById = function(id) {
      var _this = this
      return new Promise(function(resolve, reject) {
        var query = {
            application_id: _this.client.application_id,
            id: id
          }
          // Se non è un admin allora è un utente e dobbiamo dargli
          // soltanto i suoi ordini
        if (_this.client.access !== 'admin') {
          query.user_id = _this.client.user_id
        }

        _this.mongodb
          .collection('orders')
          .findOne(query, function(err, data) {
            if (err) {
              return reject(err)
            }

            if (data === null) {
              return reject(err)
            }

            resolve(data)
          })
      })
    }

    Order.prototype.list = function(query) {
      var _this = this
      return new Promise(function(resolve, reject) {
        query.application_id = _this.client.application_id

        // Se non è un admin allora è un utente e dobbiamo dargli
        // soltanto i suoi ordini
        if (_this.client.access !== 'admin') {
          query.user_id = _this.client.user_id
        }

        _this.mongodb
          .collection('orders')
          .find(query)
          .toArray(function(err, data) {
            if (err) {
              return reject(err)
            }

            if (data === null) {
              return reject(err)
            }

            resolve(data)
          })
      })
    }

    Order.prototype.populateItems = function() {
      var _this = this
      return new Promise(function(resolve, reject) {
        if (!_this.hasOwnProperty('items')) {
          throw new Error('cannot populateItems() before having loaded them')
        }

        // Se non ha gli items, ha il cart_id

        var listOfProductIds = _this.items.map(x => x.product_id)
        _this.mongodb.collection('products')
          .find({
            id: {
              $in: listOfProductIds
            }
          })
          .project({"_id" : 0})
          .toArray(function(err, data) {
            if (err) {
              return reject(new Errors.InternalServerError())
            }

            var itemsToReturn = []
            var toPush = null
            _this.items.map(function(item) {
                data.forEach(function(product) {
                    if (product.id === item.product_id) {
                      if (Utils.hasValue(item.variant_id) && item.variant_id !== 0) {

                        toPush = Utils.projectProductToVariant(product, item.variant_id)
                        toPush.quantity = item.quantity
                        itemsToReturn.push(toPush)

                      } else {

                        toPush = Utils.filterObject(product, ['_id', 'application_id'])
                        toPush.quantity = item.quantity
                        itemsToReturn.push(toPush)

                      }
                    }
                  }) // end of foorEach
              }) // end of map

            resolve(itemsToReturn)
          })
      })
    }

    Order.prototype.loadUserData = function() {
      var _this = this
      return new Promise(function(resolve, reject) {
        if (!_this.hasOwnProperty('user_id')) {
          return resolve(null)
        }

        // Se non ha gli items, ha il cart_id
        _this.mongodb.collection('users')
        .findOne({
          id: _this.user_id,
          application_id: _this.client.application_id
        },{ fields : {"_id" : 0}}, function(err, userData) {
          if (err) {
            reject(err)
          }
          if (userData === null) {
            reject(new Errors.NotFound('Cannot find user with id ' + _this.user_id))
          } else {
            resolve(clean(userData))
          }
        })
      })
    }

    module.exports = Order