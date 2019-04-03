module.exports = function(app) {

  var ApplicationController = ['$scope',function(scope){
    
    

    /*
    * Due to https://github.com/angular/angular.js/commit/bcd0d4d896d0dfdd988ff4f849c1d40366125858
    *
    * From AngularJS >= 1.6.x pre-assigning bindings on controller instances is disabled by default.
    */
    this.$onInit = function() {
      scope.application = this.applicationData;
    }

    scope.percentage = function(app) {
        var v = app.api_calls_quota_left;
        var t = app.api_calls_quota_max;
        return (v/t)*100
      }
  
  }]

  app.component('application',{
    templateUrl : '/modules/admin_dashboard/src/components/application/application.component.html',
    controller : ApplicationController,
    bindings : {
      applicationData : '='
    }
  });

}