var app = angular.module('DataDashboard')
app.controller('VariablesController', ['$scope', '$http', 'variables', '$marketcloud',
  function(scope, http, resources, $marketcloud) {
    // Pagination
    scope.pagination = {
      currentPage: resources.data.page,
      numberOfPages: resources.data.pages,
      nextPage: resources.data._links.next || null,
      previousPage: resources.data._links.prev || null,
      count: resources.data.count
    }

    // Query
    scope.query = {
      per_page: 20
    }

    // Initial data resolved from the router
    scope.variables = resources.data.data

    scope.loadPage = function(p) {
      return scope.loadData({
        page: p
      })
    }
    scope.loadData = function(query) {
      if (!query) {
        query = scope.query
      }

      $marketcloud.variables.list(query)
        .then(function(response) {
          scope.variables = response.data.data

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
    scope.setPublishing = function(variable) {

      $marketcloud.variables.update(variable.id, {
          published: variable.published
        })
        .then(function(response) {
          notie.alert(1, 'Updated!', 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred, please try again.', 1.5)
        })
    }

    scope.deleteVariable = function(variable_id, index) {
      $marketcloud.variables.delete(variable_id)
        .then(function(response) {
          scope.loadData({
            page: 1
          })
          notie.alert(1, 'Variable deleted', 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred.Please try again.', 1.5)
        })
    }
  }
])