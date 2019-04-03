(function() {
    'use strict';

    angular.module('DataDashboard')
      .factory('$cache', [CacheFactory]);



        /*
         *   AngularJS Factory that handles writes and reads
         *   for the account object.
         *
         *   This avoids the use of the window object;
         *   
         */
        function CacheFactory() {


          // Container object we will return
          var Factory = {};

          // This holds the account data
          //Factory.data = window.user
          Factory.data = {};


         Factory.set = function(key, value) {
          this.data[key] = value;
         }

         Factory.get = function(key) {
          return this.data[key];
         }

         Factory.del = function(key) {
          delete this.data[key];
         }

         /*
         *  @param {String} pattern

         *  Deletes all keys matching pattern
         */
         Factory.delByPattern = function(pattern) {
          for(var k in this.data) {
            if (k.indexOf(pattern) > -1){
              console.info("Deleting cache for "+k);
              delete this.data[k];
            }
          }
         }

         Factory.has = function(key) {
          return this.data.hasOwnProperty(key);
         }



          return Factory;
        }
      })();