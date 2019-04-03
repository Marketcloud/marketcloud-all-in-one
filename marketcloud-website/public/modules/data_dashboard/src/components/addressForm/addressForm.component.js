var app = angular.module('DataDashboard')

app.controller('AddressFormController',[
  '$scope',
  'Countries',
  function($scope, Countries){

  this.$onInit = function () {

    // Initializing the array of countries taken from the service
    $scope.countries = Countries;

    // Linking the local address object to the parent scope object
    $scope.address = this.address;
  }

}])

app
  .component('addressForm', {
    templateUrl: '/modules/data_dashboard/src/components/addressForm/addressForm.component.html',
    controller: 'AddressFormController',
    bindings: {
      address: '='
    }
  })
