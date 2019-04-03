var app = angular.module('DataDashboard')
app.controller('PreviewNotificationController',
  ['$scope', '$http', 'notification', '$location', '$marketcloud',
    function (scope, http, notification, $location, $marketcloud) {
      scope.notification = JSON.parse(notification)

      scope.sampleData = {}

      scope.sampleData['orders.update.completed'] = {}

      scope.sampleData['orders.update.processing'] = {}

      scope.sampleData['orders.created'] = {}

      scope.sampleData['users.created'] = {}
    }
  ])
