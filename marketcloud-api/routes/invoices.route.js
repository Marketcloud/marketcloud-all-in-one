var Resource = require('../libs/resource')
var Types = require('../models/types')
var Errors = require('../models/errors')
var Attachments = require('../libs/templatetopdf')
var MongoDB = require('../services/mongodb.service')
const azure = require('azure-storage')
const config = require('../config/default.js')
var blobService = azure.createBlobService(config.storage.azureStorageAccountName, config.storage.azureStorageAccountAccessKey)

var resource = Resource({
  singularResourceName: 'invoice',
  pluralResourceName: 'invoices',
  validator: Types.Invoice,
  hooks: {
    beforeCreate: [checkOrderExistance, computeInvoiceTotal, castInvoiceNumber],
    afterCreate: [setInvoiceIdInOrder, emitNewInvoiceEvent],
    beforeUpdate: checkOrderExistance,
    afterDelete: removeInvoiceIdInOrder
  }
})

function castInvoiceNumber (req, res, next) {
  // This is only for back compatibility
  if (typeof req.body.number === 'number') { req.body.number = String(req.body.number) }

  return next()
}

function checkOrderExistance (req, res, next) {
  var newInvoice = req.body

  // If the payload does not include an order_id , we don't check its existance
  // even if an order_id is required, with this little check we can use  the same function
  // for checking on update operations
  if (!newInvoice.hasOwnProperty('order_id')) {
    return next()
  }

  var db = MongoDB.getDatabaseInstance()

  db.collection('orders')
    .findOne({
      application_id: req.client.application_id,
      id: newInvoice.order_id
    }, function (err, order) {
      if (err) {
        return next(err)
      }

      if (order === null) {
        return next(new Errors.BadRequest('The order with id ' + newInvoice.order_id + ' does not exist.'))
      }

      return next()
    })
}

function setInvoiceIdInOrder (req, res, next) {
  // After the invoice is created, we set the id into the order
  var newInvoice = req.toSend

  var db = MongoDB.getDatabaseInstance()

  db.collection('orders').update({
    application_id: req.client.application_id,
    id: newInvoice.order_id
  }, {
    $set: {
      invoice_id: newInvoice.id
    }
  },

  function (err) {
    if (err) {
      return next(err)
    }

    return next()
  })
}

function emitNewInvoiceEvent (req, res, next) {
  var queue = req.app.get('mail-queue')
  var newInvoice = req.toSend

  var message = {
    type: 'invoices.create',
    resource_id: newInvoice.id,
    application: req.client.application
  }

  queue
    .sendToQueue('marketcloud-mail', message)
    .then(function () {
      console.log('Message (' + message.type + ') enqueued to Mail queue correctly')
    }).catch(function (err) {
      console.log('Message was not enqueued to Mail service', err)
    })

  // We don't wait for queue to ack, because in case the queue is not available , this middleware
  // would stop and make the request hang.
  return next()
}

function removeInvoiceIdInOrder (req, res, next) {
  // After the invoice is created, we set the id into the order
  var db = MongoDB.getDatabaseInstance()

  db.collection('orders').update({
    application_id: req.client.application_id,
    invoice_id: Number(req.params.id)
  }, {
    $unset: {
      invoice_id: ''
    }
  },
  function (err) {
    if (err) {
      return next(err)
    }

    return next()
  })
}

function computeInvoiceTotal (req, res, next) {
  if (req.body.hasOwnProperty('lineItems') && Array.isArray(req.body.lineItems)) {
    req.body.total = req.body.lineItems
      .map(function (lineItem) {
        return lineItem.price * lineItem.quantity
      })
      .reduce(function (a, b) {
        return a + b
      })
  }

  next()
}

/**
 * Creates the PDF for the input invoice and uploads it to CDN to a public address. It returns the url to the client.
 */
resource.router.post('/:invoiceId/pdf', function (req, res, next) {
  var db = MongoDB.getDatabaseInstance()

  db.collection('invoices')
    .findOne({
      application_id: req.client.application_id,
      id: Number(req.params.invoiceId)
    }, function (err, data) {
      if (err) {
        return next(err)
      }

      if (data === null) {
        return next(new Errors.NotFound('Cannot find invoice with id ' + req.params.invoiceId))
      }

      db.collection('orders')
        .findOne({
          application_id: req.client.application_id,
          id: data.order_id
        }, function (err, order) {
          if (err) {
            return next(err)
          }

          if (order === null) {
            return next(new Errors.BadRequest('The order for this invoice, does not exist anymore. Cannot create PDF invoice.'))
          }

          // This object wll be passed to the EJS compiler to render the template
          var context = {
            invoice: data,
            application: req.client.application,
            order: order
          }

          Attachments.getInvoicePDF(context, function (err, buffer) {
            if (err) {
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
              var azureContainerName = 'invoices'
              var filename = 'Invoice-' + req.client.application_id + '-' + String(Date.now()) + '.pdf'
              blobService.createBlockBlobFromText(azureContainerName, filename, buffer, options, function (error, result, response) {
                if (error) {
                  return next(error)
                }

                var pdfUrl = config.storage.azureStorageCDNBaseUrl + '/invoices/' + result.name
                // Now we can update the order setting the invoice pdf

                db.collection('orders')
                  .update({
                    application_id: req.client.application_id,
                    id: data.order_id
                  }, {
                    $set: {
                      invoice_pdf_url: pdfUrl
                    }
                  },
                  function (err) {
                    if (err) {
                      return next(err)
                    }

                    res.send({
                      status: true,
                      data: {
                        url: config.storage.azureStorageCDNBaseUrl + '/invoices/' + result.name

                      }
                    })
                  })
              }) // createBlockBlob
            } else {
              // Buffer not created for whatever reason
              return next(new Errors.ServiceUnavailable())
            }
          }) // getinvoicePDF
        })
    }) // find invoice db callback
})

module.exports = resource.router
