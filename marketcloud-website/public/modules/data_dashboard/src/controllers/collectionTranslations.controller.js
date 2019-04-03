(function() {
  'use strict'

  angular.module('DataDashboard')
    .controller('EditCollectionTranslationsController', EditCollectionTranslationsController)

  EditCollectionTranslationsController.$inject = [
    '$scope',
    '$marketcloud',
    'collection',
    '$http',
    '$application',
    '$location',
    'LocalesFactory'
  ]

  function EditCollectionTranslationsController(scope, $marketcloud, collection, $http, $application, $location, locales) {
    if ($application.getAvailableLocaleCodes().length === 0) {
      notie.alert(2, 'This store has no additional locale. Please add a locale first.', 2)
      return $location.path('/system/localization')
    }

    // Injecting resolve data into the controller
    scope.collection = collection.data.data

    // This is fetched from the app's config
    scope.availableLocales = []

    // mocking the retrieval of locales
    scope.locales = locales

    scope.availableLocales = $application.get().locales.split(',')
      .map(function(code) {
        return scope.locales[code]
      })

    // Which locale we are currently editing
    scope.currentLocale = scope.availableLocales[0]

    // Init locales object
    if (!scope.collection.hasOwnProperty('locales')) {
      scope.collection.locales = {}
    }

    // Checking that the product has initialized every locale sub object
    scope.availableLocales.forEach(function(locale) {
      // Se il prodotto.locales non ha il locale, creo l'oggetto
      if (!scope.collection.locales.hasOwnProperty(locale.code)) {
        scope.collection.locales[locale.code] = {}
      }
    })



    // Slugs functions
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
    scope.unsafeSlug = false;

    scope.updateSlug = function() {
      scope.collection.locales[scope.currentLocale.code].slug = getSlugFromString(scope.collection.locales[scope.currentLocale.code].name)
    }



    scope.getFlagClassName = function() {
      return 'flag-icon-' + scope.currentLocale.code.slice(-2).toLocaleLowerCase()
    }

    scope.updateTranslations = function() {
      var payload = {
        locales: angular.copy(scope.collection.locales)
      }

      $marketcloud.collections.update(scope.collection.id, payload)
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