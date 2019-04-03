var app = angular.module('DataDashboard')
app.controller('TranslateNotificationController', ['$scope',
  '$http',
  'notification',
  '$marketcloud',
  'LocalesFactory',
  '$application',
  '$location',
  'NotificationsPresetsFactory',
  function(scope, http, notification, $marketcloud, locales, $application, $location, NotificationsPresets) {
    if ($application.getAvailableLocaleCodes().length === 0) {
      notie.alert(2, 'This store has no additional locale. Please add a locale first.', 2)
      return $location.path('/system/localization')
    }
    scope.presets = NotificationsPresets
    scope.notification = notification.data.data
      // This is fetched from the app's config
    scope.availableLocales = []
      // mocking the retrieval of locales
    scope.locales = locales
      // name => label
      // This object is used to map template variable names
      // to more user friendly names
    scope.templateVariablesLabels = {
      title: 'Title',
      introduction: 'introduction',
      productLabel: 'Product Label',
      priceLabel: 'Price Label',
      customerInformationLabel: 'Customer information label',
      shippingAddressLabel: 'Shipping address label',
      billingAddressLabel: 'Billing address label',
      tracking_code_introduction: 'Shipment tracking introduction',
      redirect_url: 'Redirect URL',
      buttonLabel: 'Button Label'
    }
    scope.availableLocales = $application.get().locales.split(',')
      .map(function(code) {
        return scope.locales[code]
      })
      // Which locale we are currently editing
    scope.currentLocale = scope.availableLocales[0]
      // Init locales object
    if (!scope.notification.hasOwnProperty('locales')) {
      scope.notification.locales = {}
    }
    // Checking that the product has initialized every locale sub object
    scope.availableLocales.forEach(function(locale) {
      // Se il prodotto.locales non ha il locale, creo l'oggetto
      if (!scope.notification.locales.hasOwnProperty(locale.code)) {
        scope.notification.locales[locale.code] = {}
      }
    })
    scope.getFlagClassName = function() {
      return 'flag-icon-' + scope.currentLocale.code.slice(-2).toLocaleLowerCase()
    }
    scope.events = {
      'invoices.create': 'An order is created',
      'orders.create': 'An order is created',
      // 'orders.update.canceled'     : 'An order is canceled',
      'users.create': 'A new user is created',
      'orders.update.processing': 'An order is paid',
      'orders.update.completed': 'An order is shipped'
    }
    scope.eventKeys = Object.keys(scope.events).map(function(e) {
      return scope.events[e]
    })
    scope.updateNotificationPreset = function() {
        if (scope.presets.hasOwnProperty(scope.notification.event)) {
          var e = scope.notification.event
          for (var k in scope.presets[e]) {
            scope.notification[k] = scope.presets[e][k]
          }
        }
      }
      // Notifications created before templates were available might need some more work
    if (!scope.notification.template) {
      scope.notification.template = angular.copy(scope.presets[scope.notification.event])
    }
    // In the same way, some notification might have only a subset of template values.
    for (var tplKey in scope.presets[scope.notification.event].template) {
      if (!(tplKey in scope.notification.template)) {
        scope.notification.template[tplKey] = scope.presets[scope.notification.event].template[tplKey]
      }
    }
    scope.updateTranslations = function() {
      var payload = {
        locales: angular.copy(scope.notification.locales)
      }
      $marketcloud.notifications.update(scope.notification.id, payload)
        .then(function(response) {
          notie.alert(1, 'All updates have been saved.', 2)
        })
        .catch(function(error) {
          notie.alert(3, 'An error has occurred, please try again', 2)
        })
    }
  }
])