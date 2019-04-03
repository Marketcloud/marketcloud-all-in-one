angular.module('DataDashboard')
.controller('EditCollectionController', [
  '$scope', 
  '$http', 
  '$marketcloud', 
  '$location', 
  'collection',
  '$utils',
  '$validation',
  '$models',
  function(scope, http, $marketcloud, location, collection,$utils,$validation, $models) {
    scope.collection = collection.data.data

    scope.products = []
    scope.itemsToAdd = angular.copy(scope.collection.items)

    scope.query = {}

    // This will hold custom properties for further processing
    scope.customPropertiesData = {}

      // mapping non-core attributes into scope.customPropertiesData
    var coreProperties = Models.Collection.getPropertyNames();

    coreProperties.push(
        'id',
        'application_id',
        'seo'
        )

    for (var k in scope.collection) {
      if (coreProperties.indexOf(k) < 0) {
        scope.customPropertiesData[k] = scope.collection[k]
        delete scope.collection[k]
      }
    }

    scope.unsafeSlug = false

    scope.updateSlug = function() {
      scope.collection.slug = $utils.getSlugFromString(scope.collection.name)
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

        // let's re-assemble the custom properties first.
      for (var k in scope.customPropertiesData) {
        scope.collection[k] = scope.customPropertiesData[k]
      }
      scope.collection.items = scope.itemsToAdd.map(function(item) {
        return {
          product_id: item.id
        }
      })
      $marketcloud.collections.update(scope.collection.id, scope.collection)
        .then(function(response) {
          notie.alert(1, 'Collection saved', 1.5)
        })
        .catch(function(response) {

          if (response.status === 400){
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            $validation.showErrorMessage(validation,$models.Collection.schema , '[ng-model="collection.'+validation.invalidPropertyName+'"]')
          } else 
            notie.alert(3, 'An error has occurred.', 2)
        })
    }
  }
])