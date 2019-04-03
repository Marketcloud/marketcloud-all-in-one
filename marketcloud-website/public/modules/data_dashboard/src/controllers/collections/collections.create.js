var app = angular.module('DataDashboard')

app.controller('CreateCollectionController', ['$scope', '$http', '$marketcloud', '$location',
  function(scope, http, $marketcloud, location) {
    scope.collection = {
      items: []
    }

    scope.products = []
    scope.itemsToAdd = []

    scope.customPropertiesData = {};

    scope.query = {}

    // Slug related functions
    function getSlugFromString(v) {
      return v
        .split(' ')
        .map(function(item) {
          return item.replace(/\W/g, '')
        })
        .map(function(item) {
          return item.toLowerCase()
        })
        .join('-')
    }
    scope.unsafeSlug = false

    scope.updateSlug = function() {
      scope.collection.slug = getSlugFromString(scope.collection.name)
    }

    scope.prepareRegex = function() {
      scope.query.name.$options = 'i'
    }

    scope.addProductToCollection = function(product) {
      scope.itemsToAdd.push(product)
      scope.query.name.$regex = ''
      scope.products = []
    }

    scope.removeProductFromCollection = function(i) {
      scope.itemsToAdd.splice(i, 1)
    }

    scope.showTheList = false
    scope.showList = function() {
      scope.showTheList = true
    }
    scope.hideList = function() {
      window.setTimeout(function() {
        scope.showTheList = false
        scope.$apply()
      }, 200)
    }
    scope.loadProducts = function(query) {
      query = query || scope.query

      $marketcloud.products.list(query)
        .then(function(response) {
          scope.products = response.data.data
            .filter(function(item) {
              return scope.itemsToAdd
                .map(function(i) {
                  return i.id
                })
                .indexOf(item.id) < 0
            })
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again')
        })
    }

    scope.loadProducts()

    scope.saveCollection = function() {
      for (var k in scope.customPropertiesData) {
        scope.collection[k] = scope.customPropertiesData[k]
      }
      scope.collection.items = scope.itemsToAdd.map(function(item) {
        return {
          product_id: item.id
        }
      })
      $marketcloud.collections.save(scope.collection)
        .then(function(response) {
          notie.alert(1, 'Collection saved', 1.5)
          location.path('/collections')
        })
        .catch(function(response) {
          notie.alert(2, 'An error has occurred, please try again', 1.5)
        })
    }
  }
])