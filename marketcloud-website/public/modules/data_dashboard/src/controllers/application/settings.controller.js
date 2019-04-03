var app = angular.module('DataDashboard')

app.factory('BillingPlans', function () {
  var BILLING_PLANS = {
    'free': {
      name: 'free',
      id: 'free',
      price_monthly: 0,
      price_yearly: 0,
      api_calls_quota_max: '5000',
      storage: 0.5
    },
    'month-19': {
      name: 'cumulus',
      id: 'month-19',
      price_monthly: 19,
      price_yearly: 190,
      api_calls_quota_max: '100000',
      storage: 1
    },
    'month-49': {
      name: 'stratus',
      id: 'month-49',
      price_monthly: 49,
      price_yearly: 490,
      api_calls_quota_max: '450000',
      storage: 2
    },
    'month-99': {
      name: 'nimbo stratus',
      id: 'month-99',
      price_monthly: 99,
      price_yearly: 990,
      api_calls_quota_max: '1500000',
      storage: 5
    }
  }
  return BILLING_PLANS
})

app.controller('ApplicationSettingsController', ['$scope', '$application', '$http', '$location', '$rootScope', 'BillingPlans',
  function (scope, $application, $http, $location, rootScope, BillingPlans) {
    var application = $application.get()
    scope.application = application

    rootScope.currentSection = 'application.settings'

    scope.plans = BillingPlans

    scope.currentPlan = null

    for (var k in BillingPlans) {
      if (scope.application.plan_name === BillingPlans[k].name) {
        scope.currentPlan = BillingPlans[k]
      }
    }

    scope.updateApplication = function () {
      var update = {
        url: scope.application.url,
        name: scope.application.name
      }

      $http
                .put('/applications/' + scope.application.id, update)
                .then(function (response) {
                  notie.alert(1, 'The application has been updated.', 1.5)
                })
                .catch(function (error) {
                  notie.alert(3, 'An error has occurred. Please try again.', 1.5)
                })
    }

    scope.deleteApplication = function () {
      notie.confirm('Do you really want to delete the application? It is not reversible!', 'Confirm', 'Cancel', function () {
        $http
                    .delete('/applications/' + scope.application.id)
                    .then(function (response) {
                      notie.alert(1, 'The application has been deleted.', 1.5)
                      $location.path('/')
                    })
                    .catch(function (response) {
                      notie.alert(3, 'An error has occurred, please try again.', 1.5)
                    })
      })
    }

    scope.regenerateKeys = function () {
      notie.confirm('Do you really want to update the application\'s keys?', 'Confirm', 'Cancel', function () {
        $http
                    .put('/applications/' + scope.application.id + '/regenerateKeys')
                    .then(function (response) {
                      scope.application.public_key = response.data.data.public_key
                      scope.application.secret_key = response.data.data.secret_key
                      notie.alert(1, 'Keys regenerated correctly.', 1.5)
                    })
                    .catch(function (response) {
                      notie.alert(3, 'An error has occurred. Please retry', 1.5)
                    })
      })
    }
  }
])
