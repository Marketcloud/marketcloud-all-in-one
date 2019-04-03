(function() {
  'use strict'

  angular.module('DataDashboard')
    .controller('EditProductTranslationsController', EditProductTranslationsController)

  EditProductTranslationsController.$inject = [
    '$scope',
    '$marketcloud',
    'product',
    '$http',
    '$application',
    '$location',
    'LocalesFactory'
  ]

  function EditProductTranslationsController(scope, $marketcloud, product, $http, $application, $location, locales) {
    // If the current application does not have additional locales
    // we redirect the user to the locales settings.
    //
    // We might want to prompt the user and ask them
    // Go to settings or stay in the previous page?
    if ($application.getAvailableLocaleCodes().length === 0) {
      notie.alert(2, 'This store has no additional locale. Please add a locale first.', 2)
      return $location.path('/system/localization')
    }

    // Injecting resolve data into the controller
    scope.product = product.data.data

    // This is fetched from the app's config
    scope.availableLocales = []

    // mocking the retrieval of locales
    // THese are ALL the locals available in the world
    scope.locales = locales

    // available locales
    // Fetched from app settings,
    // THese are the locals that the store owner wants for this app.
    scope.availableLocales = []

    scope.availableLocales = $application.get().locales.split(',')
      .map(function(code) {
        return scope.locales[code]
      })

    // Which locale we are currently editing
    // We already know that we have at least 1 locale
    scope.currentLocale = scope.availableLocales[0]

    // This will hold custom properties for further processing
    scope.customPropertiesData = {}

    // mapping non-core attributes into scope.customPropertiesData
    var coreProperties = Models.Product.getPropertyNames()

    // Should we be able to edit the slug? this is a on/off
    scope.unsafeSlug = false

    coreProperties.push(
      'id',
      'variants',
      'variantsDefinition',
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
      'application_id')

    for (var k in scope.product) {
      if (coreProperties.indexOf(k) < 0) {
        scope.customPropertiesData[k] = scope.product[k]
        delete scope.product[k]
      }
    }

    // Handling variants
    // The locale will look like this
    /*
      {
        locales : {
          "it-IT" : {
            ..
            variants : {
              colors : {
                label : "colori",
                values: {
                  "red"  : "rosso",
                  "yellow" : "giallo"
                  ...
                }
              }
            }
          }
        }
      }
    */

    if (product.type === 'product_with_variants') {
      for (var localeName in scope.product.locales) {
        var locale = scope.product.locales[localeName]
        if (!locale.hasOwnProperty('variants')) {
          // Let's initialize the variants in the locale!
          locale.variants = {}

          for (v_name in scope.product.variantsDefinition) {
            // We want to initialize the values translation table
            var variant_values_translations = {}
            var variant_values = scope.product.variantsDefinition[v_name]
            variant_values.forEach(function(v) {
              variant_values_translations[v] = ''
            })
            locale.variants[v_name] = {
              label: '',
              values: variant_values_translations
            }
          }
        }
      }
    }

    // Init locales object
    if (!scope.product.hasOwnProperty('locales')) {
      scope.product.locales = {}
    }

    scope.customPropertiesDataLocales = {}

    // Checking that the product has initialized every locale sub object
    scope.availableLocales.forEach(function(locale) {
      // Se il prodotto.locales non ha il locale, creo l'oggetto
      if (!scope.product.locales.hasOwnProperty(locale.code)) {
        scope.product.locales[locale.code] = {}
      }

      // Initializing the container for custom properties translations
      scope.customPropertiesDataLocales[locale.code] = {}

      for (var k in scope.customPropertiesData) {
        scope.customPropertiesDataLocales[locale.code][k] = getTranslatedValueForCustomProperty(k, locale)
      }

      function getTranslatedValueForCustomProperty(k, locale) {
        if (typeof scope.product.locales[locale.code][k] !== 'undefined') {
          return scope.product.locales[locale.code][k]
        }

        return {
          value: scope.customPropertiesData[k],
          label: k
        }
      }
    })

    scope.getFlagClassName = function() {
      return 'flag-icon-' + scope.currentLocale.code.slice(-2).toLocaleLowerCase()
    }

    scope.isRichText = function(str) {
      if (typeof str !== 'string')
        return false;

      var doc = new DOMParser().parseFromString(str, "text/html");
      return [].slice.call(doc.body.childNodes).some(function(node) {
        return node.nodeType === 1
      } );
    }

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

    scope.updateSlug = function() {
      scope.product.locales[scope.currentLocale.code].slug = getSlugFromString(scope.product.locales[scope.currentLocale.code].name)
    }

    scope.updateTranslations = function() {
      var payload = {
        locales: angular.copy(scope.product.locales)
      }

      for (var locale in scope.customPropertiesDataLocales) {
        // Custom properties of locale "l"
        var customPropertiesForSingleLocale = scope.customPropertiesDataLocales[locale]

        for (var k in customPropertiesForSingleLocale) {
          payload.locales[locale][k] = customPropertiesForSingleLocale[k]
        }
      }

      $marketcloud.products.update(scope.product.id, payload)
        .then(function(response) {
          notie.alert(1, 'All updates have been saved.', 2)
        })
        .catch(function(error) {
          notie.alert(3, 'An error has occurred, please try again', 2)
        })
    }

    scope.filterNotNullProperties = function(item) {
      var result = {}
      for (var k in item) {
        if (item[k]) {
          result[k] = item[k]
        }
      }
      return result
    }

    scope.typeof = function(y) {
      return (typeof y)
    }
  }
})()