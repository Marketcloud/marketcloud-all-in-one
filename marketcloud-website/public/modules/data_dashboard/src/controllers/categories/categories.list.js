var app = angular.module('DataDashboard')

app.controller('CategoriesController', ['$scope', 'categories', '$q', '$marketcloud',
  function (scope, resources, $q, $marketcloud) {
    scope.categories = resources.data.data

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

    scope.toggleAll = function () {
      scope.categories.forEach(function (p) {
        p.selected = scope.selectAll
      })
    }

    scope.getSelectedItems = function () {
      return scope.categories.filter(function (p) {
        return p.selected === true
      })
    }

    scope.bulkDelete = function () {
      notie.confirm('Delete ' + scope.getSelectedItems().length + ' items?', 'Delete', 'Cancel', function () {
        var defer = $q.defer()

        var promises = []

        scope.getSelectedItems().forEach(function (category) {
          promises.push($marketcloud.categories.delete(category.id))
        })

        $q.all(promises)
						.then(function () {
  notie.alert(1, 'All items have been deleted', 1.5)
  scope.loadPage(scope.currentPage)
})

        return defer.promise
      })
    }

    scope.loadPage = function (page_number) {
      scope.query.page = page_number
      return scope.loadData()
    }
    scope.loadData = function (query) {
      if (!query) {
        query = scope.query
      }

      $marketcloud.categories.list(query)
					.then(function (response) {
  scope.categories = response.data.data

  scope.pagination = {
    currentPage: response.data.page,
    numberOfPages: response.data.pages,
    nextPage: response.data._links.next || null,
    previousPage: response.data._links.prev || null,
    count: response.data.count
  }
})
					.catch(function (response) {
  notie.alert(3, 'An error has occurred. Please try again.', 1.5)
})
    }

    scope.deleteCategory = function (category_id, index) {
      $marketcloud.categories.delete(category_id)
					.then(function (response) {
  scope.loadData({
    page: 1
  })
  notie.alert(1, 'Category deleted', 1.5)
})
					.catch(function (response) {
  notie.alert(3, 'An error has occurred.Please try again.', 1.5)
})
    }
  }
])
