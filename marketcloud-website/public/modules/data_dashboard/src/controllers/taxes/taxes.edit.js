var app = angular.module('DataDashboard')

app.controller('EditTaxController', [
  '$scope',
  '$http',
  '$marketcloud',
  '$location',
  'Countries',
  'tax',
  'TaxRates',
  '$validation',
  '$models',
  function(scope, http, $marketcloud, location, countries, tax, tax_rates, $validation, $models) {

    scope.tax_rates = tax_rates

    scope.countriesWithTaxRates = scope.tax_rates
      .map(function(r) {
        return r.country
      })
      .filter(function(item, pos, self) {
        return self.indexOf(item) == pos
      })

    scope.countries = countries
    scope.countries.unshift({
      name: '*'
    })

    // Cache of states lists
    scope.states = {}

    // Whenever the country changes,
    // the list of states must be updated
    scope.tax = tax.data.data

    scope.addRate = function() {
      scope.tax.rates.push({
        name: '',
        country: '',
        state: '',
        postcode: '',
        city: '',
        rate: 0,
        priority: 0
      })
    }

    scope.deleteRate = function(index) {
      scope.tax.rates.splice(index, 1)
    }

    scope.updateCity = function(rate) {
      if (rate.postcode.indexOf('*') > -1) {
        rate.city = '*'
      }
    }
    scope.updatePostcode = function(rate) {
      if (rate.state === '*') {
        rate.postcode = '*'
      }
    }

    scope.updateStates = function(rate) {
      if (rate.country === '*') {
        rate.state = '*'
        rate.city = '*'
        return
      }

      http({
          method: 'GET',
          url: '/countries/' + rate.country.toLowerCase()
        })
        .then(function(response) {
          scope.states[rate.country] = response.data
          scope.states[rate.country].unshift({
            name: '*'
          })
        })
        .catch(function(error) {
          var type = error.data.errors[0].type
          scope.states[rate.country] = [{
            name: '*'
          }]

          // We show an empty text input if its not available
          // notie.alert(2,"List of states not available for "+scope.tax.country,2);

          if (type !== 'StatesListNotAvailable') {
            notie.alert(3, 'An error has occurred. Please try again.', 1.5)
          }
        })
    }

    scope.saveTax = function() {
      $marketcloud.taxes.update(scope.tax.id, scope.tax)
        .then(function(response) {
          notie.alert(1, 'Tax saved', 1.5)
        })
        .catch(function(response) {

          if (response.status === 400) {
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            var selector = '[ng-model="tax.' + validation.invalidPropertyName + '"]';

            if (angular.element(selector).length === 0)
              selector = '[validate-for="' + validation.invalidPropertyName + '"]'

            $validation.showErrorMessage(validation, $models.Tax.schema, selector)
          } else
            notie.alert(3, 'An error has occurred.', 2)
        })
    }
  }
])