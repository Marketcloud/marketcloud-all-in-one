
angular.module('DataDashboard').controller('NewBundledProductController', [
  '$scope', '$http', '$location', '$marketcloud',
  function (scope, $http, location, $marketcloud) {
    scope.categories = []
    scope.catch = null
    scope.newCategory = {}
    scope.brands = []
    scope.newBrand = {}

			// This method must be implemented in order to
			// make the media manager work
    scope.getImagesContainer = function () {
      return scope.product.images
    }

    scope.removeImage = function (i) {
      scope.product.images.splice(i, 1)
    }

    function getSlugFromString (v) {
      return	v
						.split(' ')
						.map(function (item) { return item.replace(/\W/g, '') })
						.map(function (item) { return item.toLowerCase() })
						.join('-')
    }
    scope.unsafeSlug = false

    scope.updateSlug = function () {
      scope.product.slug = getSlugFromString(scope.product.name)
    }

    scope.loadCategories = function () {
      $marketcloud.categories.list({})
					.then(function (response) {
  scope.categories = response.data.data
})
					.catch(function () {
  console.log('An error has occurred while loading categories')
})
    }

			// Initializing the categories array
    scope.loadCategories()

    scope.saveCategory = function () {
      $marketcloud.categories.save(scope.newCategory)
					.then(function (response) {
  $('#newCategoryModal').modal('hide')
  scope.categories.push(scope.newCategory)
  scope.newCategory = {}
})
					.catch(function (response) {
  $('#newCategoryModal').hide()
  notie.alert(3, 'An error has occurred. Category not saved', 1)
})
    }

    scope.loadBrands = function () {
      $marketcloud.brands.list({})
					.then(function (response) {
  scope.brands = response.data.data
})
					.catch(function () {
  notie.alert(2, 'An error has occurred while loading brands', 1.5)
})
    }
			// Initializing the brands array
    scope.loadBrands()

    scope.saveBrand = function () {
      $marketcloud.brands.save(scope.newBrand)
					.then(function (response) {
  $('#newBrandModal').modal('hide')
  scope.brands.push(scope.newBrand)
  scope.newBrand = {}
})
					.catch(function (response) {
  $('#newBrandModal').hide()
  notie.alert(3, 'An error has occurred. Brand not saved', 1)
})
    }

    scope.addProductsCardConfig = {
      additionalFields: []
    }
    scope.addNewList = function () {
      scope.product.lists.unshift({
        name: '',
        required: false,
        items: []
      })
    }

    scope.removeList = function (index) {
      scope.product.lists.splice(index, 1)
    }

    scope.showAddProductsToListModal = function (list) {
      scope.currentList = list
      $('#addProductsToListModal').modal('show')
    }

    scope.product = {
      type: 'bundled_product',
      name: '',
      description: '',
      stock_type: 'status',
      stock_status: 'in_stock',
      images: [],
      media: [],
      has_variants: false,
      published: true,
      lists: []
    }

    scope.productError = null
    scope.newCustomProperty = {}
    scope.customPropertiesData = {}

			// This contains validation Errors
    scope.Forms = {}

    scope.Forms.newCustomProperty = {
      name: null,
      value: null
    }

			// Array of new properties's names (strings)
    scope.customPropertiesNames = []

    scope.hideErrors = function () {
      scope.catch = null
      scope.catchField = null
    }

    scope.saveProduct = function (skipSaving) {
      for (var k in scope.product) {
        if (scope.product[k] === null) {
          delete scope.product[k]
        }
      }

      scope.hideErrors()

				// Custom properties cannot be validated through Schematic.
      var props_to_validate = {}
      var known_props = Models.GroupedProduct.getPropertyNames()
      for (var k in scope.product) {
        if (known_props.indexOf(k) > -1) { props_to_validate[k] = scope.product[k] }
      }

      for (var k in scope.customPropertiesData) {
        scope.product[k] = scope.customPropertiesData[k]
      }

      for (var key in scope.product) {
        if (scope.product[key] === null) {
          delete scope.product[key]
        }
      }

      var to_save = angular.copy(scope.product)

      for (var k in to_save.lists) {
        to_save.lists[k].items = to_save.lists[k].items.map(function (item) {
          return {product_id: item.id}
        })
      }

      if (skipSaving === true) { return }
      $marketcloud.products.save(to_save)
					.then(function (response) {
  notie.alert(1, 'Product saved', 1.5)
  location.path('/products')
})
					.catch(function (response) {
  notie.alert(2, 'An error has occurred. Product not saved', 1)
})
    }
  }
])
