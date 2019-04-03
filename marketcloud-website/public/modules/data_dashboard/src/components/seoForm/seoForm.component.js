
var app = angular.module('DataDashboard')
app.controller('SEOFormController', ['$scope', '$element', '$attrs', function (scope, $element, $attrs) {
  this.$onInit = function () {
    scope.ctrl = this

    // The SEO object holds all SEO related data
    scope.ctrl.seo = this.seo

    // The active tab key
    scope.activeSeoTab = 'meta'
  }

  scope.showSeoTab = function (tabname) {
    scope.activeSeoTab = tabname
  }
}])
app
.component('seoForm', {
  templateUrl: '/modules/data_dashboard/src/components/seoForm/seoForm.component.html',
  controller: 'SEOFormController',
  bindings: {
    seo: '=',
    removeCardFrame: '@?'
  }
})
