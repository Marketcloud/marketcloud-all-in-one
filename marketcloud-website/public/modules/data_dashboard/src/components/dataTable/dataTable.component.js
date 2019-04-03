var app = angular.module('DataDashboard')

app.controller('McDataTableController', ['$scope',
  function (scope) {
    this.$onInit = function () {
      var ctrl = this
      scope.ctrl = ctrl

      scope.columns = ctrl.columns || Object.keys(scope.ctrl.data[0])
    }
  }
])

app
  .component('mcDataTable', {
  templateUrl: '/modules/data_dashboard/src/components/dataTable/dataTable.component.html',
  controller: 'McDataTableController',
  bindings: {
    data: '=',
    columns: '=?'
  }
})
