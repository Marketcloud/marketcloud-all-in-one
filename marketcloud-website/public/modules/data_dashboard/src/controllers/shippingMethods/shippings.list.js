var app = angular.module('DataDashboard')
app.controller('ShippingsController',
    [
      '$scope',
      '$http',
      '$location',
      'Countries',
      'shippings',
      '$marketcloud',
      '$utils',
    function(scope, http, location, countries, shippings, $marketcloud, $utils) {

    scope.shippings = shippings.data.data

    scope.countries = countries;

    scope.pagination = $utils.getPaginationFromHTTPResponse(shippings);

    // Holding query fields
    // When listing data this oobject is sent
    scope.query = {
      per_page: 20
    }

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


    scope.getShippingRules = function(shipping) {
      var o = {}
      for (var k in shipping) {
        if (scope.availableRules.indexOf(k) > -1) {
          o[k] = angular.copy(shipping[k])
        }
      }

      console.log("Le shipping rules", o)
      return o
    }

    scope.ruleNameToDescription = function(name) {
      return name.replace(/\_/gi, ' ')
        .replace(/min/, 'Minimum')
        .replace(/max/, 'Maximum')
    }

    scope.loadData = function() {
      if (scope.query.q === '') {
        delete scope.query.q
      }

      return $marketcloud.shippings.list(scope.query)
        .then(function(response) {
          scope.shippings = response.data.data;
          scope.pagination = $utils.getPaginationFromHTTPResponse(response);
        })
        .error(function(response) {
          notie.alert(3, 'An error has occurred. Please try again', 1.5)
        })
    }

    scope.loadPage = function(page_number) {
      scope.query.page = Number(page_number)
      scope.loadData()
    }

    scope.deleteShipping = function(id) {
      $marketcloud.shippings.delete(id)
        .then(function(response) {
          notie.alert(1, 'Shipping method successfully deleted', 1.5)
          scope.loadPage()
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred', 1.5)
        })
    }

    /************************************************************
     *                        DUPLICATE
     **************************************************************/
    scope.clone = function(shippingRule) {
      console.log("Cloning");
      
      var toSave = angular.copy(shippingRule)
      delete shippingRule.id
      delete toSave._id

      toSave.name += ' (Copy)'


      $marketcloud.shippings.save(toSave)
        .then(function(response) {
          scope.loadPage();
          notie.alert(1,"Shipping rule successfully cloned",1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again.', 1.5)
        })
    }
  }
])