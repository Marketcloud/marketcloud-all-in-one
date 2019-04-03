var app = angular.module('DataDashboard')

app.controller('WebhooksController', [
  '$scope',
  '$http',
  'webhooks',
  '$application',
  '$rootScope',
  function(scope, http, webhooks, $application, rootScope) {
    rootScope.currentSection = 'application.webhooks'

    var application = $application.get()
    scope.application = application

    scope.mode = null
    scope.error = null
    scope.invalidPropertyName = null

    scope.application = application
    scope.webhooks = webhooks.data.data

    scope.newWebhook = {}

    var webhookMethods = ['create', 'update', 'delete']

    var webhookResources = [
      'addresses',
      'brands',
      'carts',
      'categories',
      'collections',
      'contents',
      'coupons',
      'invoices',
      'files',
      'orders',
      'paymentMethods',
      'products',
      'promotions',
      'stores',
      'taxes',
      'users',
      'variables'
    ]

    /* scope.events = [
      'products.create',
      'products.delete',
      'products.update',
      'brands.create',
      'brands.delete',
      'brands.update',
      'categories.create',
      'categories.delete',
      'categories.update',
      'orders.create',
      'orders.delete',
      'orders.update',
      'carts.create',
      'carts.delete',
      'carts.update',
      'payments.create',
      'payments.delete',
      'payments.update',
      'shippings.create',
      'shippings.delete',
      'shippings.update',
      'users.create',
      'users.update',
      'users.delete'
    ]; */

    scope.events = []

    webhookResources.forEach(function(resource) {
      webhookMethods.forEach(function(method) {
        scope.events.push(resource + '.' + method)
      })
    })

    scope.events.splice(scope.events.indexOf("orders.delete"), 0, "payments.create");

    scope.load = function() {
      http({
          method: 'GET',
          url: '/applications/' + scope.application.id + '/webhooks'
        })
        .then(function(response) {
          console.log('LOAD', response)
          scope.webhooks = response.data.data
        })
        .catch(function(response) {
          notie.alert(2, 'An error has occurred while reloading webhooks.', 1)
        })
    }

    scope.edit = function(hook) {
      scope.newWebhook = hook
      scope.showUpdateModal()
    }

    scope.showUpdateModal = function() {
      scope.mode = 'update'
      $('#newWebhookModal').modal('show')
    }

    scope.showCreateModal = function() {
      scope.mode = 'create'
      scope.newWebhook = {}
      $('#newWebhookModal').modal('show')
    }

    scope.validateWebhook = function() {
      scope.error = null
      scope.invalidPropertyName = null
      if (scope.validateUrl() === false) {
        scope.error = 'The URL is not valid. Remember to specify the protocol http:// or https:// at the beginning.'
        scope.invalidPropertyName = 'url'
        return false
      }

      if (!scope.newWebhook.event) {
        scope.error = 'Please select a valid event from the menu'
        scope.invalidPropertyName = 'event'
        return false
      }

      return true
    }

    scope.saveWebhook = function() {
      if (!scope.validateWebhook()) {
        return
      }

      http({
          method: 'POST',
          url: '/applications/' + scope.application.id + '/webhooks',
          data: scope.newWebhook
        })
        .then(function(response) {
          notie.alert(1, 'Webhook correctly created', 1)
          scope.newWebhook = {}
          $('#newWebhookModal').modal('hide')
          scope.load()
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred, webhook not created', 1)
          scope.newWebhook = {}
        })
    }

    scope.validateUrl = function() {
      var regex = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i
      return regex.test(scope.newWebhook.url)
    }

    scope.updateWebhook = function() {
      if (!scope.validateWebhook()) {
        return
      }

      var update = {
        event: scope.newWebhook.event,
        url: scope.newWebhook.url
      }

      http({
          method: 'PUT',
          url: '/applications/' + scope.application.id + '/webhooks/' + scope.newWebhook.id,
          data: update
        })
        .then(function(response) {
          notie.alert(1, 'Webhook correctly updated', 1)
          scope.newWebhook = {}
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred, webhook not updated', 1)
        })
    }

    scope.delete = function(hook) {
      http({
          method: 'DELETE',
          url: '/applications/' + scope.application.id + '/webhooks/' + hook.id
        })
        .then(function(response) {
          notie.alert(1, 'Webhook correctly deleted', 1)
          scope.load()
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred, webhook not deleted', 1)
        })
    }
  }
])