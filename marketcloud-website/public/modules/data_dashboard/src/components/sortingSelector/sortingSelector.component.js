var app = angular.module('DataDashboard');


app.controller('sortingSelectorController', 
  [
  '$scope',
  function(scope) {

    var ctrl = this;

    this.$onInit = function() {
      scope.ctrl = this;
      scope.ctrl.query = this.query || {};

      
      if (!scope.ctrl.query.sort_by)
        scope.ctrl.query.sort_by = 'id';
      if (!scope.ctrl.query.sort_order)
        scope.ctrl.query.sort_order = 'DESC';

      scope.ctrl.resourceAttributes = this.resourceAttributes || [];
    }


    scope.applySorting = function(){
      console.log("sortingSelector.applySorting",{
        sort_by : scope.ctrl.query.sort_by,
        sort_order: scope.ctrl.query.sort_order
      })
      scope.ctrl.onUpdate({
        sort_by : scope.ctrl.query.sort_by,
        sort_order: scope.ctrl.query.sort_order
      })

      $("#sortingModal").modal('hide');

    }


  }
])

app
  .component('sortingSelector', {
    templateUrl: '/modules/data_dashboard/src/components/sortingSelector/sortingSelector.component.html',
    controller: 'sortingSelectorController',
    bindings: {
      query: '=',
      resourceAttributes: '=',
      onUpdate : '&'
    }
  })