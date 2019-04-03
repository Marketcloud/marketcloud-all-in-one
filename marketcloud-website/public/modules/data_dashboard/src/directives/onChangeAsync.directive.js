angular.module('DataDashboard').directive('onChangeAsync', function($timeout) {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attr, ctrl) {
      ctrl.$viewChangeListeners.push(function() {
        $timeout(function() {
          scope.$eval(attr.onChangeAsync);
        });
      });
    }
  };
});