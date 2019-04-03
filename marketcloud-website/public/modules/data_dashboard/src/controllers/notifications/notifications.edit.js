var app = angular.module('DataDashboard')
app.controller('EditNotificationController', [
  '$scope',
  '$http',
  'notification',
  '$location',
  '$marketcloud',
  'NotificationsPresetsFactory',
  function(scope, http, notification, $location, $marketcloud, NotificationsPresets) {
    scope.events = {
      'invoices.create': 'An invoice is created',
      'orders.create': 'An order is created',
      'users.create': 'A new user is created',
      'users.recoverPassword': 'A user wants to recover the password',
      'orders.update.processing': 'An order is paid',
      'orders.update.completed': 'An order is shipped'
    }

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

    scope.presets = NotificationsPresets

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

    scope.notification = notification.data.data

    // Notifications created before templates were available might need some more work
    if (!scope.notification.template) {
      scope.notification.template = angular.copy(scope.presets[scope.notification.event].template)
    }

    // In the same way, some notification might have only a subset of template values.
    for (var tplKey in scope.presets[scope.notification.event].template) {
      if (!(tplKey in scope.notification.template)) {
        scope.notification.template[tplKey] = scope.presets[scope.notification.event].template[tplKey]
      }
    }

    scope.save = function() {
      $marketcloud.notifications.update(scope.notification.id, scope.notification)
        .then(function(response) {
          notie.alert(1, 'Item successfully updated!', 1.5)
          $location.path('/notifications')
        })
        .catch(function(error) {
          notie.alert(3, 'An error has occurred, please try again', 1.5)
        })
    }
  }
])