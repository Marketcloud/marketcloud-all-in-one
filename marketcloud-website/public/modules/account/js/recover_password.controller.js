var app = angular.module('Marketcloud.Account');


app.controller('RecoverPasswordController',['$scope','$http',function(scope,http){


	scope.email = '';
	scope.waiting = false;
	scope.showSuccessMessage = false;
	scope.error = null;


	scope.requestRecovery = function() {
		var email_regex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

	    if (!email_regex.test(scope.email)){
	      scope.error = 'The email address must be valid';
	      return;
	    }
	    scope.waiting = true;
	    http({
	    	method : 'POST',
	    	url : '/account/recover',
	    	data : {
	    		email : scope.email
	    	}
	    })
	    .then(function(response){
	    	// The password recovery has succeded
	    	scope.waiting = false;
	    	scope.showSuccessMessage = true;
	    	
	    })
	    .catch(function(response){
	    	// An error has occurred
	    	scope.waiting = false;
	    	alert("An error has occurred");
	    })


	}
}])