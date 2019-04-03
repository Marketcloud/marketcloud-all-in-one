var app = angular.module('DataDashboard')

app.controller('SettingsController', [
  '$scope',
  '$http',
  'Currencies',
  'Timezones',
  'Countries',
  '$application',
  function (scope, http, currencies, timezones, countries, $application) {
    scope.countries = countries
    scope.timezones = timezones
    scope.application = $application.get()

    scope.images = []

    scope.application.apply_discounts_before_taxes = Boolean(scope.application.apply_discounts_before_taxes)

    scope.currencies = Object.keys(currencies)
      .map(function (c) {
        return currencies[c]
      })
      .map(function (c) {
        c.label = c.name + ' (' + c.symbol + ')'
        return c
      })
      .sort(function (a, b) {
        a = a.name
        b = b.name
        if (a > b) {
          return 1
        } else if (b > a) {
          return -1
        } else {
          return 0
        }
      })

    scope.tax_options = [{
      value: 'nothing',
      label: 'Don\'t tax'
    }, {
      value: 'products_only',
      label: 'Tax products only'
    }, {
      value: 'shipping_only',
      label: 'Tax shipping only'
    }, {
      value: 'all',
      label: 'Tax shipping and products'
    }]

    scope.refreshApplicationData = function () {
      $http({
        url: '/applications/list/' + Number(scope.application.id),
        method: 'GET'
      })
        .then(function (response) {
          $application.set(response.data.data)
        })
        .catch(function (error) {
          notie.alert(3, "An error has occurred while reloading application's data. Refreshing the page...")
          window.location.reload()
        })
    }

    scope.updateSettings = function () {
      var payload = {
        name: scope.application.name,
        url: scope.application.url,
        timezone: scope.application.timezone,
        currency_code: scope.application.currency_code,
        tax_rate: scope.application.tax_rate,
        tax_type: scope.application.tax_type,
        apply_discounts_before_taxes: scope.application.apply_discounts_before_taxes,
        email_address: scope.application.email_address,
        company_name: scope.application.company_name,
        company_taxid: scope.application.company_taxid,
        company_country: scope.application.company_country,
        company_state: scope.application.company_state,
        company_city: scope.application.company_city,
        company_address: scope.application.company_address,
        company_postalcode: scope.application.company_postalcode,
        invoices_prefix: scope.application.invoices_prefix
      }

      if (scope.images.length >= 1) { payload.logo = scope.images[0] }

      http({
        method: 'PUT',
        url: window.API_BASE_URL + '/application',
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': window.public_key + ':' + window.token
        }
      })
        .then(function (response) {
          notie.alert(1, 'Application successfully updated', 1)
        })
        .catch(function (err) {
          notie.alert(3, 'An error has occurred.')
        })
    }
  }
])
