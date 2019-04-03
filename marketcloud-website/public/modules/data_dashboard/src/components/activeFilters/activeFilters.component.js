var app = angular.module('DataDashboard')
app.controller('ActiveFiltersController', [
  '$scope',
  'StormConfiguration',
  function(scope, StormConfiguration) {

    var ctrl = this;

    



    scope.newFilter = {
      name: '',
      value: null
    }

    var notFilters = [
      'per_page',
      'page',
      'sort_by',
      'sort_order'
    ]
    

    this.$onInit = function() {


      scope.ctrl = this;

      scope.ctrl.query = this.query || {};

      // An array of attributes name from the parent controller
      scope.filterAttributes = this.filterAttributes;


      // Initializing filters
      scope.filters = StormConfiguration.get('products_list_active_filters') || []




      for (var k in ctrl.query) {
        if (notFilters.indexOf(k) === -1) {
          scope.filters.push({
            name: k,
            value: ctrl.query[k]
          })
        }
      }

      scope.persistFilters = StormConfiguration.get('products_list_persist_filters') || false;
      scope.persistFilters = Boolean(scope.persistFilter);
      


    }


    /*
     *  This function returns the guessed type for a property found in products
     *
     *  @param {String} Product key name to test
     *
     *  @return {String} THe name of the guessed type for the specified key
     */
    var inferFilterType = function(key) {
      if (typeof scope.ctrl.resources === 'undefined') {
        return null
      }

      var _resource = scope.ctrl.resources.find(function(item) {
          return item.hasOwnProperty(key)
        })
        // Key is the property name we should analyze on the model

      if (_resource) {
        return typeof _resource[key]
      } else {
        return null
      }
    }

    scope.isFilterSet = function(key) {
      return scope.filters
        .filter(function(filter) {
          return filter.name === key
        }).length > 0
    }

    /*
     *  Filters out empty filters. Means that we will not show filters that are half created.
     */
    scope.filterIsNotEmpty = function(item, index, array) {
      return item.name !== '' && item.value !== null
    }

    /*
     *    View function that selects which control to show for this particular filter
     *
     *  @return {String} A string label identifying the type of input
     */
    scope.getControlForFilter = function(filter) {

      
      if (filter.name === 'type') {
        return 'productTypeSelector'
      }

      if (filter.name === 'category_id') {
        return 'categorySelectorInput'
      }

      if (filter.name === 'brand_id') {
        return 'brandSelectorInput'
      }

      if (inferFilterType(filter.name) === 'number') {
        return 'numberInput'
      }

      if (inferFilterType(filter.name) === 'string') {
        return 'textInput'
      }

      if (inferFilterType(filter.name) === 'boolean') {
        return 'booleanInput'
      }

      // else

      return 'disabledInput'
    }

    /*
     *  Adds an empty filter
     */
    scope.addFilter = function(filter) {
      if (!filter)
        scope.filters.push({
          name: '',
          value: null
        })
      else
        scope.filters.push(filter);
    }

    scope.saveNewFilterAndApply = function() {
      scope.addFilter(scope.newFilter);
      console.log("Saving this new filters",scope.newFilter);
      scope.applyFilters();
      scope.newFilter = {
        name: '',
        value: null
      }
      $('#singleFilterModal').modal('hide');
    }

    scope.humanReadableFilterValue = function(filter) {

      if ('object' === typeof filter.value) {
        if (filter.value.hasOwnProperty('$regex')) {
          return filter.value.$regex;
        }

      }

      if ('type' === filter.name) {
        return filter.value.replace(/\_/g, " ");
      }

      // If we don't know how to handle it:
      return filter.value;
    }

    /*
     *  @param {Number} index The position of the filter to remove
     *  @param {Boolean} applyToQuery Wether to call applyFilters() or not
     */
    scope.removeFilter = function(index, applyToQuery) {
      if (typeof applyToQuery === 'undefined') {
        applyToQuery = true
      }

      var filterToRemove = scope.filters.splice(index, 1)

      filterToRemove = filterToRemove[0]

      delete scope.ctrl.query[filterToRemove.name]

      if (applyToQuery === true) {
        scope.applyFilters()
      }
    }

    scope.applyFilters = function() {
      scope.filters.forEach(function(filter) {
        scope.ctrl.query[filter.name] = filter.value
      })

      ctrl.onUpdate({
        filters : scope.filters
      })
      $('#filtersModal').modal('hide')

      //if (scope.persistFilters === true)
      StormConfiguration.set('products_list_active_filters', scope.filters)
    }


  }
])
app
  .component('activeFilters', {
    templateUrl: '/modules/data_dashboard/src/components/activeFilters/activeFilters.component.html',
    controller: 'ActiveFiltersController',
    bindings: {
      query: '=', // We need access to the controller's query
      filterAttributes: '=', // We need a list of property names to be sued as filters
      onUpdate: '&', // THis will notify the controller that filters changed
      resources: '=' // We need the list of resources to be able to infer which filters to display
    }
  })