'use strict';
/* globals angular */
var app = angular.module('DataDashboard');
JSON.flatten = function(data) {
    var result = {};
    function recurse (cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
             for(var i=0, l=cur.length; i<l; i++)
                 recurse(cur[i], prop + "[" + i + "]");
            if (l == 0)
                result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop+"."+p : p);
            }
            if (isEmpty && prop)
                result[prop] = {};
        }
    }
    recurse(data, "");
    return result;
}
app.controller('TranslationsController',
	['$scope', 'resource','resourceType',
	function(scope, resource,type) {

	
		// The resource to translate
		scope.resource = resource.data.data;
		// Init locales
		if (!scope.resource.hasOwnProperty('locales')){
			scope.resource.locales = {};
			scope.availableLocales.forEach(function(locale){
				scope.resource.locales[locale] = {};
			})
		} else {
			// Let''s just be sure the locals object has every locale 
			// initialized to an empty object
			scope.availableLocales.forEach(function(locale){
				if (!scope.resource.locales.hasOwnProperty(locale))
					scope.resource.locales[locale] = {};
			})
		}



		// The type of the resource, product, category, etc...
		scope.type = type;

		scope.getTranslatableProperties = function(){
			return Object.keys(JSON.flatten(scope.resource))
			.filter(function(k){
				return (k.indexOf('variant') === -1 &&
						k.indexOf('locale') === -1)
			})
		}

		scope.translatables = scope.getTranslatableProperties();

		var props_to_translate = {
			products : ["name","description"],
			categories : ["name","description"],
			brands : ["name","description"],
			collections : ["name","description"],
		}


		

		scope.save = function(){
			
		}
	}
]);