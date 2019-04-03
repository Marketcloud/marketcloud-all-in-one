'use strict'
/* globals angular */
var app = angular.module('DataDashboard')

app.controller('AnalyticsController', [
  '$scope',
  '$http',
  '$routeParams',
  'analytics',
  'moment',
  'carts',
  'customers',
  '$location',
  function(scope, http, params,  analytics, moment, carts,customers, $location) {


    scope.currentRange = "This month";
    if ($location.search().range)
      scope.currentRange = $location.search().range;



   

    var today = new Date()
    today.setHours(0, 0, 0, 0)
    today = today.getTime()

    var yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    yesterday = yesterday.getTime()


    var oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate()  - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    oneWeekAgo = oneWeekAgo.getTime();

    var orders = analytics.data.data


   

    var salesVolumePerDay = {}

    var numberOfOrdersPerDay = {}




    orders
      .filter(function(x) {
        // We consider only orders not canceled or refunded or failed for the analytics
        var invalid_orders = ['failed', 'canceled', 'refunded']
        return invalid_orders.indexOf(x.status) < 0
      })
      .map(function(x) {
        return {
          created_at: x.created_at,
          total: x.total
        }
      })
      .forEach(function(x) {
        var d = new Date(x.created_at)
        var month = String(d.getMonth() + 1)
        if (month.length < 2) {
          month = '0' + month
        }
        var day = d.getFullYear() + '-' + month + '-' + d.getDate()


        if (!salesVolumePerDay[day]) {
          salesVolumePerDay[day] = 0
        }

        salesVolumePerDay[day] += x.total


        if (!numberOfOrdersPerDay[day])
          numberOfOrdersPerDay[day] = 0;

        numberOfOrdersPerDay[day]++;

      })


    var goodOrders = orders
      .filter(function(x) {
        // We consider only orders not canceled or refunded or failed for the analytics
        var invalid_orders = ['failed', 'canceled', 'refunded']
        return invalid_orders.indexOf(x.status) < 0
    })


    // Given a date object
    // returns yyyy-mm-dd
    function getDateKeyFromDate(d) {
      var month = String(d.getMonth() + 1)
      
      if (month.length < 2)
          month = '0' + month
      
      var day = d.getFullYear() + '-' + month + '-' + d.getDate()

      
      return day;
    }

    
    var ordersPerDay = {};

    // We have to prefill days labels

    
    var d = new Date();
    switch(scope.currentRange.toLowerCase()) {
      case "this month":
        for (var i =1; i <30; i++){
          var key = getDateKeyFromDate(d);
          ordersPerDay[key] = [];
          d.setDate(d.getDate() - i);
        }
      break;

      case "this week":
      for (var i =1; i <7; i++){
          var key = getDateKeyFromDate(d);
          ordersPerDay[key] = [];
          d.setDate(d.getDate() - i);
        }
      break;

      case "yesterday":
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var key = getDateKeyFromDate(yesterday);
        ordersPerDay[key] = [];
      break;

      case "today":
        var today = new Date();
        var key = getDateKeyFromDate(today);
        ordersPerDay[key] = [];
      break;
    }

    goodOrders.forEach(function(order){
      var d = new Date(order.created_at);
      
      var day = getDateKeyFromDate(d);

      if (ordersPerDay[day])
        ordersPerDay[day].push(order);
      else
        ordersPerDay[day] = [order];
    })

    scope.dateLabels = Object.keys(ordersPerDay);
    scope.formattedDateLabels = scope.dateLabels.map(function(label){
      return moment(label, 'YYYY-M-DD').format('MMM Do')
    })

    scope.ordersVolumePerDay = []
    scope.ordersCountPerDay = []

    scope.dateLabels.forEach(function(date){
      var numberOfOrdersThisDate = ordersPerDay[date].length;
      var salesThisDate = ordersPerDay[date].map( function(order){
        return order.total
      })
      .reduce(function(a,b){
        return a+b
      },0)

      scope.ordersCountPerDay.push(numberOfOrdersThisDate)
      scope.ordersVolumePerDay.push(salesThisDate)
    })

    scope.totalOrdersValue = 
      goodOrders
      .map(function(order) {
        return order.total;
      })
      .reduce(function(a,b){
        return a + b
      },0).toFixed(2)


    scope.totalOrdersCount = goodOrders.length;
    /*
     *	Here we feed the Chart.js chart on the dashboard homepage
     *
     *	This chart shows orders volume for this month (last 30 days)
     */



    
    scope.chartOptions = {
      scaleLabel: "<%= Number(value).toFixed(2).replace('.',',') %> " + scope.application.currency_code
    }

    scope.chartOptions = {
      scales: {
         xAxes : [ {
            gridLines : {
                display : false
            }
        } ],
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: scope.application.currency_code
          }
        }]
      }
    }



    carts = carts.data.data;

    customers =customers.data.data;


    scope.totalCustomersCount = customers.length


    var totalCartsCount = carts.length;
    scope.totalCartsCount = totalCartsCount

    // Carts with item inside
    var abandonedCarts = carts.filter( function(cart){return cart.status === "open" && cart.items.length > 0});
    var abandonedCartsCount = abandonedCarts.length;

    // Empty carts
    var emptyCartsCount = carts.filter( function(cart){return cart.status === "open" && cart.items.length === 0}).length;

    //
    var convertedCartsCount = carts.filter( function(cart){ return cart.status === "closed"}).length;


    scope.abandonedCartsTotalValue = abandonedCarts.map(function(cart){
      return cart.total;
    })
    .reduce(function(a,b){
      return a + b;
    },0)


    scope.CartsDatasets = [
      abandonedCartsCount,
      emptyCartsCount,
      convertedCartsCount
    ]




    scope.CartsLabels = [
    'Abandoned',
    'Empty',
    'Converted'
    ]

    scope.CartsChartOptions = {
      legend: {
            display: true,
            position: 'bottom'
        }

    }

    

    scope.setCurrentTimeRange = function(range) {

      range = range.toLowerCase();

      scope.currentRange = range;

      return $location.path('/analytics').search("range",range);


    }



    var totalCartValue = carts
    .map(function(cart) { return cart.total })
    .reduce(function(a,b){
      return a+b
    },0)


    scope.averageCartValue = 0;

    if (totalCartValue > 0)
      scope.averageCartValue = (totalCartValue / carts.length).toFixed(2)


    var totalOrdersValue = orders.map( function(order){
      return order.total
    })
    .reduce(function(a,b){
      return a + b;
    },0)


    scope.averageOrderValue = 0;

    if (totalOrdersValue > 0)
      scope.averageOrderValue = (totalOrdersValue / orders.length).toFixed(2);
    

  }

])