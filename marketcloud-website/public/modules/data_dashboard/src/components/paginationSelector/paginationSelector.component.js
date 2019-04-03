var app = angular.module('DataDashboard')
app.controller('PaginationSelectorController', ['$scope',
  function(scope) {

    var ctrl = this;

    this.$onInit = function() {

      scope.ctrl = this;
      scope.ctrl.perPage = this.perPage || this.config.defaultPageSize
      scope.ctrl.page = this.page || this.config.defaultPageNumber

      this.updatePageCounters();

    }

    // If the parent controller's pagination changes
    // we have to update our reference
    this.$onChanges = function(changes) {

      // Whenever the parent controller refreshes data updating the query
      // we must update our reference to pagination
      if (changes.pagination) {
        ctrl.pagination = changes.pagination.currentValue;

        // We have to be sure that scope is already there
        if (scope && scope.ctrl){
          ctrl.updatePageCounters();
        }
      }
    }

  

   this.updatePageCounters = function() {
      scope.pages = [];
      for (var i = 1; i <= this.pagination.numberOfPages; i++) {
        scope.pages.push(i);
      }

      // We find the positions of the first and the last displayed item
      scope.first = (scope.ctrl.page -1) * scope.ctrl.perPage + 1;
      scope.last = ((scope.ctrl.page) * scope.ctrl.perPage) -1 ;

      // If there are less items than the perPage value, we adjust the "last" value
      if (scope.last > scope.ctrl.pagination.count) {
        scope.last = scope.ctrl.pagination.count;
      }
    }

    this.config = {
      availablePageSizes: [10, 20, 50, 100],
      defaultPageSize: 20,
      defaultPageNumber: 1
    }



    // this function triggers the callback specified as onChangePageSize
    scope.setPageSize = function(pageSize) {

      var newSize = scope.ctrl.perPage;

      if (pageSize)
        newSize = pageSize;


      scope.ctrl.onChangePageSize({
        per_page: newSize
      })
      .then( function(){
        ctrl.updatePageCounters();
      })

    }

    scope.setPageNumber = function(pageNumber) {

      if (pageNumber <= 0){
        console.info("Cannot set page <= 0. Ignoring setPageNumber() call.")
        return;
      }


      if (pageNumber > scope.ctrl.pagination.numberOfPages ){
        console.info("Cannot set page > pagination.numberOfPages. Ignoring setPageNumber() call.")
        return;
      }


      scope.ctrl.onChangePageNumber({
        page: pageNumber
      })
      .then( function(){
        ctrl.updatePageCounters();
      })
    }


  }
])
app
  .component('paginationSelector', {
    templateUrl: '/modules/data_dashboard/src/components/paginationSelector/paginationSelector.component.html',
    controller: 'PaginationSelectorController',
    bindings: {
      perPage: '=',
      page: '=',
      pagination: '<', // We don't need to modify this, we just use it to listen for changes and read data
      onChangePageSize: '&',
      onChangePageNumber: '&'

    }
  })