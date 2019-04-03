module.exports = function(app) {
app.controller('SwitchController', [
  '$scope', '$element', '$attrs',
  function (scope, $element, $attrs) {
    this.$onInit = function () {
      scope.ctrl = this

      scope.ctrl.value = this.value

      // Theme is success danger info primary warning default
      scope.ctrl.theme = $attrs.theme || 'info'

      scope.ctrl.align = $attrs.align || ''
    }

    $element.on('click', function () {
      if (scope.ctrl.readOnly === true) {
        return
      }

      scope.ctrl.value = !scope.ctrl.value

      // Params must be wrapped in an object
      // then when using the on-update attribute i can write
      // on-update="somfunc(params)"

      scope.$apply()

      scope.ctrl.onUpdate()
    })
  }
])
app
  .component('switch', {
    templateUrl: '/modules/admin_dashboard/src/components/switch/switch.component.html',
    controller: 'SwitchController',
    bindings: {
      value: '=',
      onUpdate: '&',
      class: '@',
      align: '@',
      readOnly: '@'
    }
  })
}