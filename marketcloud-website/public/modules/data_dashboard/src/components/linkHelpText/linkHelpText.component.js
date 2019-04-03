
var app = angular.module('DataDashboard')
app.controller('LinkHelpTextController', ['$scope', '$element', '$attrs', function (scope, $element, $attrs) {
  this.$onInit = function () {
    scope.ctrl = this

    // The text to display
    scope.ctrl.text = this.text

    // The label to display
    scope.ctrl.label = this.label

    scope.showHelpText = false
  }

  scope.toggleHelpText = function () {
    scope.showHelpText = !scope.showHelpText
  }
}])
app
.component('linkHelpText', {
  templateUrl: '/modules/data_dashboard/src/components/linkHelpText/linkHelpText.component.html',
  controller: 'LinkHelpTextController',
  bindings: {
    text: '@',
    label: '@'
  }
})
