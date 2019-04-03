module.exports = function(app) {


	app.controller('EditRoleController', ['$scope', '$http', 'application','$rootScope','rolePresets','role','$location',
		function(scope, http, application,$rootScope,rolePresets,role,location) {
			scope.application = application;
			$rootScope.$broadcast('$dashboardSectionChange',{section : "acl"});
			$rootScope.application = application;

			scope.role = role.data.data;

			scope.preset_name = 'public';
			scope.errors = {};
			
			scope.presets = rolePresets;
			scope.applyPreset = function(){
				if (!scope.presets.hasOwnProperty(scope.preset_name)){
					console.log("THere is no preset named "+scope.preset_name)
					return;
				}

				for (var k in (scope.presets[scope.preset_name])){
					scope.role.endpoints[k] = scope.presets[scope.preset_name][k];
				}
			}
			scope.clearErrors = function() {
				scope.errors = {};
			}
			scope.formHasErrors = function(){
				console.log("KEYS"+Object.keys(scope.errors).length)
				return Object.keys(scope.errors).length > 0;
			}
			var validateRole = function(){
				scope.clearErrors()
				if (scope.role.name.length > 253){
					scope.errors.name = 'Name too long';

					return false;
				}

				if (scope.role.name.length < 1){
					scope.errors.name = 'Name too short';
					return false;
				}

				return true;
			}
			scope.updateRole = function(){
				if (!validateRole())
					return;
				http({
					method : 'PUT',
					url : '/applications/'+scope.application.id+'/roles/'+scope.role.id,
					data : scope.role
				})
				.then(function(response){
					notie.alert(1,"Role successfuly created.",1.5);
					location.path('/applications/'+scope.application.id+'/acl')
				}).catch(function(error){
					notie.alert(2,"An error has occurred, please try again.",1.5);
				})
			}
		}])



	app.controller('NewRoleController', ['$scope', '$http', 'application','$rootScope','rolePresets','$location',
		function(scope, http, application,$rootScope,rolePresets,location) {
			scope.application = application;
			$rootScope.$broadcast('$dashboardSectionChange',{section : "acl"});
			$rootScope.application = application;
			scope.preset_name = 'public';
			scope.errors = {};
			scope.newRole = {
				name : '',
				description : '',
				endpoints : angular.copy(rolePresets.public)
			}
			scope.presets = rolePresets;
			scope.applyPreset = function(){
				if (!scope.presets.hasOwnProperty(scope.preset_name)){
					console.log("THere is no preset named "+scope.preset_name)
					return;
				}

				for (var k in (scope.presets[scope.preset_name])){
					scope.newRole.endpoints[k] = scope.presets[scope.preset_name][k];
				}
			}
			scope.clearErrors = function() {
				scope.errors = {};
			}
			scope.formHasErrors = function(){
				console.log("KEYS"+Object.keys(scope.errors).length)
				return Object.keys(scope.errors).length > 0;
			}
			var validateRole = function(){
				scope.clearErrors()
				if (scope.newRole.name.length > 253){
					scope.errors.name = 'Name too long';

					return false;
				}

				if (scope.newRole.name.length < 1){
					scope.errors.name = 'Name too short';
					return false;
				}

				return true;
			}
			scope.saveRole = function(){
				if (!validateRole())
					return;
				http({
					method : 'POST',
					url : '/applications/'+scope.application.id+'/roles',
					data : scope.newRole
				})
				.then(function(response){
					notie.alert(1,"Role successfuly created.",1.5);
					location.path('/applications/'+scope.application.id+'/acl')
				}).catch(function(error){
					notie.alert(2,"An error has occurred, please try again.",1.5);
				})
			}
		}])

	app.controller('ACLController', ['$scope', '$http', 'roles','application','$rootScope',
		function(scope, http, roles, application,$rootScope) {
	
			$rootScope.$broadcast('$dashboardSectionChange',{section : "acl"});
			
			scope.application = application;
			$rootScope.application = application;

			
			scope.roles = roles.data.data;


			
			
			scope.load = function() {
				http({
					method : 'GET',
					url : '/applications/'+scope.application.id+'/roles'
				})
				.then(function(response){
					scope.roles = response.data.data;
				})
				.catch(function(response){
					notie.alert(2,'An error has occurred while reloading roles.',1);
				});
			};


			




			

			scope.delete = function(role) {
				http({
					method :'DELETE',
					url : '/applications/'+scope.application.id+'/roles/'+role.id
				})
				.then(function(response){
					notie.alert(1,'Role correctly deleted',1);
					scope.load();
				})
				.catch(function(response){
					notie.alert(3,'An error has occurred, role not deleted',1);
				});
			};
		
		}]);
}