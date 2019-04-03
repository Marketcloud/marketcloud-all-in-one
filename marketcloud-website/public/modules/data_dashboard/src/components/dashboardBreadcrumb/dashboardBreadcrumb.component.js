var app = angular.module('DataDashboard')

app.controller('DashboardBreadcrumbController', ['$scope', '$element', '$attrs',
  function (scope, $element, $attrs) {
    scope.goBack = function () {
      history.back()
    }
  }
])


app
	.component('dashboardBreadcrumb', {
  template: '<a href="#" class="link pull-right"><i class="fa fa-long-arrow-left"></i> Back</a>',
  controller: 'DashboardBreadcrumbController',
  bindings: {
    resourceName: '='
  }
})
