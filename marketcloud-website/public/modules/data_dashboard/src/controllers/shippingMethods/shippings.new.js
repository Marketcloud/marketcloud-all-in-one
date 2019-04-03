var app = angular.module('DataDashboard')
app.controller('CreateShippingController', [
  '$scope',
  '$http',
  '$location',
  'Countries',
  '$marketcloud',
  '$validation',
  '$models',
  function(scope, http, location, countries, $marketcloud, $validation, $models) {
    scope.availableRules = [
      'max_value',
      'min_value',
      'max_weight',
      'min_weight',
      'max_height',
      'min_height',
      'max_depth',
      'min_depth',
      'max_width',
      'min_width'
    ]

    scope.getShippingRules = function() {
      var o = {}
      for (var k in scope.shipping) {
        if (scope.availableRules.indexOf(k) > -1) {
          o[k] = angular.copy(scope.shipping[k])
        }
      }
      return o
    }
    scope.howManyRules = function(o) {
      var count = 0

      for (var k in scope.shipping) {
        if (scope.availableRules.indexOf(k) > -1) {
          count++
        }
      }
      return count
    }

    scope.countries = angular.copy(countries)

    scope.filterCountries = function(query) {
      var data = scope.countries.filter(function(country) {
        return country.name.indexOf(query) > -1
      }).sort(function(a, b) {
        return a.name > b.name
      })
      return {
        data: data
      }
    }

    // Adding a handy "all" destination
    scope.countries.unshift({
      name: 'All countries',
      code: 'ALL'
    })

    scope.shipping = {
      name: '',
      base_cost: 0,
      per_item_cost: 0,
      zones: []
    }

    scope.newRule = {}
    scope.addRule = function() {
      scope.shipping[scope.newRule.name] = scope.newRule.value

      scope.newRule = {}
    }

    scope.removeRule = function(name) {
      delete scope.shipping[name]
    }

    scope.ruleNameToDescription = function(name) {
      return name.replace(/\_/gi, ' ').replace(/min/, 'Minimum').replace(/max/, 'Maximum')
    }

    scope.newZone = {}
    scope.addZone = function() {
      scope.shipping.zones.push(scope.newZone)
      scope.newZone = null
    }
    scope.removeZone = function($index) {
      scope.shipping.zones.splice($index, 1)
    }

    scope.saveShipping = function() {
      
      $validation.hideErrors()

      $marketcloud.shippings.save(scope.shipping)
        .then(function(response) {
          notie.alert(1, 'Shipping saved.', 1.5)
          location.path('/shippings')
        })
        .catch(function(response) {

          if (response.status === 400){
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            var selector = '[ng-model="shipping.'+validation.invalidPropertyName+'"]';

            if (angular.element(selector).length === 0)
              selector = '[validate-for="'+validation.invalidPropertyName+'"]'

            $validation.showErrorMessage(validation,$models.Shipping.schema , selector)
          } else 
            notie.alert(3, 'An error has occurred.', 2)
        })
    }
  }
])