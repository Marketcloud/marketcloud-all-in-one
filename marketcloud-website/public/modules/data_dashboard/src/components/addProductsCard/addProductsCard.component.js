var app = angular.module('DataDashboard')

/*
* @attribute overrides {object} set of overrides to apply
          when querying marketcloud
*
*/
app.controller('addProductsCardController', [
  '$scope', '$element', '$attrs', '$marketcloud',
  function (scope, $element, $attrs, $marketcloud) {

    
    this.$onInit = function () {
      scope.ctrl = this

      scope.config = this.config || {
        additionalFields: [
          // {name : "quantity", type : "number", required : true}
        ]
      }

      scope.swapArrayItemPosition = function(sourceIndex,destinationIndex, arr){
        if (!arr[sourceIndex] || !arr[destinationIndex])
          return;

        var temp = angular.copy(arr[destinationIndex]);
        arr[destinationIndex] = arr[sourceIndex];
        arr[sourceIndex] = temp;

      }

      // Flag to show/hide the list
      scope.showTheList = false

      // Object to hold the query data
      scope.query = {}

      // Here we save the products we get from marketcloud
      scope.products = []
    }

    scope.prepareRegex = function () {
      scope.query.name.$options = 'i'
    }

    // Shows the list of choices
    scope.showList = function () {
      scope.showTheList = true
    }

    // Hides the list of choices
    scope.hideList = function () {
      window.setTimeout(function () {
        scope.showTheList = false
        scope.$apply()
      }, 200)
    }

    /*
     *  Pushes an item into the array of selected items and resets the search regex
     */
    scope.addProduct = function (product) {
      scope.ctrl.items.push(product)
      scope.query.name.$regex = ''
      scope.products = []
    }

    scope.removeProduct = function (i) {
      scope.ctrl.items.splice(i, 1)
    }
    scope.loadProducts = function (query) {
      query = query || scope.query

      // We only want to fetch simple products here
      // TODO, this should be an attribute
      if (scope.ctrl.overrides) {
        for (var k in scope.ctrl.overrides) {
          query[k] = scope.ctrl.overrides[k]
        }
      }

      $marketcloud.products.list(query)
        .then(function (response) {
          scope.products = response.data.data
            .filter(function (item) {
              return scope.ctrl.items
                .map(function (i) {
                  return i.id
                })
                .indexOf(item.id) < 0
            })
        })
        .catch(function (response) {
          notie.alert(3, 'An error has occurred. Please try again', 1.5)
        })
    }
  }
])
app
  .component('addProductsCard', {
    templateUrl: '/modules/data_dashboard/src/components/addProductsCard/addProductsCard.component.html',
    controller: 'addProductsCardController',
    bindings: {
      items: '=',
      config: '=',
      overrides: '=', // overrides to the query
      title: '@',
      onUpdate: '&'
    }
  })
