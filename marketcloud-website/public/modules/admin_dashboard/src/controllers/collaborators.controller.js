module.exports = function(app) {
	app.controller('CollaboratorsController', ['$scope', '$http', 'collaborators','application','$rootScope',
		function(scope, http, collaborators, application,$rootScope) {
	
			
			$rootScope.application = application;
		
			scope.mode=null;

			scope.application = application;
			scope.collaborators = collaborators.data.data;


			$rootScope.$broadcast('$dashboardSectionChange',{section : "collaborators"});
			
			scope.load = function() {
				http({
					method : 'GET',
					url : '/applications/'+scope.application.id+'/collaborators'
				})
				.then(function(response){
					scope.collaborators = response.data.data;
				})
				.catch(function(response){
					notie.alert(2,'An error has occurred while reloading collaborators.',1);
				});
			};

			/*scope.edit = function(collaborator) {
				scope.newCollaborator = collaborator;
				scope.showUpdateModal();
			};
			scope.showUpdateModal = function() {
				scope.mode = 'update';
				$('#newCollaboratorModal').modal('show');
			};*/

			scope.showCreateModal = function() {
				scope.mode = 'create';
				$('#newCollaboratorModal').modal('show');
			};

			scope.saveCollaborator = function() {
				http({
					method :'POST',
					url : '/applications/'+scope.application.id+'/collaborators',
					data : scope.newCollaborator
				})
				.then(function(response){
					notie.alert(1,'Collaborator correctly created',1.5);
					scope.newCollaborator = {};
					$('#newCollaboratorModal').modal('hide');
					scope.load();
				})
				.catch(function(response){
					notie.alert(3,'An error has occurred, collaborator not created',1.5);
					scope.newCollaborator = {};
				});
			};



			scope.updateCollaborator = function(collaborator) {
				http({
					method :'PUT',
					url : '/applications/'+scope.application.id+'/collaborators/'+collaborator.email,
					data : {role : collaborator.role}
				})
				.then(function(response){
					notie.alert(1,'Collaborator correctly updated',1);
				})
				.catch(function(response){
					notie.alert(3,'An error has occurred, collaborator not updated',1);
					scope.newCollaborator = {};
				});
			}


			scope.delete = function(collaborator) {
				http({
					method :'DELETE',
					url : '/applications/'+scope.application.id+'/collaborators/'+collaborator.email
				})
				.then(function(response){
					notie.alert(1,'Collaborator correctly deleted',1);
					scope.load();
				})
				.catch(function(response){
					notie.alert(3,'An error has occurred, collaborator not deleted',1);
				});
			};
		
		}]);
}