module.exports = function(app) {



    app.controller('ApplicationsController', ['$scope', 'applications', '$location', '$rootScope',
        function($scope, applications, location, $rootScope) {


            $scope.applications = applications.data.data;

            $rootScope.$broadcast('$dashboardSectionChange', { section: "home" });

            $scope.filterApps = function() {
                if ($scope.q === '')
                    $scope.applications = applications.data.data;
                $scope.applications = $scope.applications.filter(function(a) {
                    return a.name.toLowerCase().indexOf($scope.q.toLowerCase()) > -1;
                });
            };

            $scope.isNullOrUndefined = function(value) {
                return null === value || 'undefined' == typeof value;
            };

        }
    ]);


    app.controller('ApplicationsCreateController', ['$scope', '$http', 'Models', '$location', '$rootScope',
        function(scope, http, Models, location, $rootScope) {


            scope.application = {};

            $rootScope.$broadcast('$dashboardSectionChange', { section: "create" });

            scope.create = function() {
                scope._invalid = null;
                var validation = Models.Application.validate(scope.application);
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
                        location.path('/')

                    })
                    .catch(function(error) {
                        notie.alert(3, "An error has occurred, please try again", 1.5);
                    })
            }


        }
    ]);

    app.controller('ApplicationOverviewController',
        ['$scope', '$http', 'application', '$rootScope',
        function(scope, http, application, $rootScope) {

            



            $rootScope.application = application;

            // Loading activities here
            http({
                  url : '/applications/'+application.id+'/activity',
                  method : 'GET',
                  timeout : 2000
            })
            .then(function(response){
                scope.activities = response.data.data;
            })
            .catch( function(error){
                notie.alert(3, 'Unable to load application logs', 1.5);
            })

            //TODO grab statistical information

            $rootScope.$broadcast('$dashboardSectionChange', { section: "overview" });

            function getNextMonth(date) {
                var next_month = new Date(date);
                next_month.setMonth(date.getMonth() + 1);
                return next_month;
            }

            scope.kilobytesToGigabytes = function(kb) {
                return (kb / 1024) / 1024;
            }

            scope.application.renew_date
            scope.getMethodCSSClass = function(a) {
                var cls = null;
                switch (a.method) {
                    case 'GET':
                        cls = 'label-success';
                        break;
                    case 'POST':
                        cls = 'label-info';
                        break;
                    case 'PUT':
                        cls = 'label-warning';
                        break;
                    case 'PATCH':
                        cls = 'label-warning';
                        break;
                    case 'DELETE':
                        cls = 'label-danger';
                        break;
                    default:
                        cls = 'label-success';
                        break;

                }
                return cls;
            };
        }
    ])

    app.controller('ApplicationActivitiesController', ['$scope', '$http', 'application', '$rootScope',
        function(scope, http, application, $rootScope) {

            $rootScope.application = application;

        }
    ])

    app.controller('ApplicationSettingsController', ['$scope', 'application', '$http', '$location', '$rootScope', 'BillingPlans',
        function($scope, application, $http, $location, $rootScope, BillingPlans) {

            $rootScope.application = application;
            $scope.application = application;

            $rootScope.$broadcast('$dashboardSectionChange', { section: "settings" });

            $scope.plans = BillingPlans;
            console.log($scope.plans);
            $scope.currentPlan = null;
            for (var k in BillingPlans) {
                if ($scope.application.plan_name === BillingPlans[k].name)
                    $scope.currentPlan = BillingPlans[k];
            }
            console.log("Current plan is ", $scope.currentPlan)

            $scope.updateApplication = function() {

                var update = {
                    url: $scope.application.url,
                    name: $scope.application.name
                }

                $http
                    .put('/applications/' + $scope.application.id, update)
                    .then(function(response) {
                        notie.alert(1, 'The application has been updated.', 1.5);
                    })
                    .catch(function(error) {
                        notie.alert(3, 'An error has occurred. Please try again.', 1.5);
                    })
            }

            $scope.deleteApplication = function() {

                notie.confirm('Do you really want to delete the application? It is not reversible!', 'Confirm', 'Cancel', function() {
                    $http
                        .delete('/applications/' + $scope.application.id)
                        .then(function(response) {
                            notie.alert(1, 'The application has been deleted.', 1.5);
                            $location.path('/');
                        })
                        .catch(function(response) {
                            notie.alert(3, 'An error has occurred, please try again.', 1.5);

                        })
                });
            }

            $scope.regenerateKeys = function() {
                notie.confirm('Do you really want to update the application\'s keys?', 'Confirm', 'Cancel', function() {

                    $http
                        .put('/applications/' + $scope.application.id + '/regenerateKeys')
                        .then(function(response) {
                            $scope.application.public_key = response.data.data.public_key;
                            $scope.application.secret_key = response.data.data.secret_key;
                            notie.alert(1, 'Keys regenerated correctly.', 1.5);
                        })
                        .catch(function(response) {
                            notie.alert(3, 'An error has occurred. Please retry', 1.5)
                        })

                })

            }



        }
    ]);
};