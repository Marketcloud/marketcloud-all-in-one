var app = angular.module('DataDashboard')

app.controller('DeployController', ['$scope', '$rootScope', '$application',
  function (scope, $rootScope, $application) {
    var application = $application.get()
    scope.application = application

    scope.selectedTemplate = null

    $rootScope.application = application
    $rootScope.currentSection = 'application.deploy'

    scope.getHerokuURL = function () {
      var str = 'https://heroku.com/deploy'
      str += '?template=' + scope.selectedTemplate
      str += '&env[MARKETCLOUD_PUBLIC_KEY]=' + encodeURIComponent(scope.application.public_key)
      str += '&env[MARKETCLOUD_SECRET_KEY]=' + encodeURIComponent(scope.application.secret_key)
      return str
    }
  }])

