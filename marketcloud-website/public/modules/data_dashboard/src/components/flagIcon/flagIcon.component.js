var app = angular.module('DataDashboard')

app.controller('FlagIconController', ['$scope', 'Countries',
  function(scope, countries) {
    var ctrl = this;

    this.$onInit = function() {
      var countryObject = countries.find(function(item) {
        return item.name.toLowerCase() === ctrl.country.toLowerCase();
      })

      if (!countryObject)
        ctrl.countryCode = ctrl.country;
      else
        ctrl.countryCode = countryObject.code;
    }

    scope.getFlagClassName = function() {
      return 'flag-icon-' + ctrl.countryCode.toLowerCase()
    }
  }
])

app
  .component('flagIcon', {
    template: '<span class="flag-icon" ng-class="getFlagClassName()"></span>',
    controller: 'FlagIconController',
    bindings: {
      country: '@'
    }
  })