angular.module('DataDashboard').controller('EditGroupedProductController', ['$scope', '$marketcloud', 'product', '$http',
  function (scope, $marketcloud, product, $http) {
    scope.customPropertiesData = {}

    scope.itemsToAdd = []

			// Injecting resolve data into the controller
    scope.product = product.data.data

    var product_ids = scope.product.items.map(function (product) {
      return product.product_id
    })

    $marketcloud.products.list({
      id: product_ids.join(',')
    })
			.then(function (response) {
  var p_map = {}

  scope.product.items.forEach(function (i) {
    p_map[i.product_id] = i
  })

				// We fetch the products data, then we must add the properties
				// related to them being in the grouped product, such as the quantity
  scope.itemsToAdd = response.data.data.map(function (prod) {
    var p = angular.copy(prod)
    p.quantity = p_map[p.id]['quantity']
    return p
  })
				// scope.product.items = response.data.data;
})
			.catch(function (error) {
  notie.alert(3, 'An error has occurred', 1.5)
})

			// mapping non-core attributes into scope.customPropertiesData
    var coreProperties = Models.Product.getPropertyNames()
    coreProperties.push('product_id', 'variant_id', 'display_price', 'display_price_discount', 'items')
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
			// Loading categories
			/* $http({
				method: 'GET',
				url: API_BASE_URL+'/categories',
				headers: {
					Authorization: window.public_key + ':' + window.token
				}
			}) */
    $marketcloud.categories.list()
				.success(function (response) {
  scope.categories = response.data
})
				.error(function () {
  notie.alert(2, 'An error has occurred while loading categories', 2)
})

    scope.brands = []
			// Loading brands

    $marketcloud.brands.list()
				.success(function (response) {
  scope.brands = response.data
})
				.error(function () {
  notie.alert(2, 'An error has occurred while loading brands', 2)
})

    scope.filterVariantProps = function (o) {
      var p = {}
      for (var k in o) {
					// if its not an inherited property, then it's a variant property name
        if (scope.product.variantsDefinition.hasOwnProperty(k)) {
          p[k] = o[k]
        }
      }
      return p

				// return o
    }

    scope.getVariantStyle = function (i) {
				// var r = [{"color" : "red"},{"color" : "green"},{"color" : "blue"}, {"color" : "pink"}
				// ]
      var r = ['label-info', 'label-danger', 'label-warning', 'label-success']
      return r[i % r.length]
    }
    scope.getVariantStyle = function (i) {
      var r = [{
        'color': 'red'
      }, {
        'color': 'green'
      }, {
        'color': 'blue'
      }, {
        'color': 'pink'
      }]
      return r[i % r.length]
    }

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
        if (item[k]) { result[k] = item[k] }
      }
      return result
    }

    scope.updateProduct = function () {
				// let's re-assemble the product first.
      for (var k in scope.customPropertiesData) {
        scope.product[k] = scope.customPropertiesData[k]
      }

      scope.product.items = scope.itemsToAdd.map(function (item) {
        return {product_id: item.id, quantity: item.quantity}
      })

      $marketcloud.products.update(scope.product.id, scope.product)
					.success(function (response) {
  notie.alert(1, 'Update Succeded', 1.5)
})
					.error(function (response) {
  notie.alert(3, 'Update failed', 1.5)
})
    }
  }
])
