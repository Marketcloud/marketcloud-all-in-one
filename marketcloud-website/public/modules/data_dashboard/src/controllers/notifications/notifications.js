var app = angular.module('DataDashboard')
app.controller('NotificationsController', ['$scope', '$http', '$marketcloud', 'notifications',
  function (scope, http, $marketcloud, notifications) {
    scope.notifications = notifications.data.data

    scope.delete = function (notification, index) {
      $marketcloud.notifications.delete(notification.id)
				.then(function (response) {
  notie.alert(1, 'Notification deleted', 1.5)
  scope.notifications.splice(index, 1)
})
				.catch(function (error) {
  notie.alert(3, 'An error has occurred, please try again.', 1.5)
})
    }

    scope.toggleNotification = function (notification) {
      $marketcloud.notifications.update(notification.id, notification)
				.then(function (response) {
  notie.alert(1, 'Update successful', 1.5)
})
				.catch(function (error) {
  notie.alert(3, 'An error has occurred, please try again.', 1.5)
})
    }
  }
])
