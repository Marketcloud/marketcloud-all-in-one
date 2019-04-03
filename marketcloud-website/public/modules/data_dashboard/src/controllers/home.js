'use strict'
/* globals angular */
var app = angular.module('DataDashboard')

app.controller('HomeController', [
  '$scope',
  '$http',
  '$routeParams',
  'analytics',
  'moment',
  function(scope, http, params,  analytics, moment) {
    scope.activities = []

    var getResourceNameFromPath = function(p) {
      var names = {
        'orders': 'an order',
        'products': 'a product',
        'categories': 'a category',
        'brands': 'a brand',
        'users' : 'a user',
        'cart' : 'a cart',
        'promotions' : 'a promotion',
        'collection' : 'a collection'

      }
      var resourcename = p.split('/')[2]

      if (names.hasOwnProperty(resourcename)) {
        return names[resourcename]
      } else {
        return resourcename
      }
    }

    // What i want to match
    // new orders
    // updates to orders
    // Updates to inventory
    scope.alerts = []


    // ORders used to display stats
    scope.analytics = {
      today: {
        total: 0,
        count: 0

      },
      yesterday: {
        total: 0,
        count: 0
      },
      this_week: {
        total: 0,
        count: 0
      },
      this_month: {
        total: 0,
        count: 0
      }
    }

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


    scope.ordersToManage = orders.filter( function(order){
      return [
        'processing',
        'pending',
        'on_hold'
      ].indexOf(order.status) > -1
    }).slice(0,10)


    var salesVolumePerDay = {}

    var numberOfOrdersPerDay = {}

    scope.orders_data = []
    scope.orders_labels = []

    var last_30_days = []
    var last_30_days_labels = []
    for (var i = 1; i < 30; i++) {
      var d = new Date()
      d.setDate(d.getDate() - i)
      var month = String(d.getMonth() + 1)
      if (month.length < 2) {
        month = '0' + month
      }
      var day = d.getFullYear() + '-' + month + '-' + d.getDate()

      last_30_days_labels.push(day)
      last_30_days.push({
        date: day,
        value: 0
      })
      salesVolumePerDay[day] = 0
    }

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
        if (x.created_at > today) {
          scope.analytics.today.total = Math.round((scope.analytics.today.total + x.total) * 1000) / 1000
          scope.analytics.today.count++

            scope.analytics.this_month.total = Math.round((scope.analytics.this_month.total + x.total) * 1000) / 1000
          scope.analytics.this_month.count++
        } else if (x.created_at > yesterday) {
          scope.analytics.yesterday.total = Math.round((scope.analytics.yesterday.total + x.total) * 1000) / 1000
          scope.analytics.yesterday.count++

            scope.analytics.this_month.total = Math.round((scope.analytics.this_month.total + x.total) * 1000) / 1000
          scope.analytics.this_month.count++
        } else if (x.created_at > oneWeekAgo) {
          scope.analytics.this_week.total = Math.round((scope.analytics.this_week.total + x.total) * 1000) / 1000
          scope.analytics.this_week.count++

            scope.analytics.this_month.total = Math.round((scope.analytics.this_month.total + x.total) * 1000) / 1000
          scope.analytics.this_month.count++
        } else {
          scope.analytics.this_month.total = Math.round((scope.analytics.this_month.total + x.total) * 1000) / 1000
          scope.analytics.this_month.count++
        }
      })

    /*
     *	Here we feed the Chart.js chart on the dashboard homepage
     *
     *	This chart shows orders volume for this month (last 30 days)
     */
    scope.orders_volume_data = []
    scope.orders_count_data = []
    scope.orders_volume_labels = []

    

    for (var k in salesVolumePerDay) {
      scope.orders_volume_data.unshift(parseFloat(Number(salesVolumePerDay[k]).toFixed(2)))
      scope.orders_count_data.unshift(numberOfOrdersPerDay[k]);
      scope.orders_volume_labels.unshift(moment(k, 'YYYY-M-DD').format('MMM Do'))
    }

    scope.datasets = [
      scope.orders_volume_data,
      scope.orders_count_data
    ]


    scope.getMethodCSSClass = function(a) {
      var cls = null
      switch (a.method) {
        case 'GET':
          cls = 'label-success'
          break
        case 'POST':
          cls = 'label-info'
          break
        case 'PUT':
          cls = 'label-warning'
          break
        case 'PATCH':
          cls = 'label-warning'
          break
        case 'DELETE':
          cls = 'label-danger'
          break
        default:
          cls = 'label-success'
          break

      }
      return cls
    }

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
  }
])