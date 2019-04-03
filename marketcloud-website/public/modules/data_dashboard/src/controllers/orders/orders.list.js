'use strict'
/* global angular: true  */
/* global API_BASE_URL: true  */
/* global notie: true  */
/* global alert: true  */

var app = angular.module('DataDashboard')
app.controller('OrdersController', [
  '$q',
  '$scope',
  '$http',
  '$location',
  'ordersResponse',
  '$marketcloud',
  '$route',
  '$utils',
  function($q, scope, http, $location, resources, $marketcloud, $route, $utils) {
    // Pagination
    scope.pagination = {
      currentPage: resources.data.page,
      numberOfPages: resources.data.pages,
      nextPage: resources.data._links.next || null,
      previousPage: resources.data._links.prev || null,
      count: resources.data.count
    }

    // Query
    scope.query = {
      page: 1,
      per_page: 20
    }


    // Parsing URL parameters, if provided

    // Applying Url query
    var urlQuery = {}
    try {
      urlQuery = JSON.parse($route.current.params.query)
    } catch (e) {
      console.log("Non ho potuto parsare il JSON di questa stringa ", $route.current.params.query)
      urlQuery = {};
    }

    console.log("Sono il controller ed inizializzo la query usando query URL Params ", urlQuery)
    for (var k in urlQuery) {
      scope.query[k] = urlQuery[k];
    }

    // Initial data resolved from the router
    scope.orders = resources.data.data



    // This computes a "paid" flag on each order
    // it is calculated checking each payment status
    function setPaidFlag(order) {
      // Old api set payment instead of payments
      if (order.hasOwnProperty('payment')) {
        order.paid = true
      } else if (order.hasOwnProperty('payments')) {
        order.paid = (order.payments.filter(function(p) {
          return p.successful
        }).length > 0)
      } else {
        order.paid = false
      }
    }

    // Setting the paid flag
    scope.orders.forEach(setPaidFlag)

    // Util
    scope.timestampToDate = function(t) {
      var a = new Date(t)
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return a.getDate() + ' ' + months[a.getMonth()] + ' ' + a.getFullYear()
    }

    /*
      BULK EDIT
    */
    scope.toggleAll = function() {
      scope.orders.forEach(function(o) {
        o.selected = scope.selectAll
      })
    }
    scope.getSelectedItems = function() {
      return scope.orders.filter(function(o) {
        return o.selected === true
      })
    }
    scope.bulkExport = function() {

      // If there are no selected items, we export the whole current view
      if (scope.getSelectedItems().length === 0)
        return scope.downloadCSV(scope.orders);

      scope.downloadCSV(scope.getSelectedItems())
    }

    scope.bulkJSONExport = function() {
      // If there are no selected items, we export the whole current view
      if (scope.getSelectedItems().length === 0)
        return $utils.exportAsJSON(scope.orders);

      $utils.exportAsJSON(scope.getSelectedItems());
    }

    scope.bulkUpdateStatus = function(status) {

      if (!status)
        status = scope.bulkStatusChange;


      var defer = $q.defer()

      var promises = []

      scope.getSelectedItems()
        .forEach(function(order) {
          promises.push($marketcloud.orders.update(order.id, {
            status: status
          }))
        })

      $q.all(promises)
        .then(function() {
          notie.alert(1, 'All orders have been updated', 1.5)
          scope.loadPage(scope.pagination.currentPage)
        })

      return defer.promise
    }

    scope.bulkDelete = function() {
      /*notie.confirm('Delete ' + scope.getSelectedItems().length + ' orders?', 'Delete', 'Cancel', function() {*/
      window.Alert.confirm({
        title: 'Delete ' + scope.getSelectedItems().length + ' orders?',
        message: 'Deleted orders cannot be recovered. Do you want to continue?',
        onConfirm: function() {


          var defer = $q.defer()

          var promises = []

          scope.getSelectedItems().forEach(function(order) {
            promises.push($marketcloud.orders.delete(order.id))
          })

          $q.all(promises)
            .then(function() {
              notie.alert(1, 'All orders have been deleted', 1.5)
              scope.loadPage(scope.pagination.currentPage)
            })

          return defer.promise
        }
      })
    }

    function jsonToCsv(json) {
      // Questo non va bene, i fields devono essere l'unione di
      // campi dell'ordine e campi dei prodotti
      // perchè csv è un formato di merda
      var order_fields = [
        'id',
        'created_at',
        'status',
        'total',
        'items_total',
        'shipping_total',
        'taxes_total',
        // shipping address
        'shipping_address_email',
        'shipping_address_full_name',
        'shipping_address_country',
        'shipping_address_city',
        'shipping_address_address1',
        'shipping_address_state',
        'shipping_address_postal_code',
        // billing address
        'billing_address_email',
        'billing_address_full_name',
        'billing_address_country',
        'billing_address_city',
        'billing_address_address1',
        'billing_address_state',
        'billing_address_postal_code',
        // Products
        'product_name',
        'product_id',
        'product_price',
        'product_price_discount',
        'product_weight',
        'product_depth',
        'product_width',
        'product_height',
        'variant_name_1',
        'variant_value_1',
        'variant_name_2',
        'variant_value_2',
        'variant_name_3',
        'variant_value_3',
        'variant_name_4',
        'variant_value_4',
        'variant_name_5',
        'variant_value_5'
      ]

      // var fields = Object.keys(json[0]);
      var fields = order_fields

      var csv = json.map(function(row) {
        return fields.map(function(fieldName) {
          return JSON.stringify(row[fieldName] || '')
        })
      })
      csv.unshift(fields) // add header column
      return csv.join('\r\n')
    }

    scope.downloadCSV = function(array_to_download) {
      // Here we will push order lines and product lines
      var to_transform = []

      // For each order we add
      // order id
      array_to_download.forEach(function(order) {
        var order_data = {
          'items_total': order.items_total,
          'shipping_total': order.shipping_total,
          'taxes_total': order.taxes_total,
          'total': order.total,
          'created_at': new Date(order.created_at),
          'status': order.status,
          'id': order.id
        }

        // Adding flattened shipping address
        for (var ks in order.shipping_address) {
          order_data['shipping_address_' + ks] = order.shipping_address[ks]
        }
        for (var kb in order.billing_address) {
          order_data['billing_address_' + kb] = order.billing_address[kb]
        }

        to_transform.push(order_data)

        // Ora per ogni prodotto aggiungo una riga, prima però devo estendere le chiavi dell'ordine
        var product_props = [
          'name',
          'id',
          'price',
          'price_discount',
          'weight',
          'depth',
          'width',
          'height'
        ]
        order.products.forEach(function(product) {
          // Prima prendiamo i dati del parent
          // Poi, se ha varianti
          // prendiamo i dati di variante che sovrascrivono quelli del parent
          // (ad esempio un price diverso perchè la maglietta verde costa diverso)
          // e poi prendiamo le proprietà strutturali della variante e le assegnamo
          // alloggetto in forma di variant_name_1 variant_value_1

          var prod_data = {

          }
          product_props.forEach(function(prop) {
              prod_data['product_' + prop] = product[prop]
            })
            // Ho aggiunto le proprietà di base, ora devo aggiungere le varianti
            // solo se il prodotto le ha.

          if (product.has_variants === true) {
            // Gli attributi base, possono essere sovrascritti
            product_props.forEach(function(prop) {
                if (product.variant.hasOwnProperty(prop)) {
                  prod_data['product_' + prop] = product.variant[prop]
                }
              })
              // Gli attributi varianti
            var variants_counter = 1
            for (var variant_name in product.variantsDefinition) {
              prod_data['variant_name_' + variants_counter] = variant_name
              prod_data['variant_value_' + variants_counter] = product.variant[variant_name]
              variants_counter++
            }
          }

          to_transform.push(prod_data)
        })
      })

      buildDownload(to_transform)
    }

    function buildDownload(data) {
      var encodedUri = encodeURI('data:text/csv;charset=utf-8,' + jsonToCsv(data))
      var link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', 'exported_orders.csv')
      document.body.appendChild(link) // Required for FF

      link.click() // This will download the data file named "my_data.csv".
    }

    scope.nullOrUndefined = function(value) {
      return (value === null || typeof value === 'undefined')
    }


    scope.loadPage = function(page_number) {
      scope.query.page = Number(page_number)
      return scope.loadData(scope.query)
    }

    scope.loadData = function(query) {
      if (!query) {
        query = scope.query
      }



      return $marketcloud.orders.list(query)
        .then(function(response) {
          scope.pagination = {
            currentPage: response.data.page,
            numberOfPages: response.data.pages,
            nextPage: response.data._links.next || null,
            previousPage: response.data._links.prev || null,
            count: response.data.count
          }

          scope.orders = response.data.data;

          scope.orders.forEach(setPaidFlag)

          // This little trick allows us to get back to the latest state of the view when we hit a back button.
          window.history.pushState(scope.query, "List orders", '#/orders?query=' + angular.$$encodeUriSegment(JSON.stringify(scope.query)));
        })
        .catch(function(error) {
          console.log(error);
          notie.alert(3, 'An error has occurred. Please try again.', 1.5)
        })
    }


    scope.deleteOrder = function(order) {
      notie.confirm('Delete order?<p>Deleting the order, inventory quantities will be re-assigned.</p>', 'Delete', 'Cancel', function() {
        $marketcloud.orders.delete(order.id)
          .then(function() {
            notie.alert(1, 'Order deleted succesfully', 1)
            scope.loadPage(scope.pagination.currentPage)
          })
          .catch(function() {
            notie.alert(3, 'An error has occurred, order not deleted.', 1)
          })
      })
    }


    /* FILTERS */
    scope.filters = [];

    var notFilters = [
      'per_page',
      'page',
      'sort_by',
      'sort_order'
    ]

    function isOperator(key) {
      return notFilters.indexOf(key) >= 0
    };


    for (var k in scope.query) {
      if (!isOperator(k)) {
        console.log(k + " is not an operator")
        scope.filters.push({
          name: k,
          value: scope.query[k]
        })
      }
    }

    scope.applyFilters = function() {

      scope.filters.forEach(function(filter) {
        scope.query[filter.name] = filter.value;
      })
      scope.loadData();
    }

    scope.saveNewFilterAndApply = function() {

      scope.addFilter(scope.newFilter);

      scope.newFilter = {
        name: '',
        value: null
      }
      $('#singleFilterModal').modal('hide');
    }

    scope.addFilter = function(key,value) {
      
      if ("object" === typeof key)
        this.filters.push(key);
      else if ("string" === typeof key)
        this.filters.push({
          name : key,
          value : value
        })
      else 
        throw new Error("addFilter(Filter: f) or addFilter(String: fName, Any: fValue)")

      scope.applyFilters();
    }

    /*
     *  @param {Number} index The position of the filter to remove
     *  @param {Boolean} applyToQuery Wether to call applyFilters() or not
     */
    scope.removeFilter = function(index, applyToQuery) {
      if (typeof applyToQuery === 'undefined') {
        applyToQuery = true
      }

      var filterToRemove = scope.filters.splice(index, 1)

      filterToRemove = filterToRemove[0]

      delete scope.query[filterToRemove.name]

      if (applyToQuery === true) {
        scope.applyFilters()
      }
    }


    // Removes a filter given its name in the filters array
    scope.removeFilterByName = function(name) {
      scope.filters = scope.filters.filter(function(filter) {
        return filter.name !== name;
      })

      delete scope.query[name];

      scope.applyFilters();

    }

    scope.removeFilterByPosition = function(pos){
      scope.filters.splice(pos,1);
      scope.applyFilters();
    }


    scope.setQueryParam = function(key,value) {
      scope.query[key] = value;
      scope.loadData();
    }

    scope.deleteQueryParam = function(key) {
      delete scope.query[key];
      scope.loadData();
    }    


    scope.sortingAttributes = [
      'id',
      'status',
      'created_at',
      'total',
      'items_total',
      'shipping_total',
      'taxes_total',
      'coupon_total',
      'promotion_total'
    ]

    scope.applySorting = function() {
      scope.loadData()
        //$("#sortingModal").modal('hide');
    }


  }
])