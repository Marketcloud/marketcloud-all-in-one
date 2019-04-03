(function() {
  'use strict';
  /* globals angular, marketcloud, notie, API_BASE_URL */



  /**
   * The dashboard version, this is used for reporting
   * @type {String}
   */
  window.VERSION = '1.9.1';


  /**
   * [The base url for api calls]
   * @type {String}
   */
  window.API_BASE_URL = '/api/v0';



  /**
   *  Error reporting facility
   **/
  window.LAST_ERROR = null;

  /**
   * Angular Selectize2
   * https://github.com/machineboy2045/angular-selectize
   **/



  var app = angular
    .module('DataDashboard', [
      'ngRoute',
      'ngMessages',
      'ngTagsInput',
      'angular-loading-bar',
      'frapontillo.bootstrap-switch',
      'ngSanitize',
      'angularFileUpload',
      'Marketcloud.Shared',
      'angularMoment',
      'chart.js',
      'trumbowyg-ng',
      'moment-picker',
      'dndLists'
    ]);


  /*
   *  Since angular 1.6.0 The default location hashPrefix is the hashBang
   *  In order to keep our links we set it to '' empty string.
   */
  app.config(['$locationProvider', function($locationProvider) {
    $locationProvider.hashPrefix('');
  }]);

  app.config(['$compileProvider', function($compileProvider) {
    $compileProvider.debugInfoEnabled(false);
  }]);


  app.run(function() {
    notie.setOptions({

      colorSuccess: '#27ae60',
      colorWarning: '#f39c12',
      colorError: '#c0392b',
      colorInfo: '#2980b9',
      colorNeutral: '#95a5a6',
      colorText: '#FFFFFF',
      dateMonths: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'], // For other languages
      animationDelay: 300, // Be sure to also change "transition: all 0.3s ease" variable in .scss file
      backgroundClickDismiss: true
    });
  });

    app.run(['StormConfiguration','$http', function(Configuration, $http) {
      var theme = Configuration.get('theme');
      Configuration.applyTheme(theme);
      return;

    }]);



  /*
    This is for sending complex JSON params
  */
  app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.paramSerializer = '$httpParamSerializerJQLike';
  }]);


  /*
    Catching angular errors and sending them to the server
   */
  app.factory('$exceptionHandler', ['$injector', function($injector) {


    return function myExceptionHandler(exception, cause) {

      var $http = $injector.get('$http')
      var $log = $injector.get('$log');
      var $getBrowser = $injector.get('GetBrowser');

      $log.error(exception);

      // Not logging the same error over and over for each session
      if (window.LAST_ERROR === exception.toString()) {
        console.info('Not logging this error instance, because it was already logged.');
        return;
      }

      window.LAST_ERROR = exception.toString();
      $http({
          method: 'POST',
          url: '/logs',
          data: {
            type: 'frontend-error',
            source: 'data-dashboard',
            browser: $getBrowser(),
            url: window.location.href,
            error: {
              error: exception.toString(),
              stack: exception.stack || null,
              cause: cause || null
            }
          }
        })
        .then(function(response) {
          $log.warn('An error was logged.');
        })
        .catch(function(response) {
          $log.warn('Unable to log errors, if you see this message, please contact us at info@marketcloud.it .Thank you.');
        });
      return true;
    };
  }]);



  app.run([
    '$rootScope',
    '$route',
    '$application',
    '$account',
    '$location',
    function($rootScope, $route, $application, $account, $location) {

    $rootScope.application = window.current_application;
    $rootScope.user = window.user;


    $application.set(window.current_application);
    $account.set(window.user);

    $rootScope.$on('$routeChangeStart', function(event, next, current){
      
      var nextRouteName = next.$$route.name;
      var currentUserRole = $application.get("role");

      // Admins and owners have all powers
      if (currentUserRole == 'admin' || currentUserRole === 'owner')
        return;


      // Checking for explicit denyrules
      if (next.$$route.acl){
        var deniedRoles = next.$$route.acl.deny || [];

        
        if (deniedRoles.indexOf(currentUserRole) > -1) {
          notie.alert(2,"Access restricted for users with role "+currentUserRole,2);
          
          // We also hide the loading animation to prevent the view from
          // being hidden
          $rootScope.$evalAsync(function() {
            $rootScope.showLoadingAnimation = false;

            // If the entry point is an invalid route, we must
            // send them to home, otherwise they will not see any route.
            if (!current)
              $location.path('/')
          });

          // Cancel the route change event
          event.preventDefault();

        } 

      }

      console.log("Next route is "+nextRouteName+" and your role is "+currentUserRole);
    })



    $rootScope.$on('$routeChangeStart', function(event, next, current) {
      $rootScope.showLoadingAnimation = true;
    });
    $rootScope.$on('$routeChangeError', function() {
      $rootScope.showLoadingAnimation = false;
    });
    $rootScope.$on('$routeChangeSuccess', function() {

      // if ($application.announcementWasSeenInThisSession !== true) {
      //   notie.alert(4,'Please take time to review our <a href="/announcement" target="_blank" style="color:white;text-decoration:underline">important announcement</a>')
      // }
      // $application.announcementWasSeenInThisSession = true
      var _route = angular.copy($route.current.$$route);

      // Fallback route name
      var routeName = 'unknown';

      if (_route && _route.name)
        routeName = _route.name;

      $rootScope.showLoadingAnimation = false;

      // Sidebar controller listens for this event (sidebar.js)
      $rootScope.$broadcast('$dashboardSectionChange', {
        section: routeName
      });


    });
  }]);


  app.run(['$window', '$rootScope', function($window, $rootScope) {

    $rootScope.online = navigator.onLine;

    $window.addEventListener('offline', function() {
      notie.alert(2, 'You are currently offline. Waiting for connection..');
      $rootScope.$apply(function() {
        $rootScope.online = false;
      });
    }, false);

    $window.addEventListener('online', function() {
      notie.alertHide();
      $rootScope.$apply(function() {
        $rootScope.online = true;
      });
    }, false);

  }]);

  /*
    This interceptor makes sure that if the token expires,
    the browser reloads to get a new one.

    We  might consider to expose a "refresh token" endpoint
    but for now... we keep it simple
   */
  app
    .service('authInterceptor', ['$q', function($q) {
      var service = this;

      service.responseError = function(response) {
        if (response.status === 401) {
          notie.alert(4, 'Session expired, reloading page...');
          window.location.reload();
        }
        return $q.reject(response);
      };
    }])
    .config(['$httpProvider', function($httpProvider) {
      $httpProvider.interceptors.push('authInterceptor');
    }]);

  app.run(['$rootScope', '$location', function($root, $location) {
    $root.$on('$routeChangeError', function(event, route, args, response) {


      if (response.status >= 500)
        $location.path('/error');
      else if (response.status === 400) {
        notie.alert(2, 'An error has occurred. Please check the data you entered', 1);
      } else {
        console.log("$routeChangeError", response)
        notie.alert(2, 'An error has occurred.', 1);
      }

    });
  }]);



  app.config(['$routeProvider',
    function($routeProvider) {
      $routeProvider
        .when('/applications/list', {
          name: 'applications',
          templateUrl: '/modules/data_dashboard/templates/list_applications.html',
          controller: 'ListApplicationsController'
        })
        .when('/applications/new', {
          name: 'applications.new',
          templateUrl: '/modules/data_dashboard/templates/new_application.html',
          controller: 'CreateApplicationController'
        })
        .when('/analytics', {
          name: 'analytics',
          templateUrl: '/modules/data_dashboard/templates/analytics.html',
          controller: 'AnalyticsController',
          resolve: {
            analytics: ['$marketcloud','$location', function($marketcloud, $location) {

              var range = $location.search().range || "this month";

              var _from = null
              var _to = null;

              switch (range) {
                case "today":
                  var _from = new Date();
                  _from.setHours(0,0,0,0);
                break;
                case "yesterday":
                  var _from = new Date();
                  _from.setDate(_from.getDate() - 1)
                  _from.setHours(0,0,0,0);

                  var _to = new Date();
                  _to.setHours(0,0,0,0);          
                break;
                case "this week":
                  var _from = new Date();
                  _from.setDate(_from.getDate() - 7)
                  _from.setHours(0,0,0,0);
                break;
                default :
                  var _from = new Date();
                  _from.setMonth(_from.getMonth() - 1);
                  _from.setHours(0, 0, 0, 0);

                break;
              }

              

              if (!_to)
                _to = new Date();



              return $marketcloud.orders.list({
                $created_at_gt : _from.getTime(),
                $created_at_lt : _to.getTime(),
                per_page :9999
              })
            }]
          ,
          customers : ['$marketcloud','$location', function($marketcloud, $location) {
             

            var range = $location.search().range || "this month";

              var _from = null
              var _to = null;

              switch (range) {
                case "today":
                  var _from = new Date();
                  _from.setHours(0,0,0,0);
                break;
                case "yesterday":
                  var _from = new Date();
                  _from.setDate(_from.getDate() - 1)
                  _from.setHours(0,0,0,0);

                  var _to = new Date();
                  _to.setHours(0,0,0,0);          
                break;
                case "this week":
                  var _from = new Date();
                  _from.setDate(_from.getDate() - 7)
                  _from.setHours(0,0,0,0);
                break;
                default :
                  var _from = new Date();
                  _from.setMonth(_from.getMonth() - 1);
                  _from.setHours(0, 0, 0, 0);

                break;
              }

              

              if (!_to)
                _to = new Date();

            return $marketcloud.users.list({
              $created_at_gt : _from.toISOString(),
              $created_at_lt : _to.toISOString(),
              per_page :9999
            })
          }],
          carts : ['$marketcloud','$location', function($marketcloud, $location) {
             

            var range = $location.search().range || "this month";

              var _from = null
              var _to = null;

              switch (range) {
                case "today":
                  var _from = new Date();
                  _from.setHours(0,0,0,0);
                break;
                case "yesterday":
                  var _from = new Date();
                  _from.setDate(_from.getDate() - 1)
                  _from.setHours(0,0,0,0);

                  var _to = new Date();
                  _to.setHours(0,0,0,0);          
                break;
                case "this week":
                  var _from = new Date();
                  _from.setDate(_from.getDate() - 7)
                  _from.setHours(0,0,0,0);
                break;
                default :
                  var _from = new Date();
                  _from.setMonth(_from.getMonth() - 1);
                  _from.setHours(0, 0, 0, 0);

                break;
              }

              

              if (!_to)
                _to = new Date();

            return $marketcloud.carts.list({
              $created_at_gt : _from.toISOString(),
              $created_at_lt : _to.toISOString(),
              per_page :9999
            })
          }]
        }
        })
        .when('/', {
          name: 'home',
          templateUrl: '/modules/data_dashboard/templates/home.html',
          controller: 'HomeController',
          resolve: {
            analytics: ['$http', function($http) {

              var one_month_ago = new Date();
              one_month_ago.setMonth(one_month_ago.getMonth() - 1);
              one_month_ago.setHours(0, 0, 0, 0);

              return $http({
                method: 'GET',
                url: API_BASE_URL + '/orders',

                params: {
                  $created_at_gt: one_month_ago.getTime(),
                  per_page: 99999
                },
                headers: {
                  Authorization: window.public_key + ':' + window.token
                }
              });
            }]
          }
        })
        .when('/error', {
          templateUrl: '/modules/data_dashboard/templates/error.html',
        })
        .when('/bundled_product/create', {
          name: 'products.create',
          templateUrl: '/modules/data_dashboard/templates/new_bundled_product.html',
          controller: 'NewBundledProductController'
        })
        .when('/bundled_product/:productId/edit', {
          name: 'products.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_bundled_product.html',
          controller: 'EditBundledProductController',
          resolve: {
            product: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.products.getById($route.current.params.productId);
            }]
          }
        })
        /*
        .when('/groupedProducts/create', {
          name: 'products.create',
          templateUrl: '/modules/data_dashboard/templates/new_grouped_product.html',
          controller: 'NewGroupedProductController'
        })
        .when('/groupedProducts/:productId/edit', {
          name: 'products.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_grouped_product.html',
          controller: 'EditGroupedProductController',
          resolve: {
            product: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.products.getById($route.current.params.productId);
            }]
          }
        })
        .when('/bundled_product/create', {
          name: 'products.create',
          templateUrl: '/modules/data_dashboard/templates/new_bundled_product.html',
          controller: 'NewBundledProductController'
        })
        .when('/bundled_product/:productId/edit', {
          name: 'products.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_bundled_product.html',
          controller: 'EditBundledProductController',
          resolve: {
            product: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.products.getById($route.current.params.productId);
            }]
          }
        })
        .when('/configurable_product/create', {
          name: 'products.create',
          templateUrl: '/modules/data_dashboard/templates/new_configurable_product.html',
          controller: 'NewConfigurableProductController'
        })
        .when('/configurable_product/:productId/edit', {
          name: 'products.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_configurable_product.html',
          controller: 'EditConfigurableProductController',
          resolve: {
            product: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.products.getById($route.current.params.productId);
            }]
          }
        }))*/
        .when('/products', {
          name: 'products.list',
          templateUrl: '/modules/data_dashboard/templates/products.html',
          controller: 'ListProductsController',
          reloadOnSearch : false,
          resolve: {
            products: ['$marketcloud', 'StormConfiguration','$route','$location',
                       function($marketcloud, configuration, $route, $location) {



              // Fetching filters from storage
              var filters = configuration.get("products_list_active_filters") || [];

              // Default query to products endpoint
              var query = {
                page: 1
              };

              // Adding filters to query
              filters.forEach(function(filter) {
                query[filter.name] = filter.value;
              })

              // Applying Url query
              var urlQuery = {}
              try {
                urlQuery = JSON.parse($location.search().query)
              } catch(e) {
                urlQuery = {};
              }


              for (var k in urlQuery){
                query[k] = urlQuery[k];
              }

              // Executing the query
              return $marketcloud.products.list(query);
            }]
          }
        })
        .when('/product_with_variants/create', {
          name: 'products.create',
          templateUrl: '/modules/data_dashboard/templates/new_productWithVariants.html',
          controller: 'NewProductWithVariantsController'
        })
        .when('/product_with_variants/create2', {
          name: 'products.create',
          templateUrl: '/modules/data_dashboard/templates/new_productWithVariants2.html',
          controller: 'NewProductWithVariantsController'
        })
        .when('/simple_product/create', {
          name: 'products.create',
          templateUrl: '/modules/data_dashboard/templates/new_simple_product.html',
          controller: 'NewSimpleProductController'
        })
        .when('/simple_product/:productId/edit', {
          name: 'products.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_simple_product.html',
          controller: 'EditSimpleProductController',
          resolve: {
            product: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.products.getById($route.current.params.productId);
            }]
          }
        })
        .when('/product_with_variants/:productId/edit', {
          name: 'products.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_productWithVariants.html',
          controller: 'EditProductWithVariantsController',
          resolve: {
            product: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.products.getById($route.current.params.productId);
            }]
          }
        })
        .when('/products/:productId/variants', {
          name: 'products.variants.list',
          templateUrl: '/modules/data_dashboard/templates/list_variants.html',
          controller: 'ListVariantsController',
          resolve: {
            resolvedProduct: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.products.getById($route.current.params.productId);
            }]
          }
        })
        .when('/products/:productId/variants/:variantId', {
          name: 'products.variants.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_variant.html',
          controller: 'EditVariantController',
          resolve: {
            resolvedProduct: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.products.getById($route.current.params.productId);
            }]
          }
        })
        .when('/resource/:resourceName', {
          name: '',
          templateUrl: function(params) {
            return '/modules/data_dashboard/templates/resources.html';
          },
          //templateUrl: '/modules/data_dashboard/templates/edit_variant.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud[$route.current.params.resourceName].list();
            }],
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]

          }
        })
        .when('/products/:productId/translations', {
          name: 'products.translation.edit',
          templateUrl: '/modules/data_dashboard/templates/product_translations.html',
          controller: 'EditProductTranslationsController',
          resolve: {
            product: ['$marketcloud', '$route', '$q', '$location', function($marketcloud, $route, $q, $location) {
              return $marketcloud.products.getById($route.current.params.productId);
            }]
          }
        })
        .when('/categories/:id/translations', {
          name: 'categories.translation.edit',
          templateUrl: '/modules/data_dashboard/templates/category_translations.html',
          controller: 'EditCategoryTranslationsController',
          resolve: {
            category: ['$marketcloud', '$route', function($marketcloud, $route, ) {
              return $marketcloud.categories.getById($route.current.params.id);
            }]
          }
        })
        .when('/brands/:id/translations', {
          name: 'brands.translation.edit',
          templateUrl: '/modules/data_dashboard/templates/brand_translations.html',
          controller: 'EditBrandTranslationsController',
          resolve: {
            brand: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.brands.getById($route.current.params.id);
            }]
          }
        })
        .when('/collections/:id/translations', {
          name: 'collections.translation.edit',
          templateUrl: '/modules/data_dashboard/templates/collection_translations.html',
          controller: 'EditCollectionTranslationsController',
          resolve: {
            collection: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.collections.getById($route.current.params.id);
            }]
          }
        })
        .when('/contents/:id/translations', {
          name: 'contents.translation.edit',
          templateUrl: '/modules/data_dashboard/templates/content_translations.html',
          controller: 'EditContentTranslationsController',
          resolve: {
            content: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.contents.getById($route.current.params.id);
            }]
          }
        })
        .when('/invoices/create/:orderId?', {
          name: 'invoices.create',
          templateUrl: '/modules/data_dashboard/templates/new_invoice.html',
          controller: 'NewInvoiceController',
          resolve: {
            parentOrder: ['$marketcloud', '$route', function($marketcloud, $route) {
              if ($route.current.params.orderId)
                return $marketcloud.orders.getById($route.current.params.orderId);
              else
                return {};
            }],
            orders: ['$marketcloud', function($marketcloud){
              return $marketcloud.orders.list({per_page:5})
            }]
          }
        })
        .when('/invoices/:invoiceId/edit', {
          name: 'invoices.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_invoice.html',
          controller: 'EditInvoiceController',
          resolve: {
            invoice: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.invoices.getById($route.current.params.invoiceId);
            }]
          }
        })
        .when('/invoices/', {
          name: 'invoices.list',
          templateUrl: '/modules/data_dashboard/templates/invoices.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', function($marketcloud) {
              return $marketcloud.invoices.list({
                page: 1
              });
            }],
            resourceName: function() {
              return 'invoices';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })
        .when('/payments/', {
          name: 'payments.list',
          templateUrl: '/modules/data_dashboard/templates/payments.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', function($marketcloud) {
              return $marketcloud.payments.list({
                page: 1
              });
            }],
            resourceName: function() {
              return 'payments';
            },
            dependencies: ['$q', '$marketcloud', function($q, $marketcloud) {
              return $q.all({
                events: $marketcloud.events.list({
                  "request.path": "/v0/payments"
                })
              })
            }]
          }
        })
        .when('/payments/alerts', {
          name: 'payments.alerts.list',
          templateUrl: '/modules/data_dashboard/templates/payments_alerts.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$http', function($http) {
              return $http({
                method: 'GET',
                url: window.API_BASE_URL + '/payments/alerts',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: window.public_key + ':' + window.token
                }
              });
            }],
            resourceName: function() {
              return 'events';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })
        .when('/orders', {
          name: 'orders.list',
          templateUrl: '/modules/data_dashboard/templates/orders.html',
          controller: 'OrdersController',
          reloadOnSearch : false,
          resolve: {
            ordersResponse: [
              '$marketcloud',
              '$route',
              '$location',
              'StormConfiguration',
              function($marketcloud, $route, $location, configuration) {

              // Fetching filters from storage
              var filters = configuration.get("orders_list_active_filters") || [];

              // Default query to products endpoint
              var query = {
                page: 1
              };

              // Adding filters to query
              filters.forEach(function(filter) {
                query[filter.name] = filter.value;
              })

              // Applying Url query
              var urlQuery = {}
              try {
                urlQuery = JSON.parse($location.search().query)
              } catch(e) {
                urlQuery = {};
              }


              for (var k in urlQuery){
                query[k] = urlQuery[k];
              }


              return $marketcloud.orders.list(query);
            }]
          }
        })
        .when('/orders/create', {
          name: 'orders.create',
          templateUrl: '/modules/data_dashboard/templates/new_order.html',
          controller: 'NewOrderController'
        })
        .when('/orders/:orderId/view', {
          name: 'orders.edit',
          templateUrl: '/modules/data_dashboard/templates/order.html',
          controller: 'OrderController',
          resolve: {
            order: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.orders.getById($route.current.params.orderId);
            }],
            shippingMethods: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.shippings.list();
            }],
            paymentMethods: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.paymentMethods.list();
            }]
          }
        })
        .when('/users', {
          name: 'users.list',
          templateUrl: '/modules/data_dashboard/templates/users.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.users.list({
                page : 1,
                per_page : 20,
                expand : 'orders'
              })
            }],
            resourceName: function() {
              return 'users';
            },
            dependencies: ['$q', function($q) {
              
              return $q.when({});

            }]
          }
        })
        .when('/users/create', {
          name: 'users.create',
          templateUrl: '/modules/data_dashboard/templates/new_user.html',
          controller: 'NewUserController'
        })
        .when('/users/:userId/view', {
          name: 'users.view',
          templateUrl: '/modules/data_dashboard/templates/user.html',
          controller: 'UserController',
          resolve: {
            user: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.users.getById($route.current.params.userId);
            }],
          }
        })
        .when('/categories', {
          name: 'categories.list',
          templateUrl: '/modules/data_dashboard/templates/categories.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.categories.list({
                page: 1
              });
            }],
            resourceName: function() {
              return 'categories';
            },
            dependencies: ['$q', function($q) {
              

              return $q.when({});
            }]
          }
        })
        .when('/categories/:categoryId/edit', {
          name: 'categories.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_category.html',
          controller: 'EditCategoryController',
          resolve: {
            category: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.categories.getById($route.current.params.categoryId);
            }]
          }
        })
        .when('/categories/create', {
          name: 'categories.create',
          templateUrl: '/modules/data_dashboard/templates/new_category.html',
          controller: 'CategoryController'
        })
        .when('/brands', {
          name: 'brands.list',
          templateUrl: '/modules/data_dashboard/templates/brands.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.brands.list({
                page: 1
              });
            }],
            resourceName: function() {
              return 'brands';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })

      .when('/brands/:brandId/edit', {
          name: 'brands.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_brand.html',
          controller: 'EditBrandController',
          resolve: {
            brand: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.brands.getById($route.current.params.brandId);
            }]
          }
        })
        .when('/brands/create', {
          name: 'brands.create',
          templateUrl: '/modules/data_dashboard/templates/new_brand.html',
          controller: 'BrandController'
        })
        .when('/collections', {
          name: 'collections.list',
          templateUrl: '/modules/data_dashboard/templates/collections.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.collections.list({
                page: 1
              });
            }],
            resourceName: function() {
              return 'collections';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })
        .when('/collections/:collectionId/edit', {
          name: 'collections.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_collection.html',
          controller: 'EditCollectionController',
          resolve: {
            collection: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.collections.getById($route.current.params.collectionId);
            }]
          }
        })
        .when('/collections/create', {
          name: 'collections.create',
          templateUrl: '/modules/data_dashboard/templates/new_collection.html',
          controller: 'CreateCollectionController'
        })
        .when('/integrations', {
          name: 'integrations.list',
          templateUrl: '/modules/data_dashboard/templates/integrations.html',
          controller: 'IntegrationsController'
        })
        .when('/integrations/braintree', {
          name: 'integrations.braintree',
          templateUrl: '/modules/data_dashboard/templates/integration_braintree.html',
          controller: 'IntegrationBraintreeController',
          resolve: {
            BraintreeIntegration: ['$http', function($http) {

              return $http({
                  method: 'GET',
                  url: API_BASE_URL + '/integrations/braintree',
                  headers: {
                    Authorization: window.public_key + ':' + window.token
                  }
                })
                .then(function(response) {

                  return new Promise(function(resolve) {
                    resolve(response);
                  });
                })
                .catch(function() {
                  return new Promise(function(resolve) {
                    resolve(null);
                  });
                });
            }]
          }
        })
        .when('/integrations/stripe', {
          name: 'integrations.stripe',
          templateUrl: '/modules/data_dashboard/templates/integration_stripe.html',
          controller: 'IntegrationStripeController',
          resolve: {
            StripeIntegration: ['$http', function($http) {

              return $http({
                  method: 'GET',
                  url: API_BASE_URL + '/integrations/stripe',
                  headers: {
                    Authorization: window.public_key + ':' + window.token
                  }
                })
                .then(function(response) {

                  return new Promise(function(resolve) {
                    resolve(response);
                  });
                })
                .catch(function() {
                  return new Promise(function(resolve) {
                    resolve(null);
                  });
                });
            }]
          }
        })
        .when('/contents', {
          name: 'contents.list',
          templateUrl: '/modules/data_dashboard/templates/contents.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', function($marketcloud) {
              return $marketcloud.contents.list({
                page: 1
              });
            }],
            resourceName: function() {
              return 'contents';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })
        .when('/contents/create', {
          name: 'contents.create',
          templateUrl: '/modules/data_dashboard/templates/new_content.html',
          controller: 'ContentController'
        })
        .when('/contents/:contentId/edit', {
          name: 'contents.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_content.html',
          controller: 'EditContentController',
          resolve: {
            content: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.contents.getById($route.current.params.contentId);
            }]
          }
        })



        .when('/contents/static', {
          name: 'staticContents.list',
          templateUrl: '/modules/data_dashboard/templates/staticContents/staticContents.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', function($marketcloud) {
              return $marketcloud.staticContents.list({
                page: 1
              });
            }],
            resourceName: function() {
              return 'staticContents';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })
        .when('/contents/static/create', {
          name: 'staticContents.create',
          templateUrl: '/modules/data_dashboard/templates/staticContents/new_staticContent.html',
          controller: 'CreateStaticContentController'
        })
        .when('/contents/static/:contentId/edit', {
          name: 'staticContents.edit',
          templateUrl: '/modules/data_dashboard/templates/staticContents/edit_staticContents.html',
          controller: 'EditStaticContentController',
          resolve: {
            content: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.staticContents.getById($route.current.params.contentId);
            }]
          }
        })


        .when('/events', {
          name: 'events.list',
          templateUrl: '/modules/data_dashboard/templates/events.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.events.list();
            }],
            resourceName: function() {
              return 'events';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })
        .when('/variables', {
          name: 'variables.list',
          templateUrl: '/modules/data_dashboard/templates/variables.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.variables.list();
            }],
            resourceName: function() {
              return 'variables';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })
        .when('/variables/create', {
          name: 'variables.create',
          templateUrl: '/modules/data_dashboard/templates/new_variable.html',
          controller: 'CreateVariableController'
        })
        .when('/variables/:variableId/edit', {
          name: 'variables.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_variable.html',
          controller: 'EditVariableController',
          resolve: {
            variable: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.variables.getById($route.current.params.variableId);
            }]
          }
        })
        .when('/media', {
          name: 'media.list',
          templateUrl: '/modules/data_dashboard/templates/media.html',
          controller: 'MediaListController',
          resolve: {
            media: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.media.list();
            }]
          }

        })
        .when('/promotions', {
          name: 'promotions.list',
          templateUrl: '/modules/data_dashboard/templates/promotions.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.promotions.list({
                page: 1
              });
            }],
            resourceName: function() {
              return 'promotions';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })
        .when('/promotions/create', {
          name: 'promotions.create',
          templateUrl: '/modules/data_dashboard/templates/new_promotion.html',
          controller: 'NewPromotionController',
        })
        .when('/promotions/:id/edit', {
          name: 'promotions.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_promotion.html',
          controller: 'EditPromotionController',
          resolve: {
            promotion: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.promotions.getById($route.current.params.id);
            }]
          }
        })
        .when('/coupons', {
          name: 'coupons.list',
          templateUrl: '/modules/data_dashboard/templates/coupons.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.coupons.list({
                page: 1
              });
            }],
            resourceName: function() {
              return 'coupons';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]
          }
        })
        .when('/coupons/create', {
          name: 'coupons.create',
          templateUrl: '/modules/data_dashboard/templates/new_coupon.html',
          controller: 'NewCouponController',
        })
        .when('/coupons/:id/edit', {
          name: 'coupons.create',
          templateUrl: '/modules/data_dashboard/templates/edit_coupon.html',
          controller: 'EditCouponController',
          resolve: {
            coupon: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.coupons.getById($route.current.params.id);
            }]
          }
        })
        .when('/shippings', {
          redirectTo: '/system/shippings'
        })
        .when('/shippings/create', {
          redirectTo: '/system/shippings/create'
        })
        .when('/shippings/:shippingId/edit', {
          redirectTo: '/system/shippings/:shippingId/edit'
        })
        .when('/system/taxes', {
          name: 'system.taxes.list',
          templateUrl: '/modules/data_dashboard/templates/taxes.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.taxes.list();
            }],
            resourceName: function() {
              return 'taxes';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]

          }
        })
        .when('/system/taxes/create', {
          name: 'system.taxes.create',
          templateUrl: '/modules/data_dashboard/templates/new_tax.html',
          controller: 'CreateTaxController'
        })
        .when('/system/taxes/:id/edit', {
          name: 'system.taxes.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_tax.html',
          controller: 'EditTaxController',
          resolve: {
            tax: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.taxes.getById($route.current.params.id);
            }]
          }
        })
        .when('/system/shippings', {
          name: 'system.shippings.list',
          templateUrl: '/modules/data_dashboard/templates/shippings.html',
          controller: 'ListResourcesController',
          resolve: {
            resources: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.shippings.list();
            }],
            resourceName: function() {
              return 'shippings';
            },
            dependencies: ['$q', function($q) {
              return $q.when({});
            }]

          }
        })
        .when('/system/shippings/create', {
          name: 'system.shippings.create',
          templateUrl: '/modules/data_dashboard/templates/new_shipping.html',
          controller: 'CreateShippingController'
        })
        .when('/system/shippings/:shippingId/edit', {
          name: 'system.shippings.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_shipping.html',
          controller: 'EditShippingController',
          resolve: {
            shipping: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.shippings.getById($route.current.params.shippingId);
            }]
          }
        })
        .when('/system/settings', {
          name: 'system.settings',
          templateUrl: '/modules/data_dashboard/templates/settings.html',
          controller: 'SettingsController'
        })
        .when('/system/localization', {
          name: 'system.localization',
          templateUrl: '/modules/data_dashboard/templates/localization.html',
          controller: 'LocalizationController'
        })
        .when('/system/payments', {
          name: 'system.payments',
          templateUrl: '/modules/data_dashboard/templates/paymentMethods.html',
          controller: 'PaymentMethodsController',
          resolve: {
            paymentMethods: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.paymentMethods.list();
            }]
          }
        })
        .when('/notifications', {
          name: 'notifications',
          templateUrl: '/modules/data_dashboard/templates/notifications.html',
          controller: 'NotificationsController',
          resolve: {
            notifications: ['$marketcloud', '$route', function($marketcloud) {
              return $marketcloud.notifications.list();
            }]
          }
        })
        .when('/notifications/:notificationId/edit', {
          name: 'notifications.edit',
          templateUrl: '/modules/data_dashboard/templates/edit_notification.html',
          controller: 'EditNotificationController',
          resolve: {
            notification: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.notifications.getById($route.current.params.notificationId);
            }]
          }
        })
        .when('/notifications/:notificationId/translations', {
          name: 'notifications.translation',
          templateUrl: '/modules/data_dashboard/templates/notifications_translation.html',
          controller: 'TranslateNotificationController',
          resolve: {
            notification: ['$marketcloud', '$route', function($marketcloud, $route) {
              return $marketcloud.notifications.getById($route.current.params.notificationId);
            }]
          }
        })

      .when('/notifications/create', {
          name: 'notifications.create',
          templateUrl: '/modules/data_dashboard/templates/new_notification.html',
          controller: 'NewNotificationController'
        })
        .when('/notifications/preview/:data', {
          name: 'notifications.preview',
          templateUrl: '/modules/data_dashboard/templates/notifications_preview.html',
          controller: 'PreviewNotificationController',
          resolve: {
            notification: ['$route', function($route) {
              return atob($route.current.params.data);
            }]
          }
        })
        .when('/application/billing', {
          name: 'application.billing',
          templateUrl: '/modules/data_dashboard/templates/application/application_billing.html',
          controller: 'ApplicationBillingController',
          resolve: {
            account: ['$http', function(http) {
              return http({
                method: 'GET',
                url: '/account/get',
              })
            }]
          }
        })
        .when('/application', {
          redirectTo: '/application/overview',
          acl : {
            deny : ['guest']
          }
        })
        .when('/application/overview', {
          name: 'application.overview',
          acl : {
            deny : ['guest']
          },
          templateUrl: '/modules/data_dashboard/templates/application/application_overview.html',
          controller: 'ApplicationOverviewController'
        })

      .when('/application/settings', {
          name: 'application.settings',
          acl : {
            deny : ['guest']
          },
          templateUrl: '/modules/data_dashboard/templates/application/application_settings.html',
          controller: 'ApplicationSettingsController',
        })
        .when('/application/deploy', {
          name: 'application.deploy',
          acl : {
            deny : ['guest']
          },
          templateUrl: '/modules/data_dashboard/templates/application/application_deploy.html',
          controller: 'DeployController'
        })
        .when('/application/integrations', {
          name: 'application.integrations',
          acl : {
            deny : ['guest']
          },
          templateUrl: '/modules/data_dashboard/templates/application/application_integrations.html',
          controller: 'IntegrationsController'
        })

      .when('/application/webhooks', {
          name: 'application.webhooks',
          acl : {
            deny : ['guest']
          },
          templateUrl: '/modules/data_dashboard/templates/application/application_webhooks.html',
          controller: 'WebhooksController',
          resolve: {
            webhooks: ['$http', '$route', '$application', function($http, $route, $application) {
              return $http({
                method: 'GET',
                url: '/applications/' + $application.get("id") + '/webhooks'
              })
            }]
          }
        })
        .when('/application/collaborators', {
          name: 'application.collaborators',
          acl : {
            deny : ['guest']
          },
          templateUrl: '/modules/data_dashboard/templates/application/application_collaborators.html',
          controller: 'CollaboratorsController',
          resolve: {
            collaborators: ['$http', '$route', '$application', function($http, $route, $application) {
              return $http({
                method: 'GET',
                url: '/applications/' + $application.get('id') + '/collaborators'
              })
            }]
          }
        })
        .when('/application/acl', {
          name: 'application.acl',
          acl : {
            deny : ['guest']
          },
          templateUrl: '/modules/data_dashboard/templates/application/roles.html',
          controller: 'ACLController',
          resolve: {
            roles: ['$http', '$route', '$application', function($http, $route, $application) {
              return $http({
                method: 'GET',
                url: '/applications/' + $application.get('id') + '/roles'
              })
            }]
          }
        })
        .when('/application/acl/new', {
          name: 'application.acl',
          acl : {
            deny : ['guest']
          },
          templateUrl: '/modules/data_dashboard/templates/application/new_role.html',
          controller: 'NewRoleController'
        })
        .when('/application/acl/:roleId/edit', {
          name: 'application.acl',
          acl : {
            deny : ['guest']
          },
          templateUrl: '/modules/data_dashboard/templates/application/edit_role.html',
          controller: 'EditRoleController',
          resolve: {
            role: ['$route', '$http', '$application', function($route, $http, $application) {
              return $http({
                method: 'GET',
                url: '/applications/' + $application.get('id') + '/roles/' + $route.current.params.roleId
              })
            }]
          }
        })
      .otherwise({
        redirectTo: '/'
      });
    }
  ]);

  module.exports = app;

})();