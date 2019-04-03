var app = angular.module('DataDashboard')

app.controller('ListApplicationsController', ['$scope',
  function (scope) {
    
    scope.applications = window.applications;


  }])

