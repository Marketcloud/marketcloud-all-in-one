

function ImagesCardController(scope) {
  var ctrl = null

  this.$onInit = function() {
    ctrl = this
    scope.ctrl = ctrl

  }

  scope.swapArrayItemPosition = function moveItem(fromIndex, toIndex, target) {
    var toMove = JSON.parse(JSON.stringify(target[fromIndex]));

    // We ensure that the indexes exist
    if (fromIndex > target.length - 1)
      return;

    // First we remove the element to move
    target.splice(fromIndex, 1);

    // Then we add it to the desired position
    target.splice(toIndex, 0, toMove);

  }

  scope.removeImage = function(i) {
    var removed = scope.ctrl.items.splice(i, 1);
    scope.ctrl.onRemove(removed[0]);
  };
}

ImagesCardController.$inject = ['$scope']

angular
  .module('DataDashboard')
  .controller('ImagesCardController', ImagesCardController)
  .component('imagesCard', {
    templateUrl: '/modules/data_dashboard/src/components/imagesCard/imagesCard.component.html',
    controller: 'ImagesCardController',
    bindings: {
      items: '=',
      onRemove: '&',
      removeCardFrame: '@?'
    }
  })