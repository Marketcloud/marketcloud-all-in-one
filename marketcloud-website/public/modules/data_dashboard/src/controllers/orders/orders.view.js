var app = angular.module('DataDashboard')
app.controller('OrderController', ['$scope', '$http', 'order', 'shippingMethods', '$marketcloud', 'paymentMethods', 'Countries',
  function (scope, http, order, shippingMethods, $marketcloud, paymentMethods, countries) {
    scope.paymentMethods = paymentMethods.data.data
    scope.countries = countries
    // Data fetched by the resolve
    scope.order = order.data.data

    scope.addressToEdit = {}

    // List of shipping methods
    // @property Array<Object>
    scope.shippingMethods = shippingMethods.data.data

    // New shipment
    scope.newShipment = {
      tracking_code: null,
      tracking_link: null,
      date: new Date(),
      delivery_date: new Date(),
      method: null,
      description: null
    }
    scope.saveShipmentAndFullfill = false

    // New payment
    scope.newPayment = {
      method: 'Manual',
      description: null,
      amount: scope.order.total
    }
    scope.savePaymentAndSetToProcessing = false

    scope.payments = []

    scope.showEditAddressDialog = function (addressToEdit) {
      scope.addressToEdit = addressToEdit
      $('#editAddressModal').modal('show')
    }

    scope.saveAddress = function () {
      $marketcloud.orders.update(scope.order.id, {
        billing_address: scope.order.billing_address,
        shipping_address: scope.order.shipping_address
      })
          .then(function () {
            notie.alert(1, 'Order successfully updated', 1.5)
            $('#editAddressModal').modal('hide')
          })
          .catch(function () {
            notie.alert(2, 'An error has occurred, order not updated', 1.5)
            $('#editAddressModal').modal('hide')
          })
    }
      /* scope.order = null;

      scope.loadingData = true; */

    // Checking shipment dates
    function assignDataToShipments () {
      if (Array.isArray(scope.order.shipments)) {
        scope.order.shipments = scope.order.shipments.map(function (shipment) {
          if (shipment.date) {
            shipment.date = moment(shipment.date)
          }
          if (shipment.delivery_date) {
            shipment.delivery_date = moment(shipment.delivery_date)
          }

          if (shipment.method) {
            scope.shippingMethods.forEach(function (method) {
              if (shipment.method.id === method.id) {
                shipment.method = method
              }
            })
          }

          return shipment
        })
      }
    }

    assignDataToShipments()

    scope.refundedProducts = []

    if (scope.order.refunds) {
      scope.order.refunds.forEach(function (refund) {
        refund.line_items.forEach(function (item) {
          scope.refundedProducts.push(item)
        })
      })
    }

    function getLineItemPrice (lineItem) {
      if (lineItem.variant) {
        if (lineItem.variant.price_discount) { return lineItem.variant.price_discount * lineItem.quantity } else { return lineItem.variant.price * lineItem.quantity }
      } else {
        if (lineItem.price_discount) { return lineItem.price_discount * lineItem.quantity } else { return lineItem.price * lineItem.quantity }
      }
    }

    function getLineItemTaxes (lineItem) {
      var price = getLineItemPrice(lineItem)
      var tax_rate = lineItem.applied_tax_rate

      return ((tax_rate / 100) * price) * lineItem.quantity
    }

    scope.showRefundModal = function () {
      scope.newRefund = {
        created_at: new Date(),
        reason: '',
        line_items: [],
        items_total: 0,
        taxes_total: 0,
        total: 0,
        restock_refunded_items: false
      }

      scope.newRefund.line_items = scope.order.products.map(function (product) {
        var p = angular.copy(product)
        p.quantityInOrder = product.quantity

        p.product_id = product.id

        p.variant_id = 0

        if (p.hasOwnProperty('variant')) { p.variant_id = p.variant.id }

        return p
      })

      scope.updateNewRefund()

      $('#RefundModal').modal('show')
    }

    scope.saveRefund = function () {
      scope.refundErrorMessage = ''

      scope.newRefund.line_items = scope.newRefund.line_items.filter(function (item) {
        return item.quantity > 0
      })

      if (scope.newRefund.total <= 0) {
        scope.refundErrorMessage = 'Refund total must be greater than zero.'
        return
      }

      $marketcloud.refunds.save(scope.order.id, scope.newRefund)
        .then(function (response) {
          $('#RefundModal').modal('hide')
          window.Alert.success({
            message: 'Refund saved successfully!'
          })
        })
        .catch(function (response) {
          scope.refundErrorMessage = 'Unable to create refund. Please review the inserted data.'
        })
    }

    scope.updateNewRefund = function () {
      scope.newRefund.items_total = 0
      scope.newRefund.taxes_total = 0

      scope.newRefund.line_items.forEach(function (item) {
        scope.newRefund.items_total += getLineItemPrice(item)
        scope.newRefund.taxes_total += getLineItemTaxes(item)
      })

      scope.newRefund.total = scope.newRefund.items_total + scope.newRefund.taxes_total
      console.log('updateNewRefund ' + scope.newRefund.total)
    }

    scope.getVariantStyle = function (i) {
      var r = [{
        'color': '#c0392b'
      }, {
        'color': '#27ae60'
      }, {
        'color': '#2c3e50'
      }, {
        'color': '#d35400'
      }]
      return r[i % r.length]
    }
    scope.getVariantClass = function (i) {
      var classes = ['label-empty-info', 'label-empty-success', 'label-empty-warning', 'label-empty-danger']
      return 'label solid ' + (classes[i % classes.length])
    }
    scope.getSelectedVariantValues = function (p) {
      var temp = {}
      Object.keys(p.variantsDefinition)
        .forEach(function (k) {
          temp[k] = p.variant[k]
        })
      return temp
    }

    scope.getSelectedVariantKeysAndValues = function (p) {
      var temp = {}
      Object.keys(p.variantsDefinition)
        .forEach(function (k) {
          temp[k] = k + ': ' + String(p.variant[k])
        })
      return temp
    }

    delete scope.order['items']

    scope.updateStatus = function (status) {
      scope.order.status = status
      $marketcloud.orders.update(scope.order.id, {
        status: scope.order.status
      })
        .then(function (response) {
          notie.alert(1, 'Order successfully updated', 1)
        })
        .catch(function (response) {
          notie.alert(2, 'An error has occurred. Please try again.', 1)
        })
    }

    // Util
    scope.timestampToDate = function (t, showHours) {
      var a = new Date(t)
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      var the_date = a.getDate() + ' ' + months[a.getMonth()] + ' ' + a.getFullYear()

      if (showHours === true) {
        the_date += ' at ' + a.getHours() + ':' + a.getMinutes()
      }

      return the_date
    }

    function syntaxHighlight (json) {
      if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2)
      }

      json = json.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(new RegExp('\n', 'g'), '<br>')
        .replace(new RegExp('\t'), '&nbsp;&nbsp;')
      return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number'
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key'
          } else {
            cls = 'string'
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean'
        } else if (/null/.test(match)) {
          cls = 'null'
        }
        return '<span class="' + cls + '">' + match + '</span>'
      })
    }
    scope.inspectObject = function (p) {
      scope.json = syntaxHighlight(p)
      $('#JsonInspector').modal('show')
    }

    scope.round = function (numb) {
      return Math.round(numb * 1000) / 1000
    }

    scope.fullfill = function () {
      // Sets the order to completed
      notie.confirm('This will set the order as completed, and eventually send notifications. Confirm?',
        'Confirm',
        'Cancel',
        function () {
          $marketcloud.orders.update(scope.order.id, {
            status: 'completed'
          })
            .then(function (response) {
              scope.order.status = 'completed'
              notie.alert(1, 'Order successfully updated', 1)
            })
            .catch(function (response) {
              notie.alert(2, 'An error has occurred. Please try again.', 1)
            })
        })
    }

    scope.setToProcessing = function () {
      // Sets the order to processing
      window.Alert.confirm({
        title: 'Confirm order status update?',
        message: 'This will set the order status to "processing", and eventually send notifications to the customer. Confirm?',
        onConfirm: function () {
          $marketcloud.orders.update(scope.order.id, {
            status: 'processing'
          })
              .then(function (response) {
                scope.order.status = 'processing'
                window.Alert.success({
                  message: 'Order successfully updated'
                })
              })
              .catch(function (response) {
                window.Alert.error({})
              })
        }
      })
        /*      notie.confirm('This will set the order status to "processing", and eventually send notifications to the customer. Confirm?',
                'Confirm',
                'Cancel',
                function() {
                  $marketcloud.orders.update(scope.order.id, {
                      status: 'processing'
                    })
                    .then(function(response) {
                      scope.order.status = 'processing'
                      notie.alert(1, 'Order successfully updated', 1)
                    })
                    .catch(function(response) {
                      notie.alert(2, 'An error has occurred. Please try again.', 1)
                    })
                }) */
    }

    scope.saveShipment = function () {
      // Removing all validation feedback from the shipment
      $('#shipmentModal .has-error').removeClass('has-error')
      $('#shipmentModal .error').remove()

      // Validating the new shipment
      if (scope.newShipment.method === null) {
        $('select[ng-model="newShipment.method"]').parent().addClass('has-error')
        $('select[ng-model="newShipment.method"]').parent().append($('<div class="text-danger">This field is required</div>'))
        return
      }

      if (scope.newShipment.date) { scope.newShipment.date = new Date(scope.newShipment.date) }

      if (scope.newShipment.delivery_date) { scope.newShipment.delivery_date = new Date(scope.newShipment.delivery_date) }

      var shipmentToSave = angular.copy(scope.newShipment)

      // Saving the new shipment
      http({
        method: 'POST',
        url: window.API_BASE_URL + '/orders/' + scope.order.id + '/shipments',
        data: shipmentToSave,
        headers: {
          Authorization: window.public_key + ':' + window.token
        }
      })
        .then(function (response) {
          // Resetting the shipment
          scope.newShipment = {
            tracking_code: null,
            tracking_link: null,
            date: new Date(),
            delivery_date: new Date(),
            method: null,
            description: null
          }
          if (scope.order.shipments) {
            scope.order.shipments.push(shipmentToSave)
          } else {
            scope.order.shipments = [shipmentToSave]
          }

          $('#shipmentModal').modal('hide')

          if (scope.saveShipmentAndFullfill === true) {
            scope.fullfill()
          }

          assignDataToShipments()
        })
        .catch(function (response) {
          // $('#shipmentModal').modal('hide')
          notie.alert(2, 'An error has occurred, please check your input', 1.5)
        })
    }

    scope.updateShipment = function () {
      // Removing all validation feedback from the shipment
      $('#esitShipmentModal .has-error').removeClass('has-error')
      $('#editShipmentModal .error').remove()

      // Validating the new shipment
      if (scope.shipmentToEdit.method === null) {
        $('select[ng-model="shipmentToEdit.method"]').parent().addClass('has-error')
        $('select[ng-model="shipmentToEdit.method"]').parent().append($('<div class="text-danger">This field is required</div>'))
        return
      }

      var shipmentToSave = angular.copy(scope.shipmentToEdit)

      if (shipmentToSave.date && shipmentToSave.date.toDate) {
        shipmentToSave.date = shipmentToSave.date.toDate()
        // scope.shipmentToEdit.date = new Date(scope.shipmentToEdit.date)
      }

      if (shipmentToSave.delivery_date && shipmentToSave.delivery_date.toDate) {
        // scope.shipmentToEdit.delivery_date = new Date(scope.shipmentToEdit.delivery_date)
        shipmentToSave.delivery_date = shipmentToSave.delivery_date.toDate()
      }

      http({
        method: 'PUT',
        url: window.API_BASE_URL + '/orders/' + scope.order.id + '/shipments/' + scope.shipmentToEditIndex,
        data: shipmentToSave,
        headers: {
          Authorization: window.public_key + ':' + window.token
        }
      })
      .then(function (response) {
        scope.shipmentToEdit = {}
        $('#editShipmentModal').modal('hide')
        notie.alert(1, 'Shipment updated', 1.5)
      })
      .catch(function (error) {
        console.log(error)
        notie.alert(2, 'An error has occurred, please check your input', 1.5)
      })
    }

    scope.showShipmentModal = function () {
      $('#shipmentModal').modal('show')
    }

    scope.showEditShipmentModal = function (shipment, index) {
      scope.shipmentToEdit = shipment
      scope.shipmentToEditIndex = index

      $('#editShipmentModal').modal('show')
    }

    scope.showPaymentModal = function () {
      $('#paymentModal').modal('show')
    }

    scope.orderToCSV = function () {

    }

    scope.createPDFInvoice = function () {
      if (!scope.order.invoice_id) { return console.log('Order withouth invoice') }

      http({
        method: 'POST',
        url: window.API_BASE_URL + '/invoices/' + scope.order.invoice_id + '/pdf',
        headers: {
          Authorization: window.public_key + ':' + window.token
        }
      })
      .then(function (response) {
        var invoiceUrl = response.data.data.url
        Object.assign(document.createElement('a'), { target: '_blank', href: invoiceUrl}).click()
      })
      .catch(function (error) {
        alert('error')
        console.log(error)
      })
    }

    scope.createPDFCreditNote = function (refund) {
      http({
        method: 'POST',
        url: window.API_BASE_URL + '/orders/' + scope.order.id + '/refunds/' + refund.id + '/pdf',
        headers: {
          Authorization: window.public_key + ':' + window.token
        }
      })
      .then(function (response) {
        var refundUrl = response.data.data.url
        Object.assign(document.createElement('a'), { target: '_blank', href: refundUrl}).click()
      })
      .catch(function (error) {
        alert('error')
        console.log(error)
      })
    }

    scope.savePayment = function () {
      http({
        method: 'POST',
        url: window.API_BASE_URL + '/orders/' + scope.order.id + '/payments',
        data: scope.newPayment,
        headers: {
          Authorization: window.public_key + ':' + window.token
        }
      })
        .then(function (response) {
          $('#paymentModal').modal('hide')
          notie.alert(1, 'Payment saved', 1.5)
            // var orderPayments = response.data.data.payments
          scope.order.payments = response.data.data.payments

          scope.newPayment = {}

          if (scope.savePaymentAndSetToProcessing === true) {
            scope.setToProcessing()
          }
        })
        .catch(function (response) {
          notie.alert(3, 'An error has occurred, please try again.', 1.5)
          $('#paymentModal').modal('hide')
        })
    }
  }
])
