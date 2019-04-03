(function() {
  'use strict';

  angular.module('DataDashboard')
    .factory('$pagination', PaginationFactory);



  /*
   *   AngularJS Factory that handles the pagination object
   *   
   */
  function PaginationFactory() {


    // Container object we will return
    var Factory = {};

  
    /*
     * @param {HTTPResponse} httpResponse The response object
     */
    Factory.fromHTTPResponse = function(httpResponse) {
      return {
        currentPage: httpResponse.data.page,
        numberOfPages: httpResponse.data.pages,
        nextPage: httpResponse.data._links.next || null,
        previousPage: httpResponse.data._links.prev || null,
        count: httpResponse.data.count
      }
    }



    return Factory;
  }
})();