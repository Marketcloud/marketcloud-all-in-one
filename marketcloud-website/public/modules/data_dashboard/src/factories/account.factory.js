(function() {
    'use strict';

    angular.module('DataDashboard')
      .factory('$account', ['$http','$q', AccountFactory]);



        /*
         *   AngularJS Factory that handles writes and reads
         *   for the account object.
         *
         *   This avoids the use of the window object;
         *   
         */
        function AccountFactory($http, $q) {


          // Container object we will return
          var Factory = {};

          // This holds the account data
          //Factory.data = window.user
          Factory.data = {};


          /*
           *  @param {string} key The name of the property to get
           *  @return {Promise} Promised response
           */
          /*Factory.get = function() {
            if (null === Factory.data) {
              return $http({
                method: 'GET',
                url: '/account/get',
              })
              .then(function(response){
                Factory.data = response.data.data;
                return $q.when({data : Factory.data});
              })
            } else {
              return $q.when({data : Factory.data});
            }
          }*/


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



          return Factory;
        }
      })();