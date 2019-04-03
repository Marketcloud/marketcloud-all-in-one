angular.module('DataDashboard').controller('EditVariantController', ['$scope', '$marketcloud', '$routeParams', '$http', 'resolvedProduct',
  function(scope, $marketcloud, params, $http, resolvedProduct) {
    scope.product = resolvedProduct.data.data

    var originalVariantData = null

    scope.variant = null

    // This object holds the actual properties of the variant
    // computed by variant + parent
    scope.product_merge_variant = {}

    // When saving the variant, only what does not match with the parent
    // is saved inside the variant object
    scope.customPropertiesData = {}

    // These cannot be touched
    scope.variantDefiningProperties = {}

    scope.currentVariantId = null

    scope.filterVariantProps = function(o) {
      var p = {}
      for (var k in o) {
        // if its not an inherited property, then it's a variant property name
        if (scope.product.variantsDefinition.hasOwnProperty(k)) {
          p[k] = k + ': ' + String(o[k])
        }
      }
      return p

      // return o
    }

    // This method must be implemented in order to
    // make the media manager work
    scope.getImagesContainer = function() {
      return scope.product_merge_variant.images
    }

    scope.removeImage = function(i) {
      scope.product_merge_variant.images.splice(i, 1)
    }

    scope.getVariantStyle = function(i) {
      // var r = [{"color" : "red"},{"color" : "green"},{"color" : "blue"}, {"color" : "pink"}
      // ]
      var r = ['label-info', 'label-danger', 'label-warning', 'label-success']
      return r[i % r.length]
    }
    scope.getVariantStyle = function(i) {
      var r = [{
        'color': '#c0392b'
      }, {
        'color': '#27ae60'
      }, {
        'color': '#2c3e50'
      }, {
        'color': '#d35400'
      }]
      return r[i % r.length]
    }

    scope.getVariantClass = function(i) {
      var classes = ['label-empty-info', 'label-empty-success', 'label-empty-warning', 'label-empty-danger']
      return 'label solid ' + (classes[i % classes.length])
    }

    scope.updateVariant = function() {
      
      
      // We take only some stuff from the main product
      var variantProperties = [
      // Le eliino queste due perchè altrimenti, se metto un prezzo nel parent
      // e nel figlio metto lo stesso, non me lo salva
        //'price',
        //'price_discount',
        'category_id',
        'description',
        'stock_type',
        'stock_status',
        'stock_level',
        'sku',
        'barcode',
        'images',
        'requires_shipping',
        'width',
        'depth',
        'height',
        'weight'
      ]

      var toSend = angular.copy(scope.variant)

      for (var k in scope.product_merge_variant) {
        
        // Se la property della variante è
        // deiversa da ciò che sta in product_merge_variant
        // e la properietà è presente in variantProperties
        if (toSend[k] !== scope.product_merge_variant[k] && variantProperties.indexOf(k) > -1) {

          toSend[k] = scope.product_merge_variant[k]
        }

        if (k === "price_discount" && scope.product_merge_variant[k] !== originalVariantData[k]) {
           console.log(k+" dovrebbe passare da "+originalVariantData[k]+" a "+scope.product_merge_variant[k])
           toSend.price_discount = scope.product_merge_variant[k]
        }

        if (k === "price" && scope.product_merge_variant[k] !== originalVariantData[k]) {
           toSend.price = scope.product_merge_variant[k]
        }


      }

      console.log("product_merge_variant",angular.copy(scope.product_merge_variant))
      console.log("toSend",angular.copy(toSend))

      


      $http({
          method: 'PUT',
          url: API_BASE_URL + '/products/' + params.productId + '/variants/' + scope.variant.id,
          headers: {
            Authorization: window.public_key + ':' + window.token
          },
          data: toSend
        })
        .then(function(response) {
          notie.alert(1, 'Variant successfully updated', 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again.', 1.5)
        })
    }

    scope.setCurrentVariant = function(variant_id) {
      scope.currentVariantId = variant_id
      scope.product.variants.forEach(function(v) {
        if (Number(v.id) === Number(variant_id)) {
          scope.variant = v
           originalVariantData = angular.copy(v)
        }
      })
      for (var k in scope.product) {
        scope.product_merge_variant[k] = scope.product[k]
      }
      for (var j in scope.variant) {
        scope.product_merge_variant[j] = scope.variant[j]
      }
    }

    scope.setCurrentVariant(Number(params.variantId))

    scope.product = resolvedProduct.data.data
  }
])