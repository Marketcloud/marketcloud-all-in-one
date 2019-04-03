var app = angular.module('DataDashboard')

app.controller('IntegrationsController', function($scope, $http, $application, $rootScope) {
  var application = $application.get()
  scope.application = application
  $scope.integrations = [{
    name: 'braintree',
    tags: ['payments'],
    image: 'https://marketcloud.azureedge.net/storm-images/braintree-logo.jpg',
    description: 'Accept cards and Paypal on web and mobile almost anywhere.',
    links: {
      'view': '/documentation/integrations/braintree'
    }
  }, {
    name: 'stripe',
    tags: ['payments'],
    image: 'https://marketcloud.azureedge.net/storm-images/stripe.png',
    description: 'Web and mobile payments. Built for developers.',
    links: {
      'view': '/documentation/integrations/stripe'
    }
  }, {
    name: 'facebook',
    tags: ['authentication'],
    image: 'https://marketcloud.azureedge.net/storm-images/facebook.png',
    description: 'Facebook authentication',
    links: {
      'view': '/documentation/guides/facebook-login'
    }
  }]
  rootScope.currentSection = 'application.integrations'
})

app.controller('IntegrationStripeController', function($scope, $http, $routeParams, StripeIntegration) {
  console.log('Integration status', StripeIntegration)

  /*
   *  The integration states are
   *
   *  Not installed
   *  Installed inactive
   *  Installed active
   *
   *  Installed means that the oauth flow was completed and we have the data
   *  StripeIntegration is the object we use to inject the integration state fetched from the api
   *
   *  If it's null, we conclude that it is not installed
   */
  if (StripeIntegration) {
    $scope.isIntegrationInstalled = true
    $scope.StripeIntegration = StripeIntegration
  } else {
    $scope.isIntegrationInstalled = false
  }

  $scope.currentApplication = $application.get()

  // TODO
  // Lo switch deve essere visibile se e solo se l'integrazione è installata. così da
  // non essere clicccabile altrimenti.

  $scope.toggleIntegration = function() {
    alert($scope.StripeIntegration.isActive)
    return $http({
        method: 'PUT',
        url: '/applications/' + $application.get().id + '/integrations/stripe',
        data: {
          isActive: $scope.StripeIntegration.isActive
        }
      })
      .then(function(response) {
        notie.alert(1, 'Integration correctly updated', 1)
      })
      .catch(function(response) {
        notie.alert(3, 'An error has occurred. Integration not updated', 1)
      })
  }
})

app.controller('IntegrationBraintreeController', function($scope, $http, $routeParams, BraintreeIntegration) {
  // This bool is used to show/hide credentials form
  // This form is used to update the credentials
  $scope.displayCredentialsForm = false

  $scope.currentApplication = $application.get()

  $scope.braintreeConfiguration = BraintreeIntegration.data.data

  $scope.braintreeUpdate = angular.copy(BraintreeIntegration.data.data)

  // If the integration is not enabled we initialize it to false
  if (!$scope.braintreeUpdate.hasOwnProperty('isActive')) {
    $scope.braintreeUpdate.isActive = false
  }

  $scope.toggleCredentialsForm = function() {
    $scope.displayCredentialsForm = !$scope.displayCredentialsForm
  }

  $scope.showModal = function() {
    $('#BraintreeCredentialsModal').modal('show')
  }

  $scope.toggleIntegration = function() {
    return $http({
        method: 'PUT',
        url: '/applications/' + $application.get().id + '/integrations/braintree',
        data: {
          isActive: $scope.braintreeConfiguration.isActive
        }
      })
      .then(function(response) {
        notie.alert(1, 'Integration correctly updated', 1)
      })
      .catch(function(response) {
        notie.alert(3, 'An error has occurred. Integration not updated', 1)
      })
  }
  $scope.saveBraintreeConfiguration = function() {
    var payload = {
      environment: $scope.braintreeUpdate.environment,
      isActive: $scope.braintreeUpdate.isActive
    }

    // If the user also changed the config,
    if (
      $scope.braintreeUpdate.merchantId &&
      $scope.braintreeUpdate.publicKey &&
      $scope.braintreeUpdate.privateKey
    ) {
      payload.merchantId = $scope.braintreeUpdate.merchantId
      payload.publicKey = $scope.braintreeUpdate.publicKey
      payload.privateKey = $scope.braintreeUpdate.privateKey
    }

    console.log('PUTTING', payload)
    $http({
        method: 'PUT',
        url: '/applications/' + $application.get().id + '/integrations/braintree',
        data: payload
      })
      .then(function(response) {
        notie.alert(1, 'Integration correctly updated', 1)
        $('#BraintreeCredentialsModal').modal('hide')
        $scope.braintreeConfiguration = angular.copy({
          environment: payload.environment,
          isActive: payload.isActive
        })
      })
      .catch(function(response) {
        notie.alert(3, 'An error has occurred. Integration not updated', 1)
      })
  }
})