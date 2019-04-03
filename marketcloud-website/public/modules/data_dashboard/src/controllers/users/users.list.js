var app = angular.module('DataDashboard')
app.controller('UsersController', ['$scope', '$marketcloud', 'users',
  function(scope, $marketcloud, resources) {
    scope.users = resources.data.data

    scope.pagination = {
      currentPage: resources.data.page,
      numberOfPages: resources.data.pages,
      nextPage: resources.data._links.next || null,
      previousPage: resources.data._links.prev || null,
      count: resources.data.count
    }

    scope.query = {
      per_page: 20
    }

    // Util
    scope.timestampToDate = function(t) {
      var a = new Date(t)
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      var str = a.getDate() + ' ' + months[a.getMonth()] + ' ' + a.getFullYear()
      return str
    }

    scope.loadPage = function(p) {
      scope.query.page = Number(p)
      return scope.loadData(scope.query)
    }

    scope.delete = function(user) {
      $marketcloud.users.delete(user.id)
        .then(function(response) {
          notie.alert(1, 'User deleted', 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again.', 1.5)
        })
    }

    scope.loadData = function(query) {
      if (!query) {
        query = scope.query
      }

      $marketcloud.users.list(query)
        .then(function(response) {
          scope.users = response.data.data

          scope.pagination = {
            currentPage: response.data.page,
            numberOfPages: response.data.pages,
            nextPage: response.data._links.next || null,
            previousPage: response.data._links.prev || null,
            count: response.data.count
          }
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again.', 1.5)
        })
    }
  }
])