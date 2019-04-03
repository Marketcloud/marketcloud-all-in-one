var app = angular.module('DataDashboard')
app.controller('UserController', [
  '$scope',
  '$http', 
  '$routeParams', 
  'user', 
  '$marketcloud',
  'Countries',
  '$utils',
  function(scope, http, params, user, $marketcloud, countries, $utils) {
    // Injecting the resolve's data
    scope.user = user.data.data;



    scope.carts = []
    scope.addresses = []

    scope.newAddress = {
      email: scope.user.email || '',
      user_id: scope.user.id
    }

    // This is a list of countries used by the countries autocomplete
    scope.countries = countries

    scope.update = function() {
      var payload = angular.copy(scope.user)

      for (var k in scope.customPropertiesData) {
        payload[k] = scope.customPropertiesData[k]
      }

      delete payload['id']
      delete payload['application_id']

      $marketcloud.users.update(scope.user.id, payload)
        .then(function(response) {
          notie.alert(1, 'Update Succeded', 2)
        })
        .catch(function(errpr) {
          notie.alert(3, 'An error has occurred, please try again', 2)
        })
    }


    scope.toggleAddressVisibility = function(address) {
      address.expanded = !address.expanded;
    }

    scope.saveAddress = function() {
      $marketcloud.addresses.save(scope.newAddress)
        .then(function(response) {
          notie.alert(1, 'Address created', 2)
          scope.newAddress = {
            email: scope.user.email || '',
            user_id: scope.user.id
          }
          $("#addAddressModal").modal("hide");
          return $marketcloud.addresses.list({
            user_id: scope.user.id
          })
        })
        .then(function(response) {
          scope.addresses = response.data.data
        })
        .catch(function(error) {
          notie.alert(2, 'An error has occurred, please check the data you entered', 2)
        })
    }

    // Getting the set of core properties from models
    var coreProperties = Models.User.getPropertyNames()

    // id is a core property often not inside models
    coreProperties.push(
      'id',
      'role',
      'application_id',
      'registered_with',
      'created_at',
      'updated_at',
      'shipping_address',
      'billing_address')

    // Here we store custom properties
    scope.customPropertiesData = {}

    for (var k in scope.user) {
      if (coreProperties.indexOf(k) < 0) {
        scope.customPropertiesData[k] = scope.user[k]
        delete scope.user[k]
      }
    }

    $marketcloud.orders.list({
        "user.id": params.userId,
        "per_page": 10
      })
      .then(function(response) {

        scope.orders = response.data.data
      })
      .catch(function(response) {

        notie.alert(2, 'An error has occurred. Please try again.', 2)
      })

    $marketcloud.carts.list({
        user_id: params.userId,
        per_page: 10
      })
      .then(function(response) {

        scope.carts = response.data.data
      })
      .catch(function(response) {

        notie.alert(2, 'An error has occurred. Please try again.', 2)
      })

    $marketcloud.addresses.list({
        user_id: params.userId,
        per_page: 5
      })
      .then(function(response) {

        // We want to "compress" the view
        scope.addresses = response.data.data.map(function(address, index) {
          if (0 === index)
            address.expanded = true;
          else
            address.expanded = false;
          return address
        })


      })
      .catch(function(response) {

        notie.alert(2, 'An error has occurred. Please try again.', 2)
      })
  }
])