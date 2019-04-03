
var app = angular.module('DataDashboard')
app.controller('ImageThumbnailController', ['$scope', '$element', '$attrs', function (scope, $element, $attrs) {
  this.$onInit = function () {
    scope.ctrl = this

    // Boolean flag to control display/hide of the overlay
    scope.ctrl.showOverlay = false
  }

  scope.edit = function () {
    scope.ctrl.onEdit()
    $element.find('#editImageModal').modal('show')
  }
  scope.delete = function () {
    scope.ctrl.onDelete()
  }

  scope.zoom = function () {
    $element.find('#zoomImageModal').modal('show')
  }

  scope.showOverlay = function () {
    scope.ctrl.showOverlay = true
  }
  scope.hideOverlay = function () {
    scope.ctrl.showOverlay = false
  }

  scope.toggleEditImageModal = function (image) {
    $element.find('#editImageModal').modal('hide')
  }
}])
app
.component('imageThumbnail', {
  templateUrl: '/modules/data_dashboard/src/components/imageThumbnail/imageThumbnail.component.html',
  controller: 'ImageThumbnailController',
  bindings: {
    imageSrc: '=',
    image: '=',
    onEdit: '&',
    onDelete: '&'
  }
})
