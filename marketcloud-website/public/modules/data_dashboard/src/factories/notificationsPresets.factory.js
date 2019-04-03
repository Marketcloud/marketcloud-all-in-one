(function() {
	'use strict';

	angular.module('DataDashboard')
		.factory('NotificationsPresetsFactory', NotificationsPresetsFactory);

	function NotificationsPresetsFactory() {


		var presets = {};

		presets['invoices.create'] = {
			name: 'An order is created',
			description: 'This notification is sent to the customer who creates an order',
			subject: 'Your invoice',
			locales : {},
			template: {
				title: 'Your invoice',
				message: 'Attached to this email you can find your most recent invoice for your order at {{application.name}}'
			}
		};

		presets['orders.create'] = {
			name: 'An order is created',
			description: 'This notification is sent to the customer who creates an order',
			subject: 'We received your order!',
			locales : {},
			template: {
				title: 'Thank you for your order!',
				introduction: 'Your order has been received and is now being processed. Your order\'s details are shown below for your reference.',
				productLabel: 'Items',
				priceLabel: 'Price',
				customerInformationLabel: 'Customer information',
				shippingAddressLabel: 'Shipping address',
				billingAddressLabel: 'Billing address'
			}
		};

		presets['users.create'] = {
			name: 'New customer account',
			description: 'This notification is sent to the customer who creates an account',
			subject: 'Welcome!',
			locales : {},
			template: {
				title: 'Welcome to {{application.name}}!',
				introduction: 'Thank you for creating an account with us!',
				buttonLabel: 'Visit our store'
			}
		};

		presets['users.recoverPassword'] = {
			name: 'Password recovery',
			description: 'This notification is sent to the customer who requests a password recovery',
			subject: 'Password recovery',
			locales : {},
			template: {
				title: 'Recover your password',
				introduction: 'Hello, we sent you this email because you requested to recover your password. If it\'s not the case, please ignore this email.',
				redirect_url : 'http://example.com/passwordrecovery'
			}
		};


		presets['orders.update.processing'] = {
			name: 'An order is paid',
			description: 'This notification is sent to the customer who paid an order',
			subject: 'Your order is confirmed!',
			locales : {},
			template: {
				title: 'Thank you for your order!',
				introduction: 'Your order has been confirmed and is now being processed. Your order\'s details are shown below for your reference.',
				productLabel: 'Items',
				priceLabel: 'Price',
				customerInformationLabel: 'Customer information',
				shippingAddressLabel: 'Shipping address',
				billingAddressLabel: 'Billing address'
			}
		};

		presets['orders.update.completed'] = {
			name: 'An order is shipped',
			description: 'This notification is sent to the customer when his/her order is shipped.',
			subject: 'We shipped your order!',
			locales : {},
			template: {
				title: 'Your order is on the way',
				introduction: 'We are happy to inform you that we shipped your order #{{order.id}} !',
				tracking_code_introduction: 'You can click on the following tracking number to track your package on the carrier\'s website.',
				productLabel: 'Items',
				priceLabel: 'Price',
				customerInformationLabel: 'Customer information',
				shippingAddressLabel: 'Shipping address',
				billingAddressLabel: 'Billing address'
			}
		};

		presets['orders.refund'] = {
			name: 'An order is refunded',
			description: 'This notification is sent to the customer when his/her order is refunded.',
			subject: 'Refund for order {{order.id}}',
			locales : {},
			template: {
				title: 'Refund for order {{order.id}}',
				introduction: 'A refund was recently created for your order. Details are shown below for your reference.',
				productLabel: 'Items'
			}
		};


		return presets;
	}
})();