

var app = angular.module('DataDashboard')

app.controller('NavbarController',
  [
  '$scope',
  '$application',
  '$account',
    function ($scope, $application, $account) {

      $scope.application = $application.get()
      $scope.user = $account.get();

    }
  ])


app
.component('navbar', {
  templateUrl: '/modules/data_dashboard/src/components/navbar/navbar.component.html',
  controller: 'NavbarController',
  bindings: {}
})
