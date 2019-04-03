'use strict'

angular
  .module('DataDashboard')
  .controller('TaxesSelectorController', TaxesSelectorController)
  .component('taxesSelector', {
  templateUrl: '/modules/data_dashboard/src/components/taxesSelector/taxesSelector.component.html',
  controller: 'TaxesSelectorController',
  bindings: {
    tax: '=',
    onError: '&',
    onChange: '&'
  }
})

TaxesSelectorController.$inject = ['$marketcloud', '$scope']

function TaxesSelectorController ($marketcloud, scope) {
  this.$onInit = function () {
    scope.ctrl = this
  }

  $marketcloud.taxes.list()
    .then(function (response) {
  scope.ctrl.taxes = response.data.data
})
    .catch(function (response) {
  scope.ctrl.onError(response)
})
}
