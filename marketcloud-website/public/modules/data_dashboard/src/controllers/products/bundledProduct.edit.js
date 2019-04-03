angular.module('DataDashboard').controller('EditBundledProductController', ['$scope', '$marketcloud', 'product', '$http',
  function (scope, $marketcloud, product, $http) {
    scope.customPropertiesData = {}

			// Injecting resolve data into the controller
    scope.product = product.data.data

    if (!scope.product.hasOwnProperty()) {
      var product_ids = []
    }

    scope.product.lists.forEach(function (list) {
      var this_list_ids = list.items.map(function (item) {
        return item.product_id
      })
      product_ids = product_ids.concat(this_list_ids)
    })

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

    $marketcloud.products.list({
      id: product_ids.join(',')
    })
			.then(function (response) {
  var p_map = {}

  response.data.data.forEach(function (i) {
    p_map[i.id] = i
  })

				// We fetch the products data, then we must add the properties
				// related to them being in the bundled product
  scope.product.lists.map(function (opt) {
    opt.items = opt.items.map(function (item) {
      return p_map[item.product_id]
    })
    return opt
  })
})
			.catch(function (error) {
  notie.alert(3, 'An error has occurred', 1.5)
})

			// mapping non-core attributes into scope.customPropertiesData
    var coreProperties = Models.Product.getPropertyNames()
    coreProperties.push('product_id', 'variant_id', 'display_price', 'display_price_discount', 'lists')
    for (var k in scope.product) {
      if (coreProperties.indexOf(k) < 0) {
        scope.customPropertiesData[k] = scope.product[k]
        delete scope.product[k]
      }
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

			// This method must be implemented in order to
			// make the media manager work
    scope.getImagesContainer = function () {
      return scope.product.images
    }

    scope.removeImage = function (i) {
      scope.product.images.splice(i, 1)
    }

    scope.categories = []

    $marketcloud.categories.list()
				.then(function (response) {
  scope.categories = response.data.data
})
				.catch(function () {
  notie.alert(2, 'An error has occurred while loading categories', 1.5)
})

    scope.brands = []
			// Loading brands

    $marketcloud.brands.list()
				.then(function (response) {
  scope.brands = response.data.data
})
				.catch(function () {
  notie.alert(2, 'An error has occurred while loading brands', 1.5)
})

    scope.newAttribute = {
      name: null,
      value: null,
      type: null
    }
    scope.newAttribute.type = 'string'
    scope.availableTypes = [
				{name: 'String', value: 'string'},
				{name: 'Number', value: 'number'},
				{name: 'Boolean', value: 'boolean'}
    ]

    scope.filterNotNullProperties = function (item) {
      var result = {}
      for (var k in item) {
        if (item[k]) {
          result[k] = item[k]
        }
      }
      return result
    }

    scope.updateProduct = function () {
      var update = angular.copy(scope.product)
				// let's re-assemble the product first.
      for (var k in scope.customPropertiesData) {
        update[k] = scope.customPropertiesData[k]
      }

      update.lists.forEach(function (list) {
        list.items = list.items.map(function (item) {
          return {product_id: item.id}
        })
      })

      $marketcloud.products.update(update.id, update)
					.then(function (response) {
  notie.alert(1, 'Update Succeded', 1.5)
})
					.catch(function (response) {
  notie.alert(3, 'Update failed', 1.5)
})
    }
  }
])
