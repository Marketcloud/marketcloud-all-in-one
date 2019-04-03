var app = angular.module('DataDashboard')
app.controller('NewInvoiceController', [
  '$scope',
  '$http',
  '$marketcloud',
  '$application',
  '$location',
  'parentOrder',
  'orders',
  'Countries',
  '$validation',
  '$models',
  function (scope, http, $marketcloud, $application, location, parentOrder, orders, countries, $validation, $models) {
    scope.invoice = {
      company: {
        name: $application.get('company_name'),
        email: $application.get('email_address'),
        address: $application.get('company_address'),
        country: $application.get('company_country'),
        city: $application.get('company_city'),
        state: $application.get('company_state'),
        postal_code: $application.get('company_postalcode'),
        vat: $application.get('company_taxid')

      },
      customer: {},
      date_created: new Date(),
      date_due: new Date(),
      lineItems: [{
        name: '',
        description: '',
        quantity: 0,
        price: 0
      }]
    }

    console.log(scope.invoice)

    function setNextInvoiceNumber () {
      $marketcloud.invoices.list()
      .then(function (response) {
        var applicationSettings = $application.get()
        var lastNumber = response.data.data.map(function (invoice) {
          return invoice.number
        })
        .map(function (number) {
          if (number.indexOf && number.indexOf(applicationSettings.invoices_prefix) > -1) {
            number = number.replace(applicationSettings.invoices_prefix, '')
          }

          if (!isNaN(number)) { number = Number(number) }
          return number
        })
        .sort(function (a, b) {
          return a - b
        })
        .pop()

        console.log('LastNumber is ', lastNumber)

        if (!isNaN(lastNumber)) {
          lastNumber = Number(lastNumber)
          scope.invoice.number = applicationSettings.invoices_prefix + String(lastNumber + 1)
        }
      })
      .catch(function (error) {
        console.log(error)
      })
    }

    function fillDataFromOrder (order) {
      console.log('fillDataFromOrder', order)
      scope.parentOrder = order
      scope.invoice = {
        order_id: scope.parentOrder.id,
        company: {
          name: $application.get('company_name'),
          email: $application.get('email_address'),
          address: $application.get('company_address'),
          country: $application.get('company_country'),
          city: $application.get('company_city'),
          state: $application.get('company_state'),
          postal_code: $application.get('company_postalcode'),
          vat: $application.get('company_taxid')
        },
        customer: {},
        date_created: new Date(),
        date_due: new Date(),
        lineItems: scope.parentOrder.products.map(function (p) {
          p.description = ''
          return p
        })
      }

      // adding shipping to line items
      if (scope.parentOrder.hasOwnProperty('shipping')) {
        scope.invoice.lineItems.push({
          name: 'Shipping ' + scope.parentOrder.shipping.name,
          description: scope.parentOrder.shipping.description,
          quantity: 1,
          price: scope.parentOrder.shipping_total
        })
      }

      // adding payment method fee to line items
      if (scope.parentOrder.hasOwnProperty('payment_method')) {
        scope.invoice.lineItems.push({
          name: 'Payment method ' + scope.parentOrder.payment_method.name,
          description: scope.parentOrder.payment_method.description,
          quantity: 1,
          price: scope.parentOrder.payment_method_total
        })
      }

      // adding coupons to line items
      if (scope.parentOrder.hasOwnProperty('coupon')) {
        scope.invoice.lineItems.push({
          name: 'Coupon ' + scope.parentOrder.coupon.name,
          description: scope.parentOrder.coupon.description,
          quantity: 1,
          price: 0 - Number(scope.parentOrder.coupon_total)
        })
      }

      // adding promotions to line items
      if (scope.parentOrder.hasOwnProperty('promotion')) {
        scope.invoice.lineItems.push({
          name: 'Promotion ' + scope.parentOrder.promotion.name,
          description: scope.parentOrder.promotion.description,
          quantity: 1,
          price: 0 - Number(scope.parentOrder.promotion_total)
        })
      }

      // We gather customer's invoicing data from the billing address.
      for (var k in scope.parentOrder.billing_address) {
        scope.invoice.customer[k] = scope.parentOrder.billing_address[k]
      }
    }

    // If the parentOrder is populated, we prefill data
    if (parentOrder && parentOrder.data) {
      // Must check for 404s
      fillDataFromOrder(parentOrder.data.data)
    } else {
      scope.parentOrder = null
    }

    setNextInvoiceNumber()

    scope.orders = orders.data.data
    scope.ordersQuery = {
      per_page: 5,
      page: 1
    }
    scope.showTheList = false
    scope.showList = function () {
      scope.showTheList = true
    }
    scope.hideList = function () {
      window.setTimeout(function () {
        scope.showTheList = false
        scope.$apply()
      }, 200)
    }
    scope.loadNextOrders = function () {
      scope.showTheList = true
      scope.ordersQuery.page += 1

      $marketcloud.orders.list(scope.ordersQuery)
      .then(function (response) {
        scope.orders = response.data.data
      })
      .catch(function (error) {
        notie.alert(3)
      })
    }
    scope.loadPreviousOrders = function () {
      scope.showTheList = true

      if (scope.ordersQuery.page <= 1) { return }

      scope.ordersQuery.page -= 1

      $marketcloud.orders.list(scope.ordersQuery)
      .then(function (response) {
        scope.orders = response.data.data
      })
      .catch(function (error) {
        notie.alert(3)
      })
    }
    scope.selectOrder = function (order) {
      scope.showTheList = false
      scope.invoice.order_id = order.id

      fillDataFromOrder(order)
    }

    scope.countries = countries
    scope.customerStates = []
    scope.companyStates = []

    scope.getInvoiceTotal = function () {
      return scope.invoice.lineItems
        .map(function (item) {
          return item.price * item.quantity
        })
        .reduce(function (a, b) {
          return a + b
        }).toFixed(2)
    }

    scope.updateCompanyStates = function () {
      http({
        method: 'GET',
        url: '/countries/' + scope.invoice.company.country.toLowerCase()
      })
        .then(function (response) {
          scope.companyStates = response.data
        })
        .catch(function (error) {
          var type = null
          if (error.data && error.data.errors && error.data.errors[0]) { type = error.data.errors[0].type }

          if (type === 'StatesListNotAvailable') {
            scope.companyStates = []
          }
          /* else {
            // Commenting this error because it seems to be disorientating for users
            notie.alert(3, 'An error has occurred. Please try again.', 1.5)
          } */
        })
    }

    // Immediatly invoking the function in order to load states
    // but only if the value is already assigned.
    if (scope.invoice.company.country) {
      scope.updateCompanyStates()
    }

    scope.updateCustomerStates = function () {
      if (!scope.invoice.customer.country) { return }

      http({
        method: 'GET',
        url: '/countries/' + scope.invoice.customer.country.toLowerCase()
      })
        .then(function (response) {
          scope.customerStates = response.data
        })
        .catch(function (error) {
          var type = null
          if (error.data && error.data.errors && error.data.errors[0]) { type = error.data.errors[0].type }

          if (type === 'StatesListNotAvailable') {
            scope.customerStates = []
          }/* else {
            // Commenting this error because it seems to be disorientating for users
            notie.alert(3, 'An error has occurred. Please try again.', 1.5)
          } */
        })
    }

    // Immediatly invoking the function in order to load states
    // but only if the value is already assigned.
    if (scope.invoice.customer.country) {
      scope.updateCustomerStates()
    }

    scope.saveInvoice = function (goToOrder) {
      goToOrder = goToOrder || false

      $validation.hideErrors()
      console.log('Salvo questo', angular.copy(scope.invoice))
      $marketcloud.invoices.save(scope.invoice)
        .then(function (response) {
          notie.alert(1, 'Invoice saved', 1.5)
          if (goToOrder === true) {
            return location.path('/orders/' + scope.invoice.order_id + '/view')
          }
          location.path('/invoices')
        })
        .catch(function (response) {
          if (response.status === 400) {
            notie.alert(2, 'The data you entered has some errors', 1.5)

            var validation = response.data.errors[0]
            var selector = '[ng-model="invoice.' + validation.invalidPropertyName + '"]'

            if (angular.element(selector).length === 0) { selector = '[validate-for="' + validation.invalidPropertyName + '"]' }

            $validation.showErrorMessage(validation, $models.Invoice.schema, selector)
          } else { notie.alert(3, 'An error has occurred. Please try again', 2) }
        })
    }

    scope.addLineItem = function () {
      scope.invoice.lineItems.push({
        name: '',
        description: '',
        quantity: null,
        price: null
      })
    }
  }
])
