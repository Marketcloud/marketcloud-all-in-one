var app = angular.module('DataDashboard')
app.controller('autocompleteController', [
  '$scope', '$element', '$attrs',
  function(scope, $element, $attrs) {
    // Since angular 1.6 component initialization must be inside the $onInit call
    // to allow the use of ES6 classes as component controllers
    this.$onInit = function() {
      scope.ctrl = this


      // The list of values
      scope.ctrl.suggestionList = angular.copy(scope.ctrl.items)

      // Flag to toggle the suggestion list
      scope.showTheList = false;



      // Here ww handle the initial selection if the model already has a value
      var initiallySelected = scope.ctrl.suggestionList.filter(function(item) {
        if (item === scope.ctrl.myModel)
          return true;
        if (item[scope.ctrl.value] === scope.ctrl.myModel)
          return true

        return false;
      })

      if (initiallySelected.length > 0) {

        scope.selectItem(initiallySelected[0])
      }


    }

    /*
     * Filters the suggestion list by query. This updates the suggestion list showing
     * only those results that are matching the query.
     */
    scope.filter = function() {

      var toMatch = scope.ctrl.selectedLabel.toLowerCase();

      scope.ctrl.items = scope.ctrl.suggestionList
        .filter(function(i) {


          // If the value attribute is provided we use it to look for a particular property
          if (scope.ctrl.value) {

            return i[scope.ctrl.value].toLowerCase().indexOf(toMatch) > -1

          } else {

            return i.toLowerCase().indexOf(toMatch) > -1

          }
        })
    }

    /*
     * Makes the suggestion list visible
     */
    scope.showList = function() {
      scope.showTheList = true
    }

    /*
     * Makes the suggestion list invisible
     */
    scope.hideList = function() {
      window.setTimeout(function() {
        scope.showTheList = false
        scope.$apply()
      }, 200)
    }

    scope.handleNewItems = function() {
      if (scope.ctrl.allowNewElements) {

        scope.ctrl.myModel = scope.ctrl.selectedLabel;
        scope.hideList();
      }
    }

    /**
     * Selects the clicked item as a chosen value
     */
    scope.selectItem = function(item) {

      console.log("selectItem called on ", item);

      // If the component has a label attribute, we want to show that label
      // insteand of the actually chosen value
      if (scope.ctrl.label) {
        scope.ctrl.selectedLabel = item[scope.ctrl.label];
      } else {
        // Otherwise we want to select the actual value.
        scope.ctrl.selectedLabel = item;
      }


      if (scope.ctrl.value) {
        scope.ctrl.myModel = item[scope.ctrl.value]
      } else {
        scope.ctrl.myModel = item
      }

      // update the query to reflect the model value
      // scope.ctrl.myModel = scope.ctrl.myModel;

      // After the choice, we hide the list
      scope.showTheList = false

      // Fucking AngularJS ng-changes triggers before the update cycle is complete
      window.setTimeout(scope.ctrl.onSelected, 1)
    }
  }
])
app
  .component('autocomplete', {
    templateUrl: '/modules/data_dashboard/src/components/autocomplete/autocomplete.component.html',
    controller: 'autocompleteController',
    bindings: {
      allowNewElements: '@',
      myModel: '=', // The model
      items: '=', // The source for autocomplete suggestions
      onSelected: '&', // Hook called when an item is selected
      label: '@', // The property to use as a label for suggestions,
      value: '@', // The property to use as a value for suggestions,
      inputClasses: '@' // Classes to add to the input
    }
  })