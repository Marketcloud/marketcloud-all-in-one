(function() {

  var app = angular.module('AdminDashboard', [
    'ngRoute',
    'ngclipboard',
    'angular-loading-bar'
  ]);


  window.API_BASE_URL = 'https://api.marketcloud.it';

  var fallbackSrcDirective = require('./directives/fallbackSrc.directive.js')(app);
  var applicationComponent = require('./components/application/application.component.js')(app);
  var navigationController = require('./controllers/navigation.controller.js')(app);
  var applicationsController = require('./controllers/applications.controller.js')(app);
  var deployController = require('./controllers/deploy.controller.js')(app);
  var webhooksController = require('./controllers/webhooks.controller.js')(app);
  var integrationsController = require('./controllers/integrations.controller.js')(app);
  var collaboratorsController = require('./controllers/collaborators.controller.js')(app);
  var billingController = require('./controllers/billing.controller.js')(app);
  var loadingComponent = require('../../shared/js/components/loading.component.js')(app);
  var ModelsFactories = require('./factories/models.factory.js')(app);
  var RolesPresetsFactories = require('./factories/rolePresets.factory.js')(app);

  var ACLControllers = require('./controllers/acl.controllers.js')(app);

/*
* Since angular 1.6.0 The default location hashPrefix is the hashBang
* In order to keep our links we set it to '' empty string.
*/
app.config(['$locationProvider', function($locationProvider) {
  $locationProvider.hashPrefix('');
}]);

  app.run(function($rootScope, $route) {

    $rootScope.$on('$routeChangeSuccess', function() {

      var _route = angular.copy($route.current.$$route);

      //Per evitare che quando cambia la rotta, il sidebar controller non sappia che app
      // sia stata caicata, lo mettiamo nel rootScope
      if ($route.current.locals.application)
        $rootScope.application = angular.copy($route.current.locals.application);

      // Navigation controller listens for this event (sidebar.js)



    })
  })

  app.factory('$app', ['$http', '$q', function($http, $q) {
    return {
      apps: {},
      getById: function(id) {

        if (this.apps[id]) {
          return $q.when(this.apps[id]);
        }

        var that = this;
        return $http({
            url: '/applications/list/' + Number(id),
            method: 'GET'
          })
          .then(function(response) {
            that.apps[id] = response.data.data;
            return $q.when(that.apps[id]);
          })



      },
      clearAppCache: function(id) {
        delete this.apps[id];
      }
    }
  }])


  app.factory('BillingPlans', function() {
    var BILLING_PLANS = {
      "free": {
        name: 'free',
        id: 'free',
        price_monthly: 0,
        price_yearly: 0,
        api_calls_quota_max: '5000',
        storage: 0.5
      },
      "month-19": {
        name: 'cumulus',
        id: 'month-19',
        price_monthly: 19,
        price_yearly: 190,
        api_calls_quota_max: '100000',
        storage: 1
      },
      "month-49": {
        name: 'stratus',
        id: 'month-49',
        price_monthly: 49,
        price_yearly: 490,
        api_calls_quota_max: '450000',
        storage: 2
      },
      "month-99": {
        name: 'nimbo stratus',
        id: 'month-99',
        price_monthly: 99,
        price_yearly: 990,
        api_calls_quota_max: '1500000',
        storage: 5
      },
    };
    return BILLING_PLANS;
  })


  app.factory('User', function(){
    var element = $("#JSONUserData");
    var json = JSON.parse(element.text());
    console.log("The user is ",json);
    return json;
  })



  function resolveApps($http) {
    return $http({
      url: '/applications/list/',
      method: 'GET'
    })
  }



  function resolveSingleApp($route, $app) {

    return $app.getById($route.current.params.id);


  }


  app.config(function($routeProvider) {

    $routeProvider
      .when('/', {
        name: 'home',
        templateUrl: '/modules/admin_dashboard/templates/applications.html',
        controller: 'ApplicationsController',
        resolve: {
          applications: ['$http', resolveApps]
        }
      })
      .when('/applications/:id', {
        redirectTo: '/applications/:id/overview'
      })
      .when('/applications/:id/overview', {
        name: 'overview',
        templateUrl: '/modules/admin_dashboard/templates/application_overview.html',
        controller: 'ApplicationOverviewController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp]
        }
      })
      .when('/applications/:id/billing', {
        name: 'billing',
        templateUrl: '/modules/admin_dashboard/templates/application_billing.html',
        controller: 'ApplicationBillingController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp],
          account: ['$http', function(http) {
            return http({
              method: 'GET',
              url: '/account/get',
            })
          }]
        }
      })
      .when('/applications/:id/settings', {
        name: 'settings',
        templateUrl: '/modules/admin_dashboard/templates/application_settings.html',
        controller: 'ApplicationSettingsController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp]
        }
      })
      .when('/applications/:id/deploy', {
        name: 'deploy',
        templateUrl: '/modules/admin_dashboard/templates/application_deploy.html',
        controller: 'DeployController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp],
        }
      })
      .when('/applications/:id/integrations', {
        name: 'integrations',
        templateUrl: '/modules/admin_dashboard/templates/application_integrations.html',
        controller: 'IntegrationsController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp],
        }
      })

    .when('/applications/:id/webhooks', {
        name: 'webhooks',
        templateUrl: '/modules/admin_dashboard/templates/application_webhooks.html',
        controller: 'WebhooksController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp],
          webhooks: ['$http', '$route', function($http, $route) {
            return $http({
              method: 'GET',
              url: '/applications/' + $route.current.params.id + '/webhooks'
            })
          }]
        }
      })
      .when('/applications/:id/collaborators', {
        name: 'collaborators',
        templateUrl: '/modules/admin_dashboard/templates/application_collaborators.html',
        controller: 'CollaboratorsController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp],
          collaborators: ['$http', '$route', function($http, $route) {
            return $http({
              method: 'GET',
              url: '/applications/' + $route.current.params.id + '/collaborators'
            })
          }]
        }
      })
      .when('/applications/:id/acl', {
        name: 'acl',
        templateUrl: '/modules/admin_dashboard/templates/application_roles.html',
        controller: 'ACLController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp],
          roles: ['$http', '$route', function($http, $route) {
            return $http({
              method: 'GET',
              url: '/applications/' + $route.current.params.id + '/roles'
            })
          }]
        }
      })
      .when('/applications/:id/acl/new', {
        name: 'acl',
        templateUrl: '/modules/admin_dashboard/templates/new_role.html',
        controller: 'NewRoleController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp],
        }
      })
      .when('/applications/:id/acl/:roleId/edit', {
        name: 'acl',
        templateUrl: '/modules/admin_dashboard/templates/edit_role.html',
        controller: 'EditRoleController',
        resolve: {
          application: ['$route', '$app', resolveSingleApp],
          role: ['$route', '$http', function($route, $http) {
            return $http({
              method: 'GET',
              url: '/applications/' + $route.current.params.id + '/roles/' + $route.current.params.roleId
            })
          }]
        }
      })
      .when('/new', {
        name: 'create',
        templateUrl: '/modules/admin_dashboard/templates/application_create.html',
        controller: 'ApplicationsCreateController'
      })

    .otherwise({
      redirectTo: '/'
    });
  });



})();