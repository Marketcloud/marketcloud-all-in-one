angular.module('DataDashboard')
.controller('ListVariantsController', ['$scope', '$marketcloud', '$routeParams', '$http', 'resolvedProduct',
  function(scope, $marketcloud, params, $http, resolvedProduct) {
    
    scope.product = resolvedProduct.data.data

    // These cannot be touched
    scope.variantDefiningProperties = {}

    scope.deleteVariant = function(variant) {
    return $http({
        method: 'DELETE',
        url: API_BASE_URL + '/products/' + scope.product.id + '/variants/' + variant.id,
        headers: {
          Authorization: window.public_key + ':' + window.token
        }
      })
      .then(function(response) {
        notie.alert(1, 'Variant deleted', 1.5)
        scope.product = response.data.data
      })
      .catch(function(response) {
        notie.alert(3, 'An error has occurred, please try again.', 1.5)
      })
  }

  scope.clone = function(variant) {
        var variantToSave = angular.copy(variant)
          // Removing useless stuff in the variant
        delete variantToSave['id']

        return $http({
              method: 'POST',
              url: API_BASE_URL + '/products/' + scope.product.id + '/variants',
              data: variantToSave,
              headers: {
                Authorization: window.public_key + ':' + window.token
              }
        })
        .then( function(response){
          notie.alert(1,"Variant successfully cloned",2);
        })
        .catch( function(response){
          notie.alert(2,"An error has occurred, please try again",2);
        })

      }


    scope.filterVariantProps = function(o) {
      var p = {}
      for (var k in o) {
        // if its not an inherited property, then it's a variant property name
        if (scope.product.variantsDefinition.hasOwnProperty(k)) {
          p[k] = k + ': ' + String(o[k])
        }
      }
      return p

      // return o
    }

    
    scope.getVariantStyle = function(i) {
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






   
  }
])