var app = angular.module('DataDashboard')
app.controller('IntegrationsController',

  ['$scope', '$http', '$application',function($scope, $http,$application) {
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
    description: 'Facebook auth integration',
    links: {
      'view': '/documentation/guides/facebook-login'
    }
  }]
}])

app.controller('IntegrationStripeController', 
  [
  '$scope', 
  '$http',
  '$routeParams',
  'StripeIntegration',
  '$application',
  function($scope, $http, $routeParams, StripeIntegration, $application) {
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
    $scope.StripeIntegration = StripeIntegration.data.data
  } else {
    $scope.isIntegrationInstalled = false
  }

  $scope.currentApplication = $application.get()

  // TODO
  // Lo switch deve essere visibile se e solo se l'integrazione è installata. così da
  // non essere clicccabile altrimenti.

  $scope.toggleIntegration = function() {
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
}])

app.controller('IntegrationBraintreeController', [
  '$scope', 
  '$http', 
  '$routeParams', 
  'BraintreeIntegration',
  '$application',
  function($scope, $http, $routeParams, BraintreeIntegration,$application) {
  // This bool is used to show/hide credentials form
  // This form is used to update the credentials
  $scope.displayCredentialsForm = false

  $scope.currentApplication = $application.get()

  if (BraintreeIntegration) {
    $scope.isIntegrationInstalled = true
    $scope.braintreeConfiguration = BraintreeIntegration.data.data
    $scope.braintreeUpdate = angular.copy(BraintreeIntegration.data.data)
  } else {
    $scope.isIntegrationInstalled = false
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
    console.log("Sending", $scope.braintreeUpdate)
    $http({
        method: 'PUT',
        url: '/applications/' + $application.get().id + '/integrations/braintree',
        data: $scope.braintreeUpdate
      })
      .then(function(response) {
        notie.alert(1, 'Integration correctly updated', 1)
        $('#BraintreeCredentialsModal').modal('hide')
        $scope.isIntegrationInstalled = true
        $scope.braintreeConfiguration = angular.copy({
          environment: $scope.braintreeUpdate.environment,
          isActive: $scope.braintreeUpdate.isActive
        })
      })
      .catch(function(response) {
        notie.alert(3, 'An error has occurred. Integration not updated', 1)
      })
  }
}])