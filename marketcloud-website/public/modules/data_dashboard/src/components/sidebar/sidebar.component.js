
var app = angular.module('DataDashboard')

app.controller('SidebarController',
  [
  '$scope', 
  '$http', 
  '$routeParams', 
  '$location', 
  '$rootScope', 
  '$route',
  '$application',
  '$window',
  'StormConfiguration',
  function($scope, $http, $params, $location, $root, $route, $application, $window, Configuration) {
    $scope.showingSubSidebar = false

    $scope.currentSidebarSection = null

    $scope.currentSection = null

    $scope.sidebarIsExpanded = true;

    $scope.subEntriesGroupToShow = null

    $scope.subSideBars = {
      inventory: false,
      system: false
    }

    $scope.StormConfiguration = {};
    $scope.StormConfiguration = Configuration.get();



    $scope.$on('$dashboardSectionChange', function($event, args) {
      // Intercepting the new section event
      if (args.section) {
        
        $scope.currentSection = args.section.split('.')[0]
        $scope.currentSubsection = args.section.split('.')[1] || null

        $root.currentSection = args.section.split('.')[0]
        $root.currentSubsection = args.section.split('.')[1] || null

        if (args.section.indexOf('system') < 0 || args.section.indexOf('inventory') < 0) {
          $scope.hideSubSidebar()
        }
      }
    })



    $scope.switchToApp = function(app_id) {
      var current_app_id = $application.get().id
        // We just need to swap the current urls with the desired app id
      var url = '/applications/' + app_id + '/dashboard#/'

      window.location.href = url
    }

   
    $scope.showSubEntries = function(id) {
      $scope.subEntriesGroupToShow = id
    }
    $scope.hideAllSubEntries = function() {
      for (var k in $scope.subEntriesGroupShown)
        $scope.subEntriesGroupShown[k] = false;
    }

    $scope.subEntriesGroupShown = {
      inventory: false,
      system: false
    }

    // find workaround with $window, since currently using $window doesnt work
    this.mql = window.matchMedia('screen and (max-width:1000px)');

    this.mql.addListener( function(mq){
      console.log("matchMedia Listener")
      if (mq.matches) {
        if (true === $scope.sidebarIsExpanded) {
          $scope.toggleSidebar();
        }
      } else {
          // When the screen size grows bigger, we expand the sidebar,
          // not required but probably wanted by the user
          if (false === $scope.sidebarIsExpanded) {
          $scope.toggleSidebar();
        }
        }
    })

    


    $scope.toggleSidebar = function() {


      var movement = "-=200";
      var duration = 500;

      if ($scope.sidebarIsExpanded === false) {
        movement = '+=200';

        // if we are closing the sidebar, we also close sub-sections in it
        $scope.hideAllSubEntries();
      }

      $("#page-wrapper").animate({
        "margin-left": movement
      }, {
        duration: duration,
        queue: false
      });

      $(".dashboard-section-header").animate({
        "left": movement
      }, {
        duration: duration,
        queue: false
      });

      $(".sidebar-footer").animate({
        "left": movement
      }, {
        duration: duration,
        queue: false
      });

      $(".sidebar").not('.sub-sidebar').animate({
        left: movement
      }, {
        duration: duration,
        queue: false,
        done: function() {



          if (true === $scope.sidebarIsExpanded) {
            $("a.entry .fa").addClass("pull-right");
            $scope.sidebarIsExpanded = false;
          } else {
            $scope.sidebarIsExpanded = true;
            $("a.entry .fa").removeClass("pull-right");
          }



          $scope.$apply();
        }
      })

    }

    $scope.toggleSidebar = function() {

      if (true === $scope.sidebarIsExpanded) {
        angular.element('.sidebar').addClass('collapsed');
        angular.element('.sidebar').removeClass('expanded');
        angular.element('#page-wrapper').addClass('expanded');
        angular.element('#page-wrapper').removeClass('collapsed');
        $scope.hideAllSubEntries();
        $scope.sidebarIsExpanded = false;
      } else {
        angular.element('.sidebar').addClass('expanded');
        angular.element('.sidebar').removeClass('collapsed');
        angular.element('#page-wrapper').addClass('collapsed');
        angular.element('#page-wrapper').removeClass('expanded');
        $scope.sidebarIsExpanded = true;
      }


    }

    $scope.toggleSubEntries = function(group_id) {
      // group_id is the name of the dashboard section
      // a section is a group of logical views
      // e.g. inventory is a group of views related to inventory management
      $scope.currentSection = group_id

      if (false === $scope.sidebarIsExpanded)
        $scope.toggleSidebar();


      $scope.subEntriesGroupShown[group_id] = !$scope.subEntriesGroupShown[group_id]
    }


    $scope.saveStormConfiguration = function(){

      for (var k in $scope.StormConfiguration) {
        Configuration.set(k, $scope.StormConfiguration[k], true);
      }

      if ($scope.StormConfiguration.hasOwnProperty("theme"))
        Configuration.applyTheme($scope.StormConfiguration.theme)
    }


    $scope.showSubSidebar = function(id) {

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

    $scope.hideSubSidebar = function() {
      $scope.showingSubSidebar = false
    }
  }
])

app
.component('sidebar', {
  templateUrl: '/modules/data_dashboard/src/components/sidebar/sidebar.component.html',
  controller: 'SidebarController',
  bindings: {}
})
