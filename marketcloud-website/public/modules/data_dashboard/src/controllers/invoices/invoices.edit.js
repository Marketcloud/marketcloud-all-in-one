var app = angular.module('DataDashboard')
app.controller('EditInvoiceController', [
  '$scope',
  '$http',
  '$marketcloud',
  '$location',
  'invoice',
  'Countries',
  '$validation',
  '$models',
  function (scope, http, $marketcloud, location, invoice, countries, $validation, $models) {
    scope.invoice = invoice.data.data
    console.log('Prima di fottere le date', angular.copy(scope.invoice))
    // Angular wants the input[date] to be valid date objects :@
    scope.invoice.date_due = moment(scope.invoice.date_due)
    scope.invoice.date_created = moment(scope.invoice.date_created)

    console.log('Dopo di fottere le date', angular.copy(scope.invoice))

    scope.countries = countries
    scope.customerStates = []
    scope.companyStates = []

    scope.alert = function (m) {
      window.alert(m)
    }

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
          // url : '/modules/shared/geography/countries/'+scope.invoice.company.country.toLowerCase()+'.json'
        url: '/countries/' + scope.invoice.company.country.toLowerCase()
      })
        .then(function (response) {
          scope.companyStates = response.data
        })
        .catch(function (error) {
          console.log(error)
          var type = null
          if (error.data && error.data.errors && error.data.errors[0]) { type = error.data.errors[0].type }

          if (type === 'StatesListNotAvailable') {
            scope.companyStates = []
          } else {
            notie.alert(3, 'An error has occurred. Please try again.', 1.5)
          }
        })
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
          } else {
            notie.alert(3, 'An error has occurred. Please try again.', 1.5)
          }
        })
    }

    scope.updateCustomerStates()
    scope.updateCompanyStates()
    scope.debug = function () { console.log(scope.invoice) }

    scope.saveInvoice = function () {
      if (typeof scope.invoice.date_created.toDate === 'function') {
        scope.invoice.date_created = scope.invoice.date_created.toDate()
        scope.invoice.date_created.setHours(12)
      }
      if (typeof scope.invoice.date_due.toDate === 'function') {
        scope.invoice.date_due = scope.invoice.date_due.toDate()
        scope.invoice.date_due.setHours(12)
      }
      console.log('Salvo', angular.copy(scope.invoice))
      $validation.hideErrors()
      $marketcloud.invoices.update(scope.invoice.id, scope.invoice)
        .then(function (response) {
          notie.alert(1, 'Invoice saved', 1.5)
          location.path('/invoices')
        })
        .catch(function (response) {
          if (response.status === 400) {
            notie.alert(2, 'The data you entered has some errors', 1.5)

            var validation = response.data.errors[0]
            var selector = '[ng-model="invoice.' + validation.invalidPropertyName + '"]'

            if (angular.element(selector).length === 0) { selector = '[validate-for="' + validation.invalidPropertyName + '"]' }

            $validation.showErrorMessage(validation, $models.Invoice.schema, selector)
          } else { notie.alert(3, 'An error has occurred.', 2) }
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
