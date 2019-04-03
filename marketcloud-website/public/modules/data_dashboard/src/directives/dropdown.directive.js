var app = angular.module('DataDashboard');
app.directive('dropdown', function($document) {
  return {
    restrict: "C",
    link: function(scope, elem, attr) {



      // Handling nested dropdowns
      angular.element('.dropdown-submenu > a.dropdown-submenu-toggle')
      .on("click", function(e) {

        // We get a pointer to the submenu
        var submenu = angular.element(this).next('ul');


        angular.element(submenu).toggle()
        

        // Preventing further event handling
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
      });

    }
  }
});