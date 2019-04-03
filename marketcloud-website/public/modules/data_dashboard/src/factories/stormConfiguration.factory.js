(function() {
  'use strict';
  
  angular.module('DataDashboard')
    .factory('StormConfiguration',StormConfigurationFactory);

  StormConfigurationFactory.$inject = ['$window', '$application'];


  /*
  *   AngularJS Factory that handles writes and reads from
  *   localStorage (or similar backend) for managing Storm user preferences.
  *
  *   For example it can be used to save default filters on a certain view
  * 
  *   It can also be used to save some custom behaviour.
  *
  *   The main feature should be that it wraps all the configs in a json object
  *   which gets written to storage and read every time as a whole.
  */
  function StormConfigurationFactory($window, $application) {

    
    var Factory = {};

    console.info("Loading Storm configuration information from localStorage");

   
    var LOCALSTORAGE_KEY = 'Marketcloud.Storm.Configuration.' + ($application.get('id') || "unkownAppId");
 

    function loadFromStorage() {
      var storedJson = window.localStorage.getItem(LOCALSTORAGE_KEY);
      if (storedJson)
        Factory._data = JSON.parse(storedJson);
      else
        Factory._data = {};
    }

    function persistToStorage(){
      var s = JSON.stringify(Factory._data);
      console.log("Persisting to storage with key "+LOCALSTORAGE_KEY,s )
      window.localStorage.setItem(LOCALSTORAGE_KEY,s);
    }

    Factory._data = {};

    Factory.loadFromStorage = loadFromStorage;
    Factory.persistToStorage = persistToStorage;

    Factory.loadFromStorage();

    Factory.get = function(key) {

      if ("undefined" !== typeof key)
        return this._data[key];
      else
        return this._data;
    }

    Factory.set = function(key,value, persist){

      persist = persist || true;


      if ("string" !== typeof key)
        throw new Error("StormConfigurationFactory.set(key,value) 'key' must be String");
      

      this._data[key] = value;

      if (persist === true)
        Factory.persistToStorage()
      
    }


    Factory.applyTheme = function(theme){

      // Checking
       if (!theme)
        return;

      // Sanitizing the theme filename
      if (theme.indexOf('.theme.css') === -1) {
        theme = theme + '.theme.css';
      }

      var url = '/modules/data_dashboard/css/themes/'+theme;

      // Removing previously loaded themes
      $(".storm-theme-definition").remove();

      // Appending the theme to the Document
      $('<link rel="stylesheet" class="storm-theme-definition" type="text/css" href="'+url+'" >')
      .appendTo("head");

    }
  


    

    return Factory;
  }
})();