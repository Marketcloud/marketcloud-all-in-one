var app = angular.module('DataDashboard')
app.controller('PaginationNavController', ['$scope', '$element', '$attrs', '$marketcloud',
  function(scope, $element, $attrs, $marketcloud) {
    this.$onInit = function() {
      scope.ctrl = this
    }

    scope.loadPage = function(page_number) {
      scope.ctrl.onChangePage({
        page: page_number
      })
    }

    scope.getListOfPages = function() {
      var np = scope.ctrl.pagination.numberOfPages;
      var cp = scope.ctrl.pagination.currentPage

      var arr = []
      var initialPage = cp - 2
      if (initialPage <= 0) {
        initialPage = 1
      }
      var lastPage = cp + 2
      if (lastPage > np) {
        lastPage = np
      }

      for (var i = initialPage; i < lastPage; i++) {
        arr.push(i)
      }

      return arr
    }
  }
])
app
  .component('paginationNav', {
    templateUrl: '/modules/data_dashboard/src/components/paginationNav/paginationNav.component.html',
    controller: 'PaginationNavController',
    bindings: {
      pagination: '=',
      onChangePage: '&'

    }
  })