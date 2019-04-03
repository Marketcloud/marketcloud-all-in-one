var app = angular.module('DataDashboard')
var controller = null
app.controller('EditShippingController', [
  '$scope',
  '$http',
  '$location',
  'Countries',
  'shipping',
  '$marketcloud',
  '$validation',
  '$models',
  function(scope, http, location, countries, shippingRequest, $marketcloud, $validation, $models) {
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
    scope.countries.unshift({
      name: 'All countries',
      code: 'ALL'
    }, {
      name: 'Europe',
      code: 'EUROPE'
    })

    scope.shipping = {
      availability: 'ALL',
      base_cost: 0,
      per_item_cost: 0,
      zones: []
    }

    scope.shipping = shippingRequest.data.data;

    scope.shipping.zones = scope.shipping.zones || [];

    scope.newRule = {}
    scope.addRule = function() {
      scope.shipping[scope.newRule.name] = scope.newRule.value

      scope.newRule = {}
    }

    scope.removeRule = function(name) {
      scope.shipping[name] = null;
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
      scope.shipping.zones.splice($index, 1);
    }

    scope.updateShipping = function() {
      
      $validation.hideErrors();

      $marketcloud.shippings.update(scope.shipping.id, scope.shipping)
        .then(function(response) {
          notie.alert(1, 'Shipping updated', 2)
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