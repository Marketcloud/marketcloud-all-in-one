angular.module('DataDashboard').controller('NewSimpleProductController', [
  '$scope', '$http', '$location', '$marketcloud','$utils','$models',
  function(scope, $http, location, $marketcloud, $utils, Models) {
    scope.error = null

    scope.brands = []
    scope.newBrand = {}

    

    scope.validation = {
      valid: true
    }

    // mapping non-core attributes into scope.customPropertiesData
    console.log("Cerco qui le core propseties",Models.Product, Models)
    var coreProperties = Models.Product.getPropertyNames()

    coreProperties.push(
      'id',
      'display_price_discount',
      'display_price',
      'has_variants', // for legacy reasons
      'type',
      'media',
      'tax_id',
      'locales',
      'seo',
      'requires_shipping',
      'product_id',
      'variant_id',
      'application_id'
    )

    scope.product = {
      price: null,
      name: '',
      description: '',
      stock_type: 'status',
      images: [],
      media: [],
      published: false,
      type: 'simple_product'

    }

    scope.removeImage = function(i) {
      scope.product.images.splice(i, 1)
    }

    
    scope.unsafeSlug = false

    scope.updateSlug = function() {
      scope.product.slug = $utils.getSlugFromString(scope.product.name)
    }

    scope.applyTemplate = function(product) {
      var tpl = angular.copy(product)

      delete tpl['id']

      scope.product = tpl

      for (var k in scope.product) {
        if (coreProperties.indexOf(k) < 0) {
          scope.customPropertiesData[k] = scope.product[k]
          delete scope.product[k]
        }
      }
    }

    scope.query = {
      // The product must be simple_product as this
      type: 'simple_product'
    }
    scope.prepareRegex = function() {
      scope.query.name.$options = 'i'
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
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again', 1.5)
        })
    }

    // Loading products right away
    scope.loadProducts()

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

    scope.properties_to_inherit = [
      'price',
      'sku',
      'stock_level',
      'stock_type',
      'stock_status'
      // Add here more props you want to override now!
      // e.g. stock_level

    ]

    scope.hideErrors = function() {
      scope.error = null
      scope.errorField = null
    }

    scope.saveProduct = function(overwrites) {
      for (var k in scope.product) {
        if (scope.product[k] === null) {
          delete scope.product[k]
        }
      }

      scope.hideErrors()

      // this scope properti is bound to the error-message component
      // TODO schematic needs custom validator, so i can do something like

      scope.validation = Models.Product.validate(scope.product)
      

      if (scope.validation.valid === false) {
        return;
      }



      for (var kk in scope.customPropertiesData) {
        scope.product[kk] = scope.customPropertiesData[kk]
      }

      for (var key in scope.product) {
        if (scope.product[key] === null) {
          delete scope.product[key]
        }
      }

      for (var k in overwrites) {
        scope.product[k] = overwrites[k]
      }

      $marketcloud.products.save(scope.product)
        .then(function(response) {
          notie.alert(1, 'Product saved successfully.', 1.5)
          location.path('/products')
        })
        .catch(function(error) {

          if (error.status === 400) {
            scope.validation = error.data.errors[0]
            return;
          }
          
          notie.alert(2, 'An error has occurred. Product not saved', 1)
        })
    }
  }
])