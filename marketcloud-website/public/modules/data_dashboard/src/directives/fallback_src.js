	

	var app  = angular.module('DataDashboard');
	app.directive('fallbackSrc', function() {
	  return {
	    link: function(scope, element, attrs) {
	      element.bind('error', function() {
	        if (attrs.src !== attrs.fallbackSrc) {
	          attrs.$set('src', attrs.fallbackSrc);
	        }
	      });
	    }
	  };
	});