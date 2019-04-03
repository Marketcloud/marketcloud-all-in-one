var app = angular.module('Marketcloud.Account');

/*app.config(function($locationProvider){
	$locationProvider.html5Mode(true);
})
*/
function getURLParameterByName(name) {
    var url = window.location.href;
    url = url.toLowerCase(); // This is just to avoid case sensitiveness  
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}


app.controller('ResetPasswordController',['$scope','$http','$location',function(scope,http,$location){


	scope.waiting = false;
	scope.showSuccessMessage = false;
	scope.error = null;

	


	scope.submitNewPassword = function() {
		var payload = {
	    		password : scope.password,
	    		confirm_password : scope.confirm_password,
	    		email : getURLParameterByName('email'),
	    		reset_code : getURLParameterByName('reset_code')
	    	}
	    scope.waiting = true;
	    http({
	    	method : 'POST',
	    	url : '/account/reset',
	    	data : {
	    		password : scope.password,
	    		confirm_password : scope.confirm_password,
	    		email : getURLParameterByName('email'),
	    		reset_code : getURLParameterByName('reset_code')
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