var app = angular.module('DataDashboard');


app.controller('ToolbarSearchController', 
  [
  '$scope',
  function(scope) {

    var ctrl = this;
    scope.searchWord = '';

    this.$onInit = function() {
      scope.ctrl = this;
      
      scope.ctrl.query = {}

      if (!this.propertyName)
        this.propertyName = "name";

      scope.ctrl.query[ctrl.propertyName] = {
        $options : 'i',
        $regex : ''
      };
      
    }


    scope.onQueryChange = function(){

      scope.ctrl.query[ctrl.propertyName]["$regex"] = scope.searchWord
      return scope.ctrl.onUpdate({
        query : scope.ctrl.query
      })
    }



  }
])

app
  .component('toolbarSearch', {
    templateUrl: '/modules/data_dashboard/src/components/toolbarSearch/toolbarSearch.component.html',
    controller: 'ToolbarSearchController',
    bindings: {
      onUpdate : '&',
      propertyName : '@'
    }
  })