var app = angular.module('DataDashboard');

app.controller('WebhooksController', ['$scope', '$http', '$location','webhooks',
	function(scope, http, location,webhooks) {
	
			
		scope.mode=null;

		scope.webhooks = [{
			event : 'products.create',
			method : 'POST',
			url : 'mybackend.herokuapp.com/newproduct',
			headers : {

			}
		}];


		scope.webhooks = webhooks.data.data;


		scope.events = [
			'products.create',
			'products.delete',
			'products.update',
			'brands.create',
			'brands.delete',
			'brands.update',
			'categories.create',
			'categories.delete',
			'categories.update',
			'orders.create',
			'orders.delete',
			'orders.update',
			'carts.create',
			'carts.delete',
			'carts.update',
			'payments.create',
			'payments.delete',
			'payments.update',
			'shippings.create',
			'shippings.delete',
			'shippings.update',
		];
		scope.load = function() {
			http({
				method : 'GET',
				url : '/applications/'+window.current_application.id+'/webhooks'
			})
				.then(function(response){
					scope.webhooks = response.data.data;
				})
				.catch(function(response){
					notie.alert(2,'An error has occurred while reloading webhooks.',1);
				});
		};

		scope.edit = function(hook) {
			scope.newWebhook = hook;
			scope.showUpdateModal();
		};
		scope.showUpdateModal = function() {
			scope.mode = 'update';
			$('#newWebhookModal').modal('show');
		};

		scope.showCreateModal = function() {
			scope.mode = 'create';
			$('#newWebhookModal').modal('show');
		};

		scope.saveWebhook = function() {
			http({
				method :'POST',
				url : '/applications/'+window.current_application.id+'/webhooks',
				data : scope.newWebhook
			})
				.then(function(response){
					notie.alert(1,'Webhook correctly created',1);
					scope.newWebhook = {};
					$('#newWebhookModal').modal('hide');
					scope.load();
				})
				.catch(function(response){
					notie.alert(3,'An error has occurred, webhook not created',1);
					scope.newWebhook = {};
				});
		};


		scope.updateWebhook = function() {
			http({
				method :'PUT',
				url : '/applications/'+window.current_application.id+'/webhooks/'+scope.newWebhook.id,
				data : scope.newWebhook
			})
				.then(function(response){
					notie.alert(1,'Webhook correctly updated',1);
					scope.newWebhook = {};
				})
				.catch(function(response){
					notie.alert(3,'An error has occurred, webhook not updated',1);
					scope.newWebhook = {};
				});
		};


		scope.delete = function(hook) {
			http({
				method :'DELETE',
				url : '/applications/'+window.current_application.id+'/webhooks/'+hook.id
			})
				.then(function(response){
					notie.alert(1,'Webhook correctly deleted',1);
					scope.load();
				})
				.catch(function(response){
					notie.alert(3,'An error has occurred, webhook not deleted',1);
				});
		};
		
	}]);