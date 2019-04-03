(function() {
  'use strict';

  angular.module('DataDashboard')
    .factory('$application', ApplicationFactory);



  /*
   *   AngularJS Factory that handles writes and reads
   *   for the application object.
   *
   *   This avoids the use of the window object;
   *   
   */
  function ApplicationFactory() {

    // Container object we will return
    var Factory = {
      data : {}
    };

    /*// This holds the application data
    Factory.data = {};
*/

    /*
     * @param {string} key The name of the property to get
     */
    Factory.get = function(key) {
      if (key)
        return Factory.data[key];
      else
        return Factory.data;
    }


    /*
     * @param {String} key The name of the property to set
     * @param {Mixed} value The value of the property to set
     */
    Factory.set = function(key, value) {
      
      if ("string" === typeof key && !!value) {
        Factory.data[key] = value;
      }

      if ("object" === typeof key && !value) {
        Factory.data = key;
      }
    }


    /*
     * @return {Array<String>} Returns an array of locale codes.
     */
    Factory.getAvailableLocaleCodes = function() {

      if (!Factory.data.locales) {
        return [];
      }

      return Factory.data.locales.split(",")
        .filter(function(localeCode) {
          // When splitting an empty string, we get [""]
          return localeCode !== "";
        })
    }

    return Factory;
  }
})();