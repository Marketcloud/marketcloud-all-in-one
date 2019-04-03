(function() {
	'use strict';

	function jsonToQueryString(json) {
		return '?' +
			Object.keys(json).map(function(key) {
				return encodeURIComponent(key) + '=' +
					encodeURIComponent(json[key]);
			}).join('&');
	}

	angular.module('DataDashboard')
		.factory('$marketcloud', MarketcloudFactory);

	MarketcloudFactory.$inject = ['$http', '$q', '$cache', '$account', '$application'];

	function MarketcloudFactory($http, $q, $cache, $account, $application) {



		var request = function(method, endpoint, data, options) {

			var role = $application.get('role');

			// Guests users cannot perform requests
			if (role === 'guest' && method !== "GET") {
				notie.alert(2,"Action not allowed since your role is 'guest'.",2);
				return;
			}

			var url = window.API_BASE_URL + '/' + endpoint;

			if ("GET" === method) {
				var cacheKey = endpoint + jsonToQueryString(data || {});
				// We invoke cache only for GET requests
				if ($cache.has(cacheKey)) {
					return $q.when($cache.get(cacheKey));
				}
			}
			var config = {
				method: method,
				url: url,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': window.public_key + ':' + window.token
				}
			};

			options = options || {};


			if ('GET' === method)
				config.params = data || {};
			else {

				config.data = data || {};
			}


			return $http(config)
				.then(function(response) {

					if ('GET' === method) {
						$cache.set(endpoint, response);
					}

					if ('PUT' === method || 'PATCH' === method) {
						// Devo invalidare la cache della risorsa e della collection
						// ex /resource/:id
						//  /resource/:id/subresources
						// /resource
						// Endpoint è qualcosa del tipo sopra,

						var deletionPattern = endpoint.split('/');
						deletionPattern = deletionPattern[0];
						$cache.delByPattern(deletionPattern); // Invalidating GET cache to this resource
					}

					if ('POST' === method) {
						$cache.delByPattern(endpoint); // Invalidating LIST requests to this resource
						//Also for parent resource
					}

					if ('DELETE' === method) {
						var deletionPattern = endpoint.split('/');
						deletionPattern = deletionPattern[0];
						$cache.delByPattern(deletionPattern); // Invalidating LIST requests to this resource
						//Also for parent resource
					}


					return $q.when(response);
				})
				.catch(function(error) {
					return $q.reject(error);
				})



		};


		var resourceFactory = function(resource_name) {
			return {
				list: function(query, options) {
					query = query || {};
					if ('object' !== typeof query)
						throw new Error('$marketcloud.' + resource_name + '.list(query) query must be object');
					return request('GET', resource_name, query, options);
				},
				getById: function(id, options) {
					if (isNaN(id))
						throw new Error('$marketcloud.' + resource_name + '.getById(id) id must be an integer number');
					return request('GET', resource_name + '/' + id, options);
				},
				save: function(data, options) {
					if ('object' !== typeof data)
						throw new Error('$marketcloud.' + resource_name + '.save(data) data must be object');
					return request('POST', resource_name, data, options);
				},
				update: function(id, data, options) {
					if (isNaN(id))
						throw new Error('$marketcloud.' + resource_name + '.update(id,data) id must be an integer number');
					return request('PUT', resource_name + '/' + id, data, options);
				},
				delete: function(id, options) {
					if (isNaN(id))
						throw new Error('$marketcloud.' + resource_name + '.delete(id) id must be an integer number');
					return request('DELETE', resource_name + '/' + id, options);
				}
			};
		};

		var subResourceFactory = function(resource_name, sub_resource_name) {
			return {
				list: function(parent_id, query, options) {
					query = query || {};
					if ('object' !== typeof query)
						throw new Error('$marketcloud.' + resource_name + '.' + sub_resource_name + '.list(query) query must be object');
					return request('GET', resource_name + '/' + parent_id + '/' + sub_resource_name, query, options);
				},
				getById: function(parent_id, id, options) {
					if (isNaN(id))
						throw new Error('$marketcloud.' + resource_name + '.' + sub_resource_name + '.getById(id) id must be an integer number');
					return request('GET', resource_name + '/' + parent_id + '/' + sub_resource_name + '/' + id, options);
				},
				save: function(parent_id, data, options) {
					if ('object' !== typeof data)
						throw new Error('$marketcloud.' + resource_name + '.' + sub_resource_name + '.save(data) data must be object, got '+typeof(data));
					return request('POST', resource_name + '/' + parent_id + '/' + sub_resource_name, data, options);
				},
				update: function(parent_id, id, data, options) {
					if (isNaN(id))
						throw new Error('$marketcloud.' + resource_name + '.' + sub_resource_name + '.update(id,data) id must be an integer number');
					return request('PUT', resource_name + '/' + parent_id + '/' + sub_resource_name + '/' + id, data, options);
				},
				delete: function(parent_id, id, options) {
					if (isNaN(id))
						throw new Error('$marketcloud.' + resource_name + '.' + sub_resource_name + '.delete(id) id must be an integer number');
					return request('DELETE', resource_name + '/' + parent_id + '/' + sub_resource_name + '/' + id, options);
				}
			};
		};

		var resources = [
			'addresses',
			'brands',
			'categories',
			'collections',
			'events',
			'coupons',
			'carts',
			'products',
			'orders',
			'invoices',
			'users',
			'contents',
			'staticContents',
			'media',
			'notifications',
			'promotions',
			'shippings',
			'payments',
			'taxes',
			'paymentMethods',
			'variables'

		];

		var factory = {};

		resources.forEach(function(resource_name) {
			factory[resource_name] = resourceFactory(resource_name);
		});

		factory.variants = subResourceFactory('products', 'variants');

		factory.refunds = subResourceFactory('orders', 'refunds');
		factory.payments = subResourceFactory('orders', 'payments');
		factory.shipments = subResourceFactory('orders', 'shipments');

		return factory;
	}
})();