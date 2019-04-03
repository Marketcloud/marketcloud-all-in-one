angular.module('DataDashboard')
  .controller('NewProductWithVariantsController', [
    '$scope', '$http', '$location', '$marketcloud', '$utils',
    function(scope, $http, location, $marketcloud, $utils) {
      scope.categories = []
      scope.error = null
      scope.newCategory = {}
      scope.brands = []
      scope.newBrand = {}

      // Temporary storage for variants
      // while theyre being built
      scope.addedVariants = {}

      // mapping non-core attributes into scope.customPropertiesData
      var coreProperties = Models.Product.getPropertyNames()
      coreProperties.push(
        'id',
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

      scope.isBoolean = function(d) {
        return typeof d === 'boolean'
      }

      scope.isString = function(d) {
        return typeof d === 'string'
      }

      scope.isNumber = function(d) {
        return typeof d === 'number'
      }

      // This method must be implemented in order to
      // make the media manager work
      scope.getImagesContainer = function() {
        return scope.product.images
      }

      scope.removeImage = function(i) {
        scope.product.images.splice(i, 1)
      }


      scope.unsafeSlug = false

      scope.updateSlug = function() {
        scope.product.slug = $utils.getSlugFromString(scope.product.name)
      }

      scope.loadCategories = function() {
        $marketcloud.categories.list({})
          .then(function(response) {
            scope.categories = response.data.data
          })
          .catch(function() {
            notie.alert(2, 'An error has occurred while loading categories', 2)
          })
      }

      // Initializing the categories array
      scope.loadCategories()

      scope.query = {
        // The product must be simple_product as this
        type: 'product_with_variants'
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

      scope.applyTemplate = function(product) {
        var tpl = angular.copy(product)



        console.log("====================","Vado ad applicare questo template",angular.copy(tpl),"==========================")

        delete tpl['id']
        

        scope.addedVariants2 = [];

        for (var k in tpl.variantsDefinition) {
          var newAddedVariant = {
            name : k,
            values :tpl.variantsDefinition[k].map(function(v){
              return {text:v}
            })
          }
          scope.addedVariants2.push(newAddedVariant)
        }

        scope.computedVariants = tpl.variants.map(function(item){
          var v = angular.copy(item)
          delete v["id"];
          delete v["product_id"];
          delete v["variant_id"]
          return v;
        })

        console.log("Ora computedVariants è",angular.copy(scope.computedVariants))

         

        



        delete tpl.variants
        

        scope.product = tpl

        // Making sure that inventory is initialized
        scope.product.stock_type = tpl.stock_type || "status";
        scope.product.stock_status = tpl.stock_status || "in_stock";


        console.log("Applicato questo template",tpl)

        //scope.updateVariantsConfiguration()
        
        console.log("Dopo updateVariantsConfiguration",angular.copy(scope.computedVariants))
        // Taking care of variants
        

        for (var k in scope.product) {
          if (coreProperties.indexOf(k) < 0) {
            scope.customPropertiesData[k] = scope.product[k]
            delete scope.product[k]
          }
        }


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

      scope.saveCategory = function() {
        $marketcloud.categories.save(scope.newCategory)
          .then(function(response) {
            $('#newCategoryModal').modal('hide')
            scope.categories.push(scope.newCategory)
            scope.newCategory = {}
          })
          .catch(function(response) {
            $('#newCategoryModal').hide()
            notie.alert(3, 'An error has occurred. Category not saved', 1)
          })
      }

      scope.loadBrands = function() {
          $marketcloud.brands.list({})
            .then(function(response) {
              scope.brands = response.data.data
            })
            .catch(function() {
              notie.alert(2, 'An error has occurred while loading brands', 2)
            })
        }
        // Initializing the brands array
      scope.loadBrands()
      window.inspect = function(){console.log(angular.copy(scope.product))};

      scope.saveBrand = function() {
        $marketcloud.brands.save(scope.newBrand)
          .then(function(response) {
            $('#newBrandModal').modal('hide')
            scope.brands.push(scope.newBrand)
            scope.newBrand = {}
          })
          .catch(function(response) {
            $('#newBrandModal').hide()
            notie.alert(3, 'An error has occurred. Brand not saved', 1)
          })
      }

      scope.product = {
        type: 'product_with_variants',
        name: '',
        description: '',
        stock_type: 'status',
        stock_status: 'in_stock',
        images: [],
        variants: {},
        published: false,
        has_variants: true // Flag for legacy compatibility
      }

      scope.customPropertiesData = {}
        // This contains validation Errors

      // Array of new properties's names (strings)
      scope.customPropertiesNames = []

      scope.computedVariants = []

      // Each tyme the parent's stock type is changed, the variants must be updated
      scope.updateStockManagementForVariants = function() {
        var stock_type = scope.product.stock_type

        if (stock_type === 'track') {
          delete scope.product.stock_status
          scope.computedVariants.forEach(function(v) {
            delete v['stock_status']
          })
          return
        }

        if (stock_type === 'status') {
          delete scope.product.stock_level
          scope.computedVariants.forEach(function(v) {
            delete v['stock_level']
          })
          return
        }

        if (stock_type === 'infinite') {
          delete scope.product.stock_status
          delete scope.product.stock_level
          scope.computedVariants.forEach(function(v) {
            delete v['stock_level']
            delete v['stock_status']
          })
          return
        }
      }

      scope.properties_to_inherit = [
        'price',
        'sku',
        'stock_level',
        'stock_type',
        'stock_status'
        // Add here more props you want to override now!
        // e.g. stock_level

      ]

      function transformVariantObject(o) {
        var buf = []
        for (var k in o) {
          buf.push({
            name: k,
            values: o[k].map(function(a) {
              return a.text
            })
          })
        }
        return buf
      }

      function getArrayOfVariants(arrayOfVariants) {
        if (arrayOfVariants.length === 0) {
          return []
        }
        if (arrayOfVariants.length === 1) {
          var v = arrayOfVariants[0]
          var buf = []
          v.values.forEach(function(e) {
            var o = {}
            o[v.name] = e
            buf.push(o)
          })
          return buf
        }
        var output = arrayOfVariants.reduce(function(a, b) {
          if (!(a instanceof Array)) {
            // Se non è un array, è la prima botta di reduce,
            // fatta con la prima variante (el 0 di arrayOfVariants)
            var buf = []
            a.values.forEach(function(el_a) {
              b.values.forEach(function(el_b) {
                var o = {}
                o[a.name] = el_a
                o[b.name] = el_b
                buf.push(o)
              })
            })
            return buf
          } else {
            // Se è un array, allora non è la prima botta di reduce
            // Quindi per ogni elemento dell''array finale, aggiungo pezzi di variante
            var buf = []
            b.values.forEach(function(el_b) {
              // Ad ogni elemento dell array di varianti costruito al passo
              // precedente aggiungo un pezzo di nuova variante
              a.forEach(function(el_a) {
                var o = JSON.parse(JSON.stringify(el_a))
                o[b.name] = el_b
                buf.push(o)
              })
            })
            return buf
          }
        })
        return output
      }

      function attachInheritedProperties(variants) {
        return variants.map(function(variant) {
          console.log("ATTACHO LE INHERITED PROPERTIES DA ",angular.copy(scope.product))
          scope.properties_to_inherit.forEach(function(i, index) {


            if (scope.product[i]) {

              variant[i] = scope.product[i];
            }
          })
          return variant
        })
      }

      scope.filterVariantProps = function(o) {
        var p = {}
        for (var k in o) {
          // if its not an inherited property, then it's a variant property name
          if (scope.properties_to_inherit.indexOf(k) < 0 && k !== 'save') {
            // The property k is not an inherited property but a variant
            p[k] = o[k]
          }
        }
        return p
      }

      // Return a subset of the object in which only variant related
      // keys are kept
      scope.filterVariantProps = function(o) {
        var variantNames = scope.addedVariants2.map(function(v){
          return v.name
        })
        var p = {}
        for (var k in o) {
          // if its not an inherited property, then it's a variant property name
          if (variantNames.indexOf(k) > -1 ) {
            // The property k is not an inherited property but a variant
            p[k] = o[k]
          }
        }
        return p
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

      /*
        variants Array<{name :"size", values : ["cl","l","s"]}
      */
      function getArrayOfVariants2(variants) {
        variants = variants.filter(function(v) {
          return v.values.length > 0
        })

        if (variants.length === 0) {
          return []
        }

        if (variants.length === 1) {
          var result = []
          variants[0].values.forEach(function(v) {
            var o = {}
            o[variants[0].name] = v
            result.push(o)
          })
          return result
        }

        var combine = function(v1, v2) {
          var output = []

          // 2 cases, one is that v1 is a {name,values}
          // other case is that v1 is the already created bag
          // [{size:x, color : red}]
          if (v1 instanceof Array) {
            var _out = []
            v1.forEach(function(variant) {
              v2.values.forEach(function(value) {
                var o = angular.copy(variant)
                o[v2.name] = value
                _out.push(o)
              })
            })
            return _out
          }

          v1.values.forEach(function(val1) {
            v2.values.forEach(function(val2) {
              var o = {}
              o[v1.name] = val1
              o[v2.name] = val2

              output.push(o)
            })
          })
          return output
        }

        var counter = 0
        var out = []

        while (variants[counter + 1]) {
          out = combine(variants[counter], variants[counter + 1])
          variants[counter + 1] = out
          counter++
        }

        return out
      }

      scope.deleteVariant = function(variantName, $index) {
        scope.addedVariants2.splice($index, 1)
        scope.updateVariantsConfiguration()
      }

      scope.addedVariants2 = []
      scope.addEmptyVariant = function() {
        scope.addedVariants2.push({
          name: '',
          values: []
        })
      }

      scope.updateVariantsConfiguration = function() {
        // Transforming addedVariants2
        scope.computedVariants = []
        scope.addedVariants = {}
        scope.addedVariants2.forEach(function(variant) {
          scope.addedVariants[variant.name] = variant.values.map(function(i) {
            return i.text
          })

          variant.values = variant.values.map(function(i) {
            return i.text
          })
        })

        
        var temp_ComputedVariants = getArrayOfVariants2(angular.copy(scope.addedVariants2))

        scope.computedVariants = temp_ComputedVariants
        scope.computedVariants = attachInheritedProperties(temp_ComputedVariants)

        scope.computedVariants.forEach(function(v) {
          v.save = true
        })

        // Ricalcolo le variants definition, le added sono scope.addedVariants
        scope.product.variantsDefinition = scope.addedVariants
      }

      scope.getVariantClass = function(i) {
        var classes = ['label-default', 'label-info', 'label-success', 'label-warning', 'label-danger']
        return 'label solid ' + (classes[i % classes.length])
      }

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

        scope.product.variants = []

        // Custom properties and variants cannot be validated through Schematic.
        var props_to_validate = {}
        var known_props = Models.Product.getPropertyNames()
        for (var k in scope.product) {
          if (known_props.indexOf(k) > -1) {
            props_to_validate[k] = scope.product[k]
          }
        }
        var validation = Models.Product.validate(props_to_validate)

        if (validation.valid === false) {
          scope.errorField = validation.invalidPropertyName

          if (validation.failedValidator === 'required') {
            scope.error = 'The ' + scope.errorField + ' field is required'
          } else if (validation.failedValidator === 'min') {
            if (typeof scope.product[validation.invalidPropertyName] === 'string') {
              scope.error = 'The ' + scope.errorField + ' field must have at least ' + Models.Product.schema[validation.invalidPropertyName].min + ' characters'
            } else {
              scope.error = 'The ' + scope.errorField + ' field must be greater than or equal to ' + Models.Product.schema[validation.invalidPropertyName].min
            }
          } else if (validation.failedValidator === 'max') {
            if (typeof scope.product[validation.invalidPropertyName] === 'string') {
              scope.error = 'The ' + scope.errorField + ' field must have less than ' + Models.Product.schema[validation.invalidPropertyName].max + ' characters'
            } else {
              scope.error = 'The ' + scope.errorField + ' field must be lesser than or equal to ' + Models.Product.schema[validation.invalidPropertyName].min
            }
          } else {
            scope.error = 'The ' + scope.errorField + ' field has an invalid value (' + props_to_validate[scope.errorField] + ')'
          }
          return
        }

        for (var k in scope.customPropertiesData) {
          scope.product[k] = scope.customPropertiesData[k]
        }

        for (var key in scope.product) {
          if (scope.product[key] === null) {
            delete scope.product[key]
          }
        }

        var variantsToSave = angular.copy(scope.computedVariants
          .filter(function(variant) {
            return variant.save === true
          })
          .map(function(variant) {
            var obj = angular.copy(scope.product)

            // Removing useless stuff in the variant
            delete obj['variants']
            delete obj['variantsDefinition']
            delete obj['is_master']
            delete obj['has_variants']
            delete obj['published']

            for (var k in variant) {
              obj[k] = variant[k]
            }

            // Remove the flag used to distinguish
            // between variants to save and not to save
            delete variant['save']

            return obj
          }))

        for (var k in overwrites) {
          scope.product[k] = overwrites[k]
        }
        $marketcloud.products.save(scope.product)
          .then(function(response) {
            // Now i must save variants.

            // Ogni variante deve essere pretrattata
            // Ad esempio devo aggiungere il campo is_variant e images
            /* if ('undefined' !== mixpanel)
              mixpanel.track('products.create') */

            var savedProduct = response.data.data


            $http({
                method: 'POST',
                url: API_BASE_URL + '/products/' + savedProduct.id + '/variants',
                data: variantsToSave,
                headers: {
                  Authorization: window.public_key + ':' + window.token
                }
              })
              .then(function(response) {
                notie.alert(1, 'Product successfully created', 1)
                location.path('/products')
              })
              .catch(function(response) {
                notie.alert(2, 'An error has occurred. Variants not saved', 1)
              })
          })
          .catch(function(response) {
            notie.alert(2, 'An error has occurred. Product not saved', 1)
          })
      }
    }
  ])