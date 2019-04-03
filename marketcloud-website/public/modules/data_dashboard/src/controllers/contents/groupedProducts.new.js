
angular.module('DataDashboard').controller('NewGroupedProductController', [
  '$scope', '$http', '$location', '$marketcloud',
  function (scope, $http, location, $marketcloud) {
    scope.categories = []
    scope.error = null
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
					.success(function (response) {
  scope.categories = response.data
})
					.error(function () {
  console.log('An error has occurred while loading categories')
})
    }

			// Initializing the categories array
    scope.loadCategories()

    scope.saveCategory = function () {
      $marketcloud.categories.save(scope.newCategory)
					.success(function (response) {
  $('#newCategoryModal').modal('hide')
  scope.categories.push(scope.newCategory)
  scope.newCategory = {}
})
					.error(function (response) {
  $('#newCategoryModal').hide()
  notie.alert(3, 'An error has occurred. Category not saved', 1)
})
    }

    scope.loadBrands = function () {
      $marketcloud.brands.list({})
					.success(function (response) {
  scope.brands = response.data
})
					.error(function () {
  console.log('An error has occurred while loading brands')
})
    }
			// Initializing the brands array
    scope.loadBrands()

    scope.saveBrand = function () {
      $marketcloud.brands.save(scope.newBrand)
					.success(function (response) {
  $('#newBrandModal').modal('hide')
  scope.brands.push(scope.newBrand)
  scope.newBrand = {}
})
					.error(function (response) {
  $('#newBrandModal').hide()
  notie.alert(3, 'An error has occurred. Brand not saved', 1)
})
    }

    scope.product = {
      type: 'grouped_product',
      price: 0,
      name: '',
      description: '',
      stock_type: 'status',
      stock_status: 'in_stock',
      images: [],
      has_variants: false,
      published: true,
      items: []

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
      scope.error = null
      scope.errorField = null
    }

    scope.saveProduct = function () {
      for (var k in scope.product) {
        if (scope.product[k] === null) {
          delete scope.product[k]
          console.log('Un null')
        }
      }

      scope.hideErrors()

				// Custom properties cannot be validated through Schematic.
      var props_to_validate = {}
      var known_props = Models.GroupedProduct.getPropertyNames()
      for (var k in scope.product) {
        if (known_props.indexOf(k) > -1) {
          props_to_validate[k] = scope.product[k]
        }
      }
				/* var validation = Models.GroupedProduct.validate(scope.product);

				if (validation.valid === false) {
					scope.errorField = validation.invalidPropertyName;

					if (validation.failedValidator === 'required')
						scope.error = 'The ' + scope.errorField + ' field is required';
					else if (validation.failedValidator === 'min') {
						if ('string' === typeof scope.product[validation.invalidPropertyName])
							scope.error = 'The ' + scope.errorField + ' field must have at least ' + Models.Product.schema[validation.invalidPropertyName].min + ' characters';
						else
							scope.error = 'The ' + scope.errorField + ' field must be greater than or equal to ' + Models.Product.schema[validation.invalidPropertyName].min;

					} else if (validation.failedValidator === 'max') {

						if ('string' === typeof scope.product[validation.invalidPropertyName])
							scope.error = 'The ' + scope.errorField + ' field must have less than ' + Models.Product.schema[validation.invalidPropertyName].max + ' characters';
						else
							scope.error = 'The ' + scope.errorField + ' field must be lesser than or equal to ' + Models.Product.schema[validation.invalidPropertyName].min;
					} else {
						scope.error = 'The ' + scope.errorField + ' field has an invalid value ('+props_to_validate[scope.errorField]+')';
					}
					return;
				} */

      for (var k in scope.customPropertiesData) {
        scope.product[k] = scope.customPropertiesData[k]
      }

      for (var key in scope.product) {
        if (scope.product[key] === null) {
          delete scope.product[key]
        }
      }
      console.log('Saving this prod', scope.product)

      scope.product.items = scope.product.items.map(function (item) {
        return {product_id: item.id}
      })

      $marketcloud.products.save(scope.product)
					.success(function (response) {
  notie.alert(1, 'Product saved', 1.5)
  location.path('/products')
})
					.error(function (response) {
  notie.alert(2, 'An error has occurred. Product not saved', 1)
})
    }
  }
])
