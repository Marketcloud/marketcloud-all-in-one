'use strict'

var Types = require('../models/types.js')
var Errors = require('../models/errors.js')
var Utils = require('../libs/util.js')

/*
    @route /orders/:orderId/refunds
 */
var RefundsController = {}

RefundsController.create = function (req, res, next) {
  var order_id = Number(req.params.orderId)

  var newRefund = req.body

  var validation = Types.Refund.validate(newRefund)

  if (validation.valid !== true) {
    return next(new Errors.ValidationError(validation))
  }

  var mongodb = req.app.get('mongodb')

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

      newRefund.id = 0
      newRefund.created_at = new Date()

      if (order.hasOwnProperty('refunds')) {
        newRefund.id = order.refunds.length
        order.refunds.push(newRefund)
      } else {
        order.refunds = [newRefund]
      }

      // must also remove items from order :(
      // foreach line_item in refund object
      // we cycle order.items and order.products
      // if we find a match, we must decrease quantity, if quantity is zero, we must remove the item

      var matchLineItem = function (li1, li2) {
        li1.variant_id = li1.variant_id || 0
        li2.variant_id = li2.variant_id || 0

        return (li1.product_id === li2.product_id && li1.variant_id === li2.variant_id)
      }

      newRefund.line_items.forEach(refundedItem => {
        // Despite the name, line_item is a rich item

        order.items.forEach(item => {
          if (matchLineItem(item, refundedItem)) { item.quantity -= refundedItem.quantity }
        })

        order.products.forEach(item => {
          item.product_id = item.id
          item.variant_id = 0
          if (item.variant) { item.variant_id = item.variant.id }

          if (matchLineItem(item, refundedItem)) { item.quantity -= refundedItem.quantity }
        })
      })

      order.items = order.items.filter(item => { return item.quantity > 0 })
      order.products = order.products.filter(item => { return item.quantity > 0 })

      order.refunds_total = order.refunds
        .map(refund => refund.total)
        .reduce((a, b) => {
          return a + b
        }, 0)

      mongodb.collection('orders')
        .update({
          application_id: req.client.application_id,
          id: order_id
        }, {
          $set: {
            status: 'refunded',
            items: order.items,
            products: order.products,
            refunds: order.refunds,
            refunds_total: order.refunds_total
          }
        }, function (err, result) {
          if (err) { return next(err) }

          var message = {
            type: 'orders.refund',
            resource_id: order_id,
            refund: newRefund,
            application: req.client.application
          }

          var queue = req.app.get('mail-queue')

          queue
            .sendToQueue('marketcloud-mail', message)
            .then(function () {
              return console.log('Message (' + message.type + ') enqueued to Mail queue correctly')
            }).catch(function (err) {
              return console.log('Message was not enqueued to Mail service', err)
            })

            // Maybe we have to restock items;
          if (newRefund.restock_refunded_items === true) {
            return res.send({
              status: true,
              data: order
            })
          }

          // Questo array conterrà quelle entry dell'inventario che vanno riaggiunte
          var items_to_update = newRefund.line_items
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

            // check if we really have to update something
          if (items_to_update.length === 0) {
            // Then no inventory update is required
            console.log('\n\nNo inventory update was required\n\n')

            return res.send({
              status: true,
              data: order
            })
          } else {
            console.log('\n\n\nAn inventory update was required for ' + items_to_update.length + ' items\n\n')
          }

          // We must update the inventory in a transaction all or nothing!
          var sequelize = req.app.get('sequelize')

          // Little optimization, we check the number of items to update on the inventory
          // If its zero, we jump to deleting the order.

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
            .then(function (updatedLineItems) {
              // Hopefully, lineItems were correctly updated

              return res.send({
                status: true,
                data: order
              })
            })
            .catch(Utils.getSequelizeErrorHandler(req, res, next))
        })
    })
}

module.exports = RefundsController
