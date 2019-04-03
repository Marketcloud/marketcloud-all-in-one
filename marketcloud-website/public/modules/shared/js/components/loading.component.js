if ('undefined' !== typeof module) {

	module.exports = function(app) {
		app.controller('Loading',['$scope','$interval',function(scope,interval){

		    scope.counter = 1;
		    interval(function(){

		        scope.counter++;
		        if (scope.counter >3)
		            scope.counter = 1;

		    },600);
		    
		}])

		app
		.component('loading',{
		        templateUrl : '/modules/shared/js/components/loading.component.html',
		        controller : 'Loading', 
		        bindings : {}
		})
	}

} else {
	var app  = angular.module('Marketcloud.Shared');

app.controller('Loading',['$scope','$interval',function(scope,interval){

    scope.counter = 1;
    interval(function(){

        scope.counter++;
        if (scope.counter >3)
            scope.counter = 1;

    },600);
    
}])

app
.component('loading',{
        templateUrl : '/modules/shared/js/components/loading.component.html',
        controller : 'Loading', 
        bindings : {}
})
}
