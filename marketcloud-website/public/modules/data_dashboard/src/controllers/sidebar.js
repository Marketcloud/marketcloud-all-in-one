
var app = angular.module('DataDashboard')

app.controller('SidebarController', [
  '$scope', '$http', '$routeParams', '$location', '$rootScope', '$route',
  function ($scope, $http, $params, $location, $root, $route) {
    $scope.showingSubSidebar = false

    $scope.currentSidebarSection = null

    $scope.currentSection = null

    $scope.$on('$dashboardSectionChange', function ($event, args) {
			// Intercepting the new section event
      if (args.section) {
        $scope.currentSection = args.section.split('.')[0]

        $root.currentSection = args.section.split('.')[0]
        $root.currentSubsection = args.section.split('.')[1] || null

        if (args.section.indexOf('system') < 0 || args.section.indexOf('inventory') < 0) {
          $scope.hideSubSidebar()
        }
      }
    })

    $scope.switchToApp = function (app_id) {
      var current_app_id = window.current_application.id
			// We just need to swap the current urls with the desired app id
      var url = '/applications/' + app_id + '/dashboard#/'

      window.location.href = url
    }

    $scope.subEntriesGroupToShow = null

    $scope.subSideBars = {
      inventory: false,
      system: false
    }
    $scope.showSubEntries = function (id) {
      $scope.subEntriesGroupToShow = id
    }

    $scope.subEntriesGroupShown = {
      inventory: false,
      system: false
    }

    $scope.toggleSubEntries = function (group_id) {
			// group_id is the name of the dashboard section
			// a section is a group of logical views
			// e.g. inventory is a group of views related to inventory management
      $scope.currentSection = group_id

      $scope.subEntriesGroupShown[group_id] = !$scope.subEntriesGroupShown[group_id]
    }
    $scope.showSubSidebar = function (id) {
      $scope.showingSubSidebar = true

      var sidebars = [
        'inventory',
        'system',
        'contents'
      ]

      if (sidebars.indexOf(id) < 0) {
        return false
      }

      $scope.currentSidebarSection = id
    }

    $scope.hideSubSidebar = function () {
      $scope.showingSubSidebar = false
    }
  }
])

app.controller('NavbarController', ['$scope', '$http', '$routeParams', '$location',
  function ($scope, $http, $params, $location) {

  }
])
