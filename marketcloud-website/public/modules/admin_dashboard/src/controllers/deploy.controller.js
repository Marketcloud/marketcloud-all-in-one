module.exports = function(app){


app.controller('DeployController',['$scope','$rootScope','application',
	function(scope,$rootScope,application){

	scope.selectedTemplate = null;

	$rootScope.application = application;
	$rootScope.$broadcast('$dashboardSectionChange',{section : "deploy"});
	scope.getHerokuURL = function() {
		var str = 'https://heroku.com/deploy';
		str += '?template='+scope.selectedTemplate;
		str += '&env[MARKETCLOUD_PUBLIC_KEY]='+encodeURIComponent(scope.application.public_key);
		str += '&env[MARKETCLOUD_SECRET_KEY]='+encodeURIComponent(scope.application.secret_key);
		return str;

	};

}]);

}