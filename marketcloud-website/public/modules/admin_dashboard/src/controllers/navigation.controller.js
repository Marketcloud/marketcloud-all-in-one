module.exports = function(app){
	
	app.controller('NavigationController',
	['$scope','$route','$rootScope',
	function($scope,$route,$rootScope){
		


		//$rootScope.$broadcast('$dashboardSectionChange',{section : $route.current.$$route.name});

		$scope.$on('$dashboardSectionChange',function($event,args){
			// Intercepting the new section event
			//$scope.currentSection = args.section.split('.')[0];
			$scope.currentSection = args.section;
			
			$scope.showNavigation = ($scope.currentSection !== 'home' && $scope.currentSection !== 'create');

		});
		
	}]);
};