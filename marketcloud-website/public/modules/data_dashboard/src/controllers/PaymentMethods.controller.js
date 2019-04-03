var app = angular.module('DataDashboard')
app.controller('PaymentMethodsController', ['$scope', '$http', '$marketcloud', '$location', 'paymentMethods',
  function(scope, http, $marketcloud, location, paymentMethods) {
    scope.paymentMethods = paymentMethods.data.data
      /* scope.integrations = integrations.data.data; */
    scope.modalMode = 'update'
    scope.paymentMethod = {
      name: '',
      description: '',
      active: false

    }

    scope.loadPaymentMethods = function() {
      $marketcloud.paymentMethods.list()
        .then(function(response) {
          scope.paymentMethods = response.data.data
        })
        .catch(function(response) {
          notie.alert(3, 'An erro has occurred. Please try again.', 1.5)
        })
    }

    scope.availableChargeOptions = [{
      label: 'No additional charge',
      value: 'no_cost'
    }, {
      label: 'Fixed fee',
      value: 'fixed_fee'
    }, {
      label: 'Percentage based fee',
      value: 'percentage_fee'
    }, {
      label: 'Fixed plus percentage',
      value: 'fixed_plus_percentage'
    }]

    scope.delete = function(payment) {

      payment = payment || scope.payment;

      
      $marketcloud.paymentMethods.delete(payment.id)
        .then(function(response) {
          notie.alert(1, 'Payment method deleted.', 1.5)
          scope.payment = {}
          return $marketcloud.paymentMethods.list()
        })
        .then(function(response) {
          scope.paymentMethods = response.data.data
          $('#addManualPaymentMethodModal').modal('hide')
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred, please try again.')
        })
    }

    scope.save = function() {
      $marketcloud.paymentMethods.save(scope.payment)
        .then(function(response) {
          notie.alert(1, 'Payment method created.', 1.5)
          scope.payment = {}
          return $marketcloud.paymentMethods.list()
        })
        .then(function(response) {
          scope.paymentMethods = response.data.data
          $('#addManualPaymentMethodModal').modal('hide')
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred, please try again.')
        })
    }
    scope.createPayment = function() {
      scope.modalMode = 'create'
      scope.payment = {}
      $('#addManualPaymentMethodModal').modal('show')
    }
    scope.editPayment = function(payment) {
      scope.modalMode = 'update'

      scope.payment = payment

      $('#addManualPaymentMethodModal').modal('show')
    }

    scope.update = function(updates) {
      var payload = updates || scope.payment

      $marketcloud.paymentMethods.update(scope.payment.id, payload)
        .then(function(response) {
          notie.alert(1, 'Payment method updated.', 1.5)
          return $marketcloud.paymentMethods.list()
        })
        .then(function(response) {
          scope.paymentMethods = response.data.data
          $('#addManualPaymentMethodModal').modal('hide')
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred, please try again.')
        })
    }

    scope.togglePaymentMethod = function(paymentMethod) {
      $marketcloud.paymentMethods.update(paymentMethod.id, paymentMethod)
        .then(function(response) {
          notie.alert(1, 'Update successful', 1.5)
        })
        .catch(function(error) {
          notie.alert(3, 'An error has occurred, please try again.', 1.5)
        })
    }
  }
])