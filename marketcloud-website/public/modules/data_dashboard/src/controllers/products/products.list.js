angular.module('DataDashboard')
.controller('ListProductsController', [
  '$scope',
  '$location',
  '$marketcloud',
  '$http',
  '$q',
  'products',
  '$route',
  '$rootScope',
  'StormConfiguration',
  '$utils',
  '$models',
  function(scope, $location, $marketcloud, http, $q, resources,$route,$rootScope, StormConfiguration, $utils, $models) {
    'use strict'

    // This array will hold our data
    scope.products = []

    
    

    
    // Bulk control
    // Here we place selected prodocuts for bulk actions
    scope.selected = []

    // BUlk operations buttons
    scope.showBulkControls = false


    // Keeping track of which resources are selected
    scope.selections = {}

    // The main resource
    scope.products = resources.data.data

    // The columns we are showing
    // Loading from config or initializing
    scope.showing_attributes = StormConfiguration.get('products_list_showing_attributes') || []

    // Attributes not togglable in view
    scope.reserved_attributes = [
      'name',
      'type',
      'price',
      'inventory',
      'published'
    ]

    // Initializing pagination
    scope.pagination = {
      currentPage: resources.data.page,
      numberOfPages: resources.data.pages,
      nextPage: resources.data._links.next || null,
      previousPage: resources.data._links.prev || null,
      count: resources.data.count
    }

    // The query object to filter results from the api
    scope.query = {
      per_page: 20,
      page : scope.pagination.currentPage
    }


    


    // Parsing URL parameters, if provided
    // Applying Url query
    var urlQuery = {}
    try {
      urlQuery = JSON.parse($route.current.params.query)
    } catch(e) {
      urlQuery = {};
    }

    for (var k in urlQuery){
      scope.query[k] = urlQuery[k];
    }

    

    /************************************************************
     *                         COLUMNS
     **************************************************************/

    // We assign to available_attributes
    // those keys of products
    scope.available_attributes = []

    // Building the available_attributes array
    scope.products.forEach(function(p) {
      // Attributes to add to available_attributes
      var new_attributes =
        Object.keys(p)
        .filter(function(key) {
          // It must not be in reserved list
          return scope.reserved_attributes.indexOf(key) === -1
        })
        .filter(function(key) {
          // must be something we can render
          var types = ['number', 'string', 'boolean']
          return types.indexOf(typeof p[key]) > -1
        })
        .filter(function(key) {
          // must not be a duplicate
          return scope.available_attributes.indexOf(key) === -1
        })
      scope.available_attributes = scope.available_attributes.concat(new_attributes)
    })

    /*
        For legacy reasons, some products may have overwritten the type property
        so we infer it again here
     */

    scope.products.forEach(function(product) {
      if (product.type === 'simple_product' || product.type === 'product_with_variants') {
        return
      }

      if (product.hasOwnProperty('variants') && product.hasOwnProperty('variantsDefinition')) {
        product.type = 'product_with_variants'
      } else {
        product.type = 'simple_product'
      }
    })

    /*
     *    Shows or hides a column by name
     *    @param {String} name The name of the column to show/hide
     */
    scope.toggleColumn = function(name) {
      var i = scope.showing_attributes.indexOf(name)
      if (i > -1) {
        scope.showing_attributes.splice(i, 1)
      } else {
        scope.showing_attributes.push(name)
      }

      StormConfiguration.set('products_list_showing_attributes', scope.showing_attributes)
    }

    scope.filterColumnNamesPattern = ''
    scope.filterColumnNames = function(item) {
      return item.indexOf(scope.filterColumnNamesPattern) > -1
    }

    /************************************************************
     *                         FILTERS
     **************************************************************/

    

    // We want to be able to filter also by reserved attributes
    scope.filterAttributes = scope.reserved_attributes.concat(scope.available_attributes)

    scope.applyFilters = function(filters){
      filters.forEach( function(filter){
        scope.query[filter.name] = filter.value;
      })
      scope.loadData();
    }

    scope.applySorting = function() {
      scope.loadData()
      $("#sortingModal").modal('hide');
    }

    scope.sortByColumn = function(columnName) {
      
      var order = null;

      if (scope.query.sort_order === 'DESC')
        order = 'ASC'
      else
        order = 'DESC';

      scope.query.sort_by = columnName;

      scope.query.sort_order = order;

      scope.loadData();
    }




    /************************************************************
     *                         MULTIPLE/BULK SELECTION
     **************************************************************/

    // Holding query fields
    // When listing data this oobject is sent

    scope.isItemSelected = function(item) {
      return scope.selected.indexOf(item.id) > -1
    }

    scope.toggleItemSelection = function(item) {
      // If is not selected, we select it
      if (!scope.isItemSelected(item)) {
        return scope.selected.push(item.id)
      }

      // If selected we find it and remove it
      for (var i = scope.selected.length - 1; i >= 0; i--) {
        if (scope.selected[i] === item.id) {
          scope.selected.splice(i, 1)
        }
      }
    }

    scope.toggleAll = function() {
      if (scope.selectAll === false) {
        scope.selected = []
      } else {
        scope.selected = scope.products.map(function(product) {
          return product.id
        })
      }
    }

    scope.$watch('selected', function(newValue, oldValue) {
      // Have to recaulcate scope.selections
      var tmp = {}
      scope.selected.forEach(function(id) {
        tmp[id] = true
      })
      scope.selections = tmp
    })

    scope.getSelectedItems = function() {
      return scope.products.filter(function(p) {
        return scope.isItemSelected(p)
      })
    }

    scope.bulkSetPublishing = function(flag) {
      // flag must be boolean

      var defer = $q.defer()

      var promises = []

      scope.getSelectedItems().forEach(function(product) {
        promises.push($marketcloud.products.update(product.id, {
          published: flag
        }))
      })

      $q.all(promises)
        .then(function() {
          notie.alert(1, 'All products have been updated', 1.5)
          scope.loadPage(scope.pagination.currentPage)
        })

      return defer.promise
    }

    scope.bulkDelete = function() {
      notie.confirm('Delete ' + scope.getSelectedItems().length + ' products?', 'Delete', 'Cancel', function() {
        var defer = $q.defer()

        var promises = []

        scope.getSelectedItems().forEach(function(product) {
          promises.push($marketcloud.products.delete(product.id))
        })

        $q.all(promises)
          .then(function() {
            notie.alert(1, 'All products have been deleted', 1.5)
            scope.loadPage(scope.pagination.currentPage)
          })

        return defer.promise
      })
    }

    scope.bulkJSONExport = function(){
      // If there are no selected items, we export the whole current view
      if (scope.getSelectedItems().length === 0)
        return $utils.exportAsJSON(scope.products);

      $utils.exportAsJSON(scope.getSelectedItems());
    }

    scope.bulkCSVExport = function(){
      var _data = scope.getSelectedItems()

      // If there are no selected items, we export the whole current view
      if (_data.length === 0)
        _data = scope.products;

      var bucket = [];

      _data.forEach(function(product){
        if ("simple_product" === product.type){
          bucket.push(product);
        } else if ("product_with_variants" === product.type){

          var productWithoutVariants = angular.copy(product);
          delete productWithoutVariants.variants;
          bucket.push(productWithoutVariants);

          var variantNames = [];

          product.variants.forEach(function(i){ 
            i.type = "variant";
            bucket.push(i)
          })

        } else {
          bucket.push(product);
        }
      })

      _data = bucket;


      console.log("Prima di flatten",angular.copy(_data) )

      _data = _data.map( $utils.flatten );

      console.log("Dopo di flatten",angular.copy(_data) )

      var _csv = $utils.JSONToCSV(_data)

      console.log("IL CSV",angular.copy(_csv) )
      return $utils.exportAsCSV(_csv);
    }

    /************************************************************
     *                         IMPORT/EXPORT
     **************************************************************/
    scope.importProducts = function() {
      notie.alert(4, 'Contact us at info@marketcloud.it with import subject', 1.5)
    }


    // Shows the file selector dialog
    scope.chooseJSONFile = function(){
      scope.importMode = 'JSON';
      document.querySelector("#JSONFileInput").click();
    }
    scope.chooseCSVFile = function(){
      scope.importMode = 'CSV';
      document.querySelector("#CSVFileInput").click();
    }

    // Updates the local copy of file contents
    scope.JSONFileChanged = function(){

      var file = document.getElementById("JSONFileInput").files[0];
      
      //Resetting the file input so we can re-try uploads
      // of the same file and still detect changes
      document.getElementById("JSONFileInput").value = "";

      if (file) {
          var reader = new FileReader();
          reader.readAsText(file, "UTF-8");
          reader.onload = function (evt) {
            
            // TODO add try catch to manage invalid json
            try {
              var jsonLines = JSON.parse(evt.target.result)
            } catch(e) {
              return Alert.error({
                message : 'Invalid JSON file, please check file syntax'
              })
            }
            
            scope.importJSON(jsonLines)
          }
          reader.onerror = function (evt) {
              notie.alert(3,"error reading file",2)
          }
      }
    }

    scope.CSVFileChanged = function(){

      var file = document.getElementById("CSVFileInput").files[0];
      
      //Resetting the file input so we can re-try uploads
      // of the same file and still detect changes
      document.getElementById("CSVFileInput").value = "";

      if (file) {
          var reader = new FileReader();
          reader.readAsText(file, "UTF-8");
          reader.onload = function (evt) {
            
            // TODO add try catch to manage invalid json
            var csvFileContent = evt.target.result;
            
            var productsToImport = $utils.CSVToJSON(csvFileContent);
            
            // Sacrifice brevity in the name of clarity for the greater good
            // We flatten jsons before exporting to CSV so now we must unflatten them
            productsToImport = productsToImport.map( $utils.unflatten );

            scope.importJSON(productsToImport);



            // JSON is an array
            
          }
          reader.onerror = function (evt) {
              notie.alert(3,"error reading file",2)
          }
      }
    }

    // Upload json content
    scope.uploadJSON = function(){
      // Importing as json this file
      var jsonLines = JSON.parse(scope.fileContent);
      console.log("jsonLines è ",jsonLines)
      scope.importJSON(jsonLines);
    }

    // Upload ccsv content
    scope.uploadCSV = function(){
      // Importing as json this file
      // TODO CSV TO JSON
      //var jsonLines = JSON.parse(scope.fileContent);
      //scope.importJSON(jsonLines);
      console.log("To implement...")
    }


    // Import json
    scope.importJSON = function(lines){
      var productsToImport = [];
      var invalidItemIndex = null;
      var invalidItems = []


      for (var i =0; i< lines.length; i++){
        var line = lines[i];
        if (line.type === "simple_product"){

          var validation = $models.Product.validate(line);
          if (false === validation.valid) {
            //notie.alert(3,"Please check your JSON, element number "+String(i+1)+" is invalid.",2);
            Alert.error({
              message : 'Please check your import file. Element number '+String(i+1)+' is invalid.'
            })
            invalidItems.push(line);
            break;
          }
          productsToImport.push(line);
        } else if (line.type === "product_with_variants" ){
          
          var validation = $models.ProductWithVariants.validate(line);
          if (false === validation.valid) {
            //notie.alert(3,"Please check your JSON, element number "+String(i+1)+" is invalid.",2);
            Alert.error({
              message : 'Please check your import file. Element number '+String(i+1)+' is invalid.'
            })
            invalidItems.push(line);
            break;
          } else {
            productsToImport.push(line);
          }
        } else if (line.type === "variant"){
          if (!productsToImport[productsToImport.length-1].variants)
            productsToImport[productsToImport.length-1].variants = []

          var validation = $models.Variant.validate(line);
          if (false === validation.valid) {
            //notie.alert(3,"Please check your CSV, line "+i+" is invalid.",2);
            Alert.error({
              message : 'Please check your import file. Element number '+String(i+1)+' is invalid.'
            })
            invalidItems.push(line);

            break;
          } else {
            productsToImport[productsToImport.length-1].variants.push(line);
          }

          
        } else {
          notie.alert(3,"Invalid data",2);
        }
      }

      if (0 === invalidItems.length) {
        // No invalid items, we can proceed
        console.log("Ecco cosa importare", productsToImport)
        importData(productsToImport)
      } else {
        console.log("validation",validation)
        console.log("Import aborted due to invalid items",invalidItems);

      }

      
      

      
    }




    function importData(items) {
      console.log("GOING TO IMPORT "+items.length+" PRODUCTS FROM FILE");
      var defer = $q.defer()
      var promises = []

      var failures = [];

      function push(r){ promises.push(r)}
      function noop(r){ failures.push(r)}

      function noop2(i){
        failures.push(i);
        return function(error){}
      }


      items.forEach(function(product) {
        if ("simple_product" === product.type)
          promises.push($marketcloud.products.save(product).then(push).catch(function(error){
            failures.push(product)
          }) );

        if ("product_with_variants" === product.type) {

          var productWithoutVariants = angular.copy(product);
          delete productWithoutVariants.variants;


          var newPromise = $q(function(resolve,reject){

            return $marketcloud.products.save(productWithoutVariants)
            .then(function(response){
              var product_id = response.data.data.id;
              return $marketcloud.variants.save(product_id,product.variants);
            })
            .then(resolve)
            .catch(reject)

          })


          promises.push(newPromise.then(push).catch(function(error){
            failures.push(product)
          }) );
        }
      })

      $q.all(promises)
        .then(function(data) {

          if (failures.length > 0) {
            console.log("FAILURES",failures)
            var msg = '<p>Not every item was imported. Import failed for '+failures.length+' items:</p><ul>';

            failures.forEach(function(item){
              msg += '<li class="text-left">'+item.name+'</lI>';
            })
            msg += '</ul>';
            Alert.warning({
              message : msg
            })
          } else {
            Alert.success({
              message : 'All items were imported'
            })
          }
          scope.loadPage(1)
        })
        .catch(function(){
          console.log("ALL FINISHED WITH ERROR")
          console.log("Failures",failures);
          notie.alert(2,"Import succeded partially, Only the first ");
          scope.loadPage(1)
        })

      return defer.promise
    }



    /************************************************************
     *                        DUPLICATE
     **************************************************************/
    scope.cloneProduct = function(product_to_duplicate) {
      var product_to_save = angular.copy(product_to_duplicate)
      delete product_to_save.id
      delete product_to_save.product_id
      delete product_to_save.variant_id
      delete product_to_save._id

      product_to_save.name += ' (Copy)'
      product_to_save.published = false

      switch (product_to_save.stock_type) {
        case 'track':
          delete product_to_save['stock_status']
          break
        case 'status':
          delete product_to_save['stock_level']
          break
        case 'infinite':
          delete product_to_save['stock_level']
          delete product_to_save['stock_status']
          break
      }

      // NOTE this uses client side info. it is a utility
      //
      delete product_to_save.variants

      $marketcloud.products.save(product_to_save)
        .then(function(response) {
          console.log("RESPONSATI", response)
          if (product_to_save.has_variants === true || product_to_save.type === 'product_with_variants') {
            return http({
              method: 'POST',
              url: API_BASE_URL + '/products/' + response.data.data.id + '/variants',
              data: product_to_duplicate.variants,
              headers: {
                Authorization: window.public_key + ':' + window.token
              }
            })
          }
        })
        .then(function(response) {
          scope.loadPage(scope.pagination.currentPage)
          notie.alert(1, 'Product successfully cloned', 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again.', 1.5)
        })
    }

    /************************************************************
     *                         QUERY OPERATIONS
     **************************************************************/
    scope.setPublishing = function(prod) {
      $marketcloud.products.update(prod.id, {
          published: prod.published
        })
        .then(function(response) {
          notie.alert(1, 'Updated!', 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred, please try again.', 1.5)
        })
    }

    scope.alterColumnNames = function(name) {
      if (name === 'stock_level') {
        return 'Inventory'
      } else {
        return name
      }
    }

    scope.prepareRegex = function() {
      scope.query.name.$options = 'i'
    }

    scope.loadData = function(query) {


      if (scope.query.q === '') {
        delete scope.query.q
      }

      if (query) {
        if ("object" !== typeof query)
          throw new TypeError("loadData(query) query must be an object of filters");

        for (var k in query)
          scope.query[k] = query[k];
      }

      
      return $marketcloud.products.list(scope.query)
        .then(function(response) {
          scope.pagination = {
            currentPage: response.data.page,
            numberOfPages: response.data.pages,
            nextPage: response.data._links.next || null,
            previousPage: response.data._links.prev || null,
            count: response.data.count
          }

          // This little trick allows us to get back to the latest state of the view when we hit a back button.
          // We don't use $location because it has a weird behaviour appending #/#/path
          window.history.pushState(scope.query, "List products", '#/products?query=' + angular.$$encodeUriSegment(JSON.stringify(scope.query) ) );

          scope.products = response.data.data
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again', 1.5)
        })
    }

    scope.loadPage = function(page_number) {
      scope.query.page = Number(page_number)
      scope.loadData()
    }

    scope.deleteProduct = function(prod_id, index) {
      http({
          method: 'DELETE',
          url: API_BASE_URL + '/products/' + prod_id,
          headers: {

            Authorization: window.public_key + ':' + window.token
          }

        })
        .then(function(response) {
          scope.loadPage(scope.pagination.currentPage)
          notie.alert(1, 'Product deleted', 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred.Please try again.', 1.5)
        })
    }
  }
])