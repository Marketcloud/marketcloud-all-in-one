var app = angular.module('DataDashboard')

app.controller('BrandsController', ['$scope', '$marketcloud', 'brands',
  function (scope, $marketcloud, resources) {
    scope.brands = resources.data.data

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

    scope.loadPage = function (page_number) {
      return scope.loadData({page: page_number})
    }
    scope.loadData = function (query) {
      if (!query) {
        query = scope.query
      }

      $marketcloud.brands.list(query)
				.then(function (response) {
  scope.brands = response.data.data

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

    scope.deleteBrand = function (brand_id, index) {
      $marketcloud.brands.delete(brand_id)
				.then(function (response) {
  scope.loadData({
    page: scope.currentPage
  })
  notie.alert(1, 'Brand deleted', 1.5)
})
				.catch(function (response) {
  notie.alert(3, 'An error has occurred.Please try again.', 1.5)
})
    }
  }
])
