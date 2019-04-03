var app = angular.module('DataDashboard')
app.controller('NewNotificationController', ['$scope', '$http', '$location', '$marketcloud', 'NotificationsPresetsFactory',
  function(scope, http, $location, $marketcloud, NotificationsPresets) {
    scope.events = {
      'invoices.create': 'An invoice is created',
      'orders.create': 'An order is created',
      'users.create': 'A new user is created',
      'users.recoverPassword': 'A user wants to recover the password',
      'orders.update.processing': 'An order is paid',
      'orders.update.completed': 'An order is shipped'
    }

    scope.notification = {
      event: null,
      name: null,
      description: null,
      subject: null,
      sendCopyToOwner: false,
      active: false
    }

    scope.query = {}
    scope.prepareRegex = function() {
      scope.query.name.$options = 'i'
    }

    scope.presets = NotificationsPresets

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
      redirect_url  :'Redirect URL',
      buttonLabel : 'Button Label'
    }

    scope.updateNotificationPreset = function() {
      if (scope.presets.hasOwnProperty(scope.notification.event)) {
        var e = scope.notification.event
        for (var k in scope.presets[e]) {
          scope.notification[k] = scope.presets[e][k]
        }
      }
    }

    scope.eventKeys = Object.keys(scope.events).map(function(e) {
      return scope.events[e]
    })

    scope.save = function() {
      $marketcloud.notifications.save(scope.notification)
        .then(function(response) {
          notie.alert(1, 'Notification saved', 1.5)
          $location.path('/notifications')
        })
        .catch(function(error) {
          notie.alert(3, 'An error has occurred, please try again', 1.5)
        })
    }
  }
])