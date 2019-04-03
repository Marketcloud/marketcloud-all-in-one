angular.module('DataDashboard')
  .controller('EditProductWithVariantsController',
    [
      '$scope', 
      '$marketcloud', 
      'product', 
      '$http',
      '$utils',
      function(scope, $marketcloud, product, $http, $utils) {
      scope.customPropertiesData = {}

      // Injecting resolve data into the controller
      scope.product = product.data.data

      // mapping non-core attributes into scope.customPropertiesData
      var coreProperties = Models.Product.getPropertyNames()
      coreProperties.push(
        'id',
        'currencies',
        'display_price',
        'display_price_discount',
        'has_variants',
        'type',
        'media',
        'tax_id',
        'locales',
        'seo',
        'requires_shipping',
        'variants',
        'variantsDefinition',
        'product_id',
        'variant_id',
        'application_id'
      )

      for (var k in scope.product) {
        if (coreProperties.indexOf(k) < 0) {
          scope.customPropertiesData[k] = scope.product[k]
          delete scope.product[k]
        }
      }

      scope.unsafeSlug = false

      scope.updateSlug = function() {
        scope.product.slug = $utils.getSlugFromString(scope.product.name)
      }

      // This method must be implemented in order to
      // make the media manager work
      scope.getImagesContainer = function() {
        return scope.product.images
      }

      scope.removeImage = function(i) {
        scope.product.images.splice(i, 1)
      }

      scope.categories = []
        // Loading categories
      $marketcloud.categories.list()
        .then(function(response) {
          scope.categories = response.data.data
        })
        .catch(function() {
          console.error('An error has occurred while loading categories')
        })

      scope.brands = []
        // Loading brands

      $marketcloud.brands.list()
        .then(function(response) {
          scope.brands = response.data.data
        })
        .catch(function() {
          console.error('An error has occurred while loading brands')
        })

      scope.filterVariantProps = function(o) {
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

      scope.getVariantStyle = function(i) {
        // var r = [{"color" : "red"},{"color" : "green"},{"color" : "blue"}, {"color" : "pink"}
        // ]
        var r = ['label-info', 'label-danger', 'label-warning', 'label-success']
        return r[i % r.length]
      }
      scope.getVariantStyle = function(i) {
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
      scope.availableTypes = [{
        name: 'String',
        value: 'string'
      }, {
        name: 'Number',
        value: 'number'
      }, {
        name: 'Boolean',
        value: 'boolean'
      }]

      scope.filterNotNullProperties = function(item) {
        var result = {}
        for (var k in item) {
          if (item[k]) {
            result[k] = item[k]
          }
        }
        return result
      }

      scope.newVariant = {}
      scope.saveNewVariant = function() {
        var variantToSave = angular.copy(scope.product)
          // Removing useless stuff in the variant
        delete variantToSave['variants']
        delete variantToSave['type']
        delete variantToSave['variantsDefinition']
        delete variantToSave['is_master']
        delete variantToSave['has_variants']
        delete variantToSave['published']

        for (var k in scope.newVariant) {
          if (scope.product.variantsDefinition[k].indexOf(scope.newVariant[k]) < 0) {
            scope.product.variantsDefinition[k].push(scope.newVariant[k])
          }
          variantToSave[k] = scope.newVariant[k]
        }


        // Devo aggiornare products perchè variants definition è cambiato
        // poi salvo la variante

        scope.updateProduct()
          .then(function(response) {
            return $http({
              method: 'POST',
              url: API_BASE_URL + '/products/' + scope.product.id + '/variants',
              data: variantToSave,
              headers: {
                Authorization: window.public_key + ':' + window.token
              }
            })
          })
          .then(function(response) {
            notie.alert(1, 'Variant successfully created', 1)
            scope.product = response.data.data
            $('#addVariantModal').modal('hide')
          })
          .catch(function(response) {
            notie.alert(2, 'An error has occurred. Variants not saved', 1)
          })
      }

      scope.deleteVariant = function(variant, i) {
        return $http({
            method: 'DELETE',
            url: API_BASE_URL + '/products/' + scope.product.id + '/variants/' + variant.id,
            headers: {
              Authorization: window.public_key + ':' + window.token
            }
          })
          .then(function(response) {
            notie.alert(1, 'Variant deleted', 1.5)
            scope.product.variants.splice(i, 1)
          })
          .catch(function(response) {
            notie.alert(3, 'An error has occurred, please try again.', 1.5)
          })
      }

      scope.updateProduct = function() {
        var payload = angular.copy(scope.product)

        // let's re-assemble the product first.
        for (var k in scope.customPropertiesData) {
          payload[k] = scope.customPropertiesData[k]
        }

        switch (payload.stock_type) {
          case 'infinite':
            delete payload.stock_level
            delete payload.stock_status
            break

          case 'status':
            delete payload.stock_level
            break

          case 'track':
            delete payload.stock_status
            break
        }

        return $marketcloud.products.update(payload.id, payload)
          .then(function(response) {
            notie.alert(1, 'Update Succeded', 1.5)
          })
          .catch(function(response) {
            notie.alert(3, 'Update failed', 1.5)
          })
      }
    }
  ])