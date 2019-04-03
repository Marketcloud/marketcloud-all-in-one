var app = angular.module('DataDashboard')

var NewUserController = function(scope, $marketcloud, http, location, Countries) {
  scope.user = {
    name: "",
    password: "",
    registered_with: 'email',
    billing_address : {},
    shipping_address : {}
  }
  scope.countries = Countries
  scope.customPropertiesData = {}

  scope.copyShippingAddressToBillingAddress = function(){
    for (var k in scope.user.shipping_address)
      scope.user.billing_address[k] = scope.user.shipping_address[k];
  }

  scope.saveUser = function() {

    // Joining user object with custom properties
    for (var k in scope.customPropertiesData) {
      scope.user[k] = scope.customPropertiesData[k]
    }

    console.log("Saving this",scope.user)
    $marketcloud.users.save(scope.user)
      .then(function(response) {
        notie.alert(1, 'User saved', 2)
        location.path('/users')
      })
      .catch(function(response) {
        notie.alert(2, 'An error has occurred. Please check the data you entered', 2)
      })
  }

  // We need to load Roles
  http({
      method: 'GET',
      url: '/applications/' + scope.application.id + '/roles'
    })
    .then(function(response) {
      scope.roles = response.data.data
    })
    .catch(function(response) {
      notie.alert(2, 'An error has occurred while reloading roles.', 1)
    })

  scope.addCustomProperty = function() {
    if (scope.user.hasOwnProperty(scope.newAttributeName)) {
      scope.userError = 'CUSTOM_PROPERTY_NAME_ALREADY_EXISTS'
    } else {
      scope.customPropertiesData[scope.newAttributeName] = scope.newAttributeValue
      scope.newAttributeValue = null
      scope.newAttributeName = null
    }
  }

  scope.deleteCustomProperty = function(property_name) {
    delete scope.customPropertiesData[property_name]
  }
}

NewUserController.$inject = ['$scope', '$marketcloud', '$http', '$location', 'Countries']

app.controller('NewUserController', NewUserController)