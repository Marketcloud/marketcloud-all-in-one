
angular
  .module('DataDashboard')
  .controller('ErrorMessagesController', ErrorMessagesController)
  .component('errorMessages', {
  templateUrl: '/modules/data_dashboard/src/components/errorMessages/errorMessages.component.html',
  controller: 'ErrorMessagesController',
  bindings: {
    validation: '<',
    propertyName: '@',
    modelName: '@',
    onError: '&',

    messageMin: '@',
    messageMax: '@',
    messageRequired: '@',
    messageType: '@'
  }
})

ErrorMessagesController.$inject = ['$scope', '$models']

function ErrorMessagesController (scope, Models) {
  if (!Models) { throw new Error('ErrorMessages Component requires Models factory. errorMessages.component.js') }

  var ctrl = null

  this.$onInit = function () {
    ctrl = this
    scope.ctrl = ctrl

    if (ctrl.modelName) {
      if (!Models.hasOwnProperty(ctrl.modelName)) {
        throw new Error('Cannot find model with name ' + ctrl.modelName)
      }


      ctrl.schema = angular.copy(Models[ctrl.modelName].schema)
      if (!ctrl.schema){
        console.log("Lo schema non ha il mio model "+ctrl.modelName, Models);
      }
    }
  }

  this.$onChanges = function(changes) {
    var validation = changes.validation.currentValue;

    if (validation.invalidPropertyName === this.propertyName)
        $('html, body').animate({
          scrollTop: $("[property-name='"+validation.invalidPropertyName+"']").offset().top - 200
        }, 500);


  }





}
