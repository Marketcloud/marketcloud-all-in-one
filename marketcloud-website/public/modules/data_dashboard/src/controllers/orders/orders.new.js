var app = angular.module('DataDashboard')
app.controller('NewOrderController', ['$scope', '$marketcloud',
  function (scope, marketcloud) {
    scope.order = {
      items: []
    }

    scope.products = [
			{name: 'Scolapasta', price: 12},
			{name: 'Cucchiaio', price: 1},
			{name: 'Forchetta', price: 2}
    ]

    scope.saveOrder = function () {
      console.log('Saving this order', scope.order)
    }

			// Shows/hide modal for products
    scope.toggleProductsModal = function () {
      console.log('Showing products modal')
      $('#itemsModal').modal('show')
    }

			// loads some products from backend
    scope.loadInventory = function (query) {
      console.log('Loading inventory', query)
    }

			// Adds a line item to the order
    scope.addItemToOrder = function (item) {
      console.log('Item added to order', item)
    }

			// loads some addresses from backend
    scope.loadAddresses = function (query) {
      console.log('Loading addresses', query)
    }
  }
])
