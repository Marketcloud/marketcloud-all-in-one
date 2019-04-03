(function() {
  'use strict';

  angular.module('DataDashboard')
    .factory('$validation', ValidationService);



  /*
   *   AngularJS Service that handles the pagination object
   *   
   */
  function ValidationService() {


    // Container object we will return
    var Service = {};


    Service.showErrorMessage = function(validation,schema,  selector) {

      Service.hideErrors();

      selector = selector || '[ng-model="'+validation.invalidPropertyName+'"]'

      if (0 === angular.element(selector).length) {
        console.log("COuld now match selector "+selector+" to show error message, exiting");
        return;
      }    

      var element = angular.element(selector);

      var errorMessage = Service.getErrorMessage(validation,schema);

      var parent = element.parent();

      if (parent.hasClass('input-group'))
        parent = parent.parent();

      parent.append('<div class="error-message">'+errorMessage+'</div>')
      parent.addClass("has-error")

      $('html, body').animate({
        scrollTop: element.offset().top - 200
      }, 500);
      
    }

    Service.getErrorMessage = function(validation, schema) {


      switch (validation.failedValidator) {
        case "required":
          return "This field is required";

        case "type":
          return "This field must be a "+schema[validation.invalidPropertyName].type;

        case "min":
          if ("number" === schema[validation.invalidPropertyName].type)
            return "Minimum value is "+schema[validation.invalidPropertyName].min;
          else if ("string" === schema[validation.invalidPropertyName].type)
            return "Minimum length is "+schema[validation.invalidPropertyName].min;
          else if ("array" === schema[validation.invalidPropertyName].type)
            return "Minimum number of elements is is "+schema[validation.invalidPropertyName].min;
          else
            return "Minimum is "+schema[validation.invalidPropertyName].min;

        case "max":
          if ("number" === schema[validation.invalidPropertyName].type)
            return "Maxiumum value is "+schema[validation.invalidPropertyName].max;
          else if ("string" === schema[validation.invalidPropertyName].type)
            return "Maxiumum length is "+schema[validation.invalidPropertyName].max;
          else if ("array" === schema[validation.invalidPropertyName].type)
            return "Maxiumum number of elements is is "+schema[validation.invalidPropertyName].max;
          else
            return "Maxiumum is "+schema[validation.invalidPropertyName].max;
        break;

        default :
          return "This field is invalid";
        break;
      }
    }


    Service.hideErrors = function(){
      angular.element('.error-message').remove()
      angular.element('.has-error').removeClass('has-error')
    }

    

    


    return Service;
  }
})();