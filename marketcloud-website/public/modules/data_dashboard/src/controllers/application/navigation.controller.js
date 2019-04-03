var app = angular.module('DataDashboard')

app.controller('NavigationController',
  ['$scope', '$route', '$rootScope', '$application',
    function ($scope, $route, $rootScope, $application) {
      var application = $application.get()
      scope.application = application

		// $rootScope.$broadcast('$dashboardSectionChange',{section : $route.current.$$route.name});

      $scope.$on('$dashboardSectionChange', function ($event, args) {
			// Intercepting the new section event
			// $scope.currentSection = args.section.split('.')[0];
        $scope.currentSection = args.section

        $scope.showNavigation = ($scope.currentSection !== 'home' && $scope.currentSection !== 'create')
      })
    }])
