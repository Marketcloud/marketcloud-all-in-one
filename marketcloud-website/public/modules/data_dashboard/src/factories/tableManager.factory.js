(function() {
  'use strict';
  
  angular.module('DataDashboard')
    .factory('TableManager',TableManagerFactory);

  TableManagerFactory.$inject = [];


  /*
  *   AngularJS Factory that handles the configuration
  *   of data tables
  */
  function TableManagerFactory() {

    
    var factory = {};

   
    // This is to avoid to overflow controllers with shared functionality
    function attachTableManagerFunctions(scope){

      if (!scope.hasOwnProperty("visibleColumns")){
        scope.visibleColumns = [];
      }



    }

    return factory;
  }




})();