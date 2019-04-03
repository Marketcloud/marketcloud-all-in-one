var app = angular.module('DataDashboard');

app.controller('DeployController',['$scope','$application',function(scope, $application){

	scope.selectedTemplate = null;

	scope.getHerokuURL = function() {
		var str = 'https://heroku.com/deploy';
		str += '?template='+scope.selectedTemplate;
		str += '&env[MARKETCLOUD_PUBLIC_KEY]='+$application.get().public_key;
		str += '&env[MARKETCLOUD_SECRET_KEY]='+$application.get().secret_key;
		return str;

	};

}]);