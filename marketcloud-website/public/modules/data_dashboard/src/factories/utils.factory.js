(function() {
  'use strict';

  angular.module('DataDashboard')
    .factory('$utils', UtilsFactory);



  /*
   *   AngularJS Factory that handles the pagination object
   *   
   */
  function UtilsFactory() {


    // Container object we will return
    var Factory = {};



    var flatten = function(data) {
      var result = {};

      function recurse(cur, prop) {
        if (Object(cur) !== cur) {
          result[prop] = cur;
        } else if (Array.isArray(cur)) {
          for (var i = 0, l = cur.length; i < l; i++)
            recurse(cur[i], prop + "[" + i + "]");
          if (l === 0)
            result[prop] = [];
        } else {
          var isEmpty = true;
          for (var p in cur) {
            isEmpty = false;
            recurse(cur[p], prop ? prop + "." + p : p);
          }
          if (isEmpty && prop)
            result[prop] = {};
        }
      }
      recurse(data, "");
      return result;
    }

    var unflatten = function(data) {
      "use strict";
      if (Object(data) !== data || Array.isArray(data)) return data;
      var regex = /\,?([^.\[\]]+)|\[(\d+)\]/g,
        resultholder = {};
      for (var p in data) {
        var cur = resultholder,
          prop = "",
          m;
        while (m = regex.exec(p)) {
          cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
          prop = m[2] || m[1];
        }
        cur[prop] = data[p];
      }
      return resultholder[""] || resultholder;
    }

    Factory.flatten = flatten;
    Factory.unflatten = unflatten;



    /*
     * @param {String} str The input string
     * @return {String} The slug--ified version of the string
     */
    Factory.getSlugFromString = function(str) {
      return str
        .split(' ')
        .map(function(item) {
          return item.replace(/\W/g, '')
        })
        .map(function(item) {
          return item.toLowerCase()
        })
        .join('-')
    }



    /*
     * @param {HTTPResponse} httpResponse The response object
     */
    Factory.getPaginationFromHTTPResponse = function(httpResponse) {
      return {
        currentPage: httpResponse.data.page,
        numberOfPages: httpResponse.data.pages,
        nextPage: httpResponse.data._links.next || null,
        previousPage: httpResponse.data._links.prev || null,
        count: httpResponse.data.count
      }
    }


    // Exports an array of objects or an object to a JSON file
    function JSONExport(data, title) {
      if (!title)
        title = 'Marketcloud_export_' + String(Date.now()) + '.json';

      var encodedUri = encodeURI('data:application/json;charset=utf-8,' + JSON.stringify(data))
      var link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', title)
      document.body.appendChild(link) // Required for FF

      link.click() // This will download the data file named "my_data.csv".
    }

    Factory.exportAsJSON = JSONExport;


    // Exports an array of objects or an object to a JSON file
    function CSVExport(data, title) {
      if (!title)
        title = 'Marketcloud_export_' + String(Date.now()) + '.csv';

      var encodedUri = encodeURI('data:text/csv;charset=utf-8,' + data )
      var link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', title)
      document.body.appendChild(link) // Required for FF

      link.click() // This will download the data file named "my_data.csv".
    }

    Factory.exportAsCSV = CSVExport;


    /*
     * Simple and UN-SAFE hash function
     *
     * @param {String} str the input string
     * @return {String} the hashed string
     */
    function strhash(str) {
      if (str.length % 32 > 0) {
        str += Array(33 - str.length % 32).join("z");
      }
      var hash = ''
      var bytes = []
      var i = 0;
      var j = 0;
      var k = 0;
      var a = 0;
      var dict = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

      for (i = 0; i < str.length; i++) {
        var ch = str.charCodeAt(i);
        bytes[j++] = (ch < 127) ? ch & 0xFF : 127;
      }

      var chunk_len = Math.ceil(bytes.length / 32);
      for (i = 0; i < bytes.length; i++) {
        j += bytes[i];
        k++;
        if ((k == chunk_len) || (i == bytes.length - 1)) {
          a = Math.floor(j / k);
          if (a < 32)
            hash += '0';
          else if (a > 126)
            hash += 'z';
          else
            hash += dict[Math.floor((a - 32) / 2.76)];
          j = k = 0;
        }
      }
      return hash;
    }

    Factory.hash = strhash;


    // Given a csv file (in string form)
    // returns an array of objects
    Factory.CSVToJSON = function(csv) {
      var rows = csv.split("\n");

      var header = rows[0];
      var header_fields = header.split(",");

      var objects = []

      for (var i = 1; i < rows.length; i++) {
        var o = {};
        var row_fields = rows[i].split(",");

        for (var k = 0; k < header_fields.length; k++) {
          if (row_fields[k] !== ""){
            o[header_fields[k]] = row_fields[k];
            
            if ("true" === o[header_fields[k]] || "false" === o[header_fields[k]])
              o[header_fields[k]] = Boolean(o[header_fields[k]]);
            else if (!isNaN(o[header_fields[k]]) ){
              // Keeping the else-if otherwise
              // test will fail converting a boolean to number
              o[header_fields[k]] = Number(o[header_fields[k]]);
            }


          }
        }

        objects.push(o)
      }

      return objects;
    }


    Factory.JSONToCSV = function(json) {
      if (!Array.isArray(json))
        json = [json];

      var fields = [];

      json.forEach(function(row) {
        for (var k in row) {
          if (fields.indexOf(k) < 0)
            fields.push(k)
        }
      })

      var firstRow = fields.join(',');

      var buf = firstRow + "\n";

      json.forEach(function(row) {
        fields.forEach(function(field) {
          if (row.hasOwnProperty(field) && row[field] !== null)
            buf += row[field] + ",";
          else
            buf += ",";
        })
        buf += "\n";
      })

      // lets remove the last newline
      buf = buf.replace(/\n$/, "");

      return buf;



    }


    return Factory;
  }
})();