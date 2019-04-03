
var app = angular.module('DataDashboard')

app.controller('BackButtonController',
  ['$scope', '$element', '$attrs',
    function (scope, $element, $attrs) {
      scope.goBack = function () {
        history.back()
      }
    }])

app
.component('backButton', {
  template: '<a class="link pull-right" ng-click="goBack()"><i class="fa fa-long-arrow-left"></i> <span class="xs-hidden">Back</span></a>',
  controller: 'BackButtonController',
  bindings: {}
})
