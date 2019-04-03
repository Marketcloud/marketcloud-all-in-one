 
var app = angular.module('DataDashboard');
app.controller('CreateApplicationController', ['$scope', '$http', '$location', '$rootScope',
        function(scope, http, location, $rootScope) {


            scope.application = {};


            scope.create = function() {
                scope._invalid = null;
                var validation = window.Models.Application.validate(scope.application);
                if (false === validation.valid) {
                    scope._invalid = validation.invalidPropertyName;
                }
                http({
                        method: 'POST',
                        url: '/applications',
                        data: scope.application
                    })
                    .then(function(response) {
                        notie.alert(1, "Application created", 1.5);
                        location.path('#/applications/list')

                    })
                    .catch(function(error) {
                        notie.alert(3, "An error has occurred, please try again", 1.5);
                    })
            }


        }
    ]);
