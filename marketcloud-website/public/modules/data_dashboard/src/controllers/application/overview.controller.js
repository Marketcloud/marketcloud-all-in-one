var app = angular.module('DataDashboard')

app.controller('ApplicationOverviewController', ['$scope', '$http', '$application', '$rootScope',
  function (scope, http, $application, rootScope) {
    scope.activities = []

    // Not loading activities as a route resolve
    // this is because the http method is still quite slow.
    // so we load it after showing the view.
    http({
      url : '/applications/'+$application.get("id") +'/activity',
      method : 'GET'
    })
    .then( function(response) {
      scope.activities = response.data.data;
    })

    var application = $application.get()
    scope.application = application

        // TODO grab statistical information

    rootScope.currentSection = 'application.overview'

    function getNextMonth (date) {
      var next_month = new Date(date)
      next_month.setMonth(date.getMonth() + 1)
      return next_month
    }

    scope.kilobytesToGigabytes = function (kb) {
      return (kb / 1024) / 1024
    }

    scope.application.renew_date
    scope.getMethodCSSClass = function (a) {
      var cls = null
      switch (a.method) {
        case 'GET':
          cls = 'label-success'
          break
        case 'POST':
          cls = 'label-info'
          break
        case 'PUT':
          cls = 'label-warning'
          break
        case 'PATCH':
          cls = 'label-warning'
          break
        case 'DELETE':
          cls = 'label-danger'
          break
        default:
          cls = 'label-success'
          break

      }
      return cls
    }
  }
])
