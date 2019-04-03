# ************************************************************
# Sequel Pro SQL dump
# Version 4541
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 5.7.22)
# Database: marketcloud
# Generation Time: 2019-03-18 22:51:25 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE IF NOT EXISTS `marketcloud`;

# Dump of table accounts
# ------------------------------------------------------------

DROP TABLE IF EXISTS `accounts`;

CREATE TABLE `accounts` (
  `email` varchar(254) NOT NULL,
  `password` varchar(254) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activation_code` varchar(254) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '0',
  `full_name` varchar(254) DEFAULT '',
  `company_name` varchar(254) DEFAULT '',
  `city` varchar(254) DEFAULT '',
  `address` varchar(254) DEFAULT '',
  `postal_code` varchar(254) DEFAULT '',
  `vat` varchar(254) DEFAULT '',
  `country` varchar(254) DEFAULT '',
  `image_url` varchar(500) DEFAULT 'https://marketcloudstatic01.blob.core.windows.net/images/user.png',
  `stripe_customer_id` varchar(50) DEFAULT NULL,
  `metadata` text,
  PRIMARY KEY (`email`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table addresses
# ------------------------------------------------------------

DROP TABLE IF EXISTS `addresses`;

CREATE TABLE `addresses` (
  `full_name` varchar(255) DEFAULT NULL,
  `id` bigint(20) unsigned NOT NULL,
  `address1` varchar(255) DEFAULT NULL,
  `address2` varchar(45) DEFAULT NULL,
  `city` varchar(80) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `postal_code` varchar(45) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `alternate_phone_number` varchar(255) DEFAULT NULL,
  `application_id` bigint(10) unsigned NOT NULL,
  `email` varchar(254) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `vat` varchar(60) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_addresses_applications_idx` (`application_id`),
  KEY `fk_addresses_users_idx` (`user_id`),
  CONSTRAINT `fk_addresses_applications` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table api_keys
# ------------------------------------------------------------

DROP TABLE IF EXISTS `api_keys`;

CREATE TABLE `api_keys` (
  `application_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `publicKey` varchar(80) NOT NULL,
  `secretKey` varchar(80) NOT NULL,
  `issued_by` varchar(80) NOT NULL,
  `access` varchar(45) NOT NULL DEFAULT 'read',
  `name` varchar(80) NOT NULL DEFAULT 'DEFAULT_KEY',
  `is_master` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`application_id`,`publicKey`),
  UNIQUE KEY `publicKey_UNIQUE` (`publicKey`),
  KEY `fk_api_keys_owners_idx` (`issued_by`),
  CONSTRAINT `fk_keys_applications` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table applications
# ------------------------------------------------------------

DROP TABLE IF EXISTS `applications`;

CREATE TABLE `applications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(90) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `owner` varchar(254) NOT NULL,
  `url` varchar(254) DEFAULT NULL,
  `status` varchar(45) NOT NULL DEFAULT 'active',
  `plan_name` varchar(255) NOT NULL DEFAULT 'free',
  `api_calls_quota_left` int(5) NOT NULL DEFAULT '5000',
  `api_calls_quota_max` int(5) NOT NULL DEFAULT '5000',
  `renew_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `blocked` bit(1) NOT NULL DEFAULT b'0',
  `public_key` varchar(254) NOT NULL,
  `secret_key` varchar(254) NOT NULL,
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `show_prices_plus_taxes` tinyint(1) DEFAULT '0',
  `apply_discounts_before_taxes` tinyint(1) DEFAULT '0',
  `tax_type` enum('nothing','products_only','shipping_only','all') NOT NULL DEFAULT 'nothing',
  `currency_code` varchar(4) NOT NULL DEFAULT 'EUR',
  `timezone` varchar(40) NOT NULL DEFAULT 'GMT Standard Time',
  `email_address` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT 'https://www.marketcloud.it/img/logo/normal.png',
  `stripe_subscription_id` varchar(50) DEFAULT NULL,
  `storage_max` int(10) unsigned NOT NULL DEFAULT '524288',
  `storage_left` int(10) unsigned NOT NULL DEFAULT '524288',
  `locales` varchar(500) NOT NULL DEFAULT '',
  `company_name` varchar(254) DEFAULT '',
  `company_address` varchar(254) DEFAULT '',
  `company_postalcode` varchar(254) DEFAULT '',
  `company_city` varchar(254) DEFAULT '',
  `company_state` varchar(254) DEFAULT '',
  `company_country` varchar(254) DEFAULT '',
  `company_taxid` varchar(254) DEFAULT '',
  `currencies` text,
  `storm_version` varchar(10) DEFAULT '1.0.0',
  `invoices_prefix` varchar(50) DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `fk_applications_accounts_idx` (`owner`),
  KEY `public_key_index` (`public_key`),
  CONSTRAINT `fk_applications_accounts` FOREIGN KEY (`owner`) REFERENCES `accounts` (`email`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table applications_users
# ------------------------------------------------------------

DROP TABLE IF EXISTS `applications_users`;

CREATE TABLE `applications_users` (
  `email` varchar(254) NOT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  `role` varchar(254) DEFAULT 'editor',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`,`application_id`),
  KEY `fk_applications_users` (`application_id`),
  CONSTRAINT `fk_applications_users` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table brands
# ------------------------------------------------------------

DROP TABLE IF EXISTS `brands`;

CREATE TABLE `brands` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `description` text,
  `image_url` varchar(500) DEFAULT NULL,
  `url` varchar(120) DEFAULT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `name_index` (`name`),
  KEY `fk_brands_applications_idx` (`application_id`),
  CONSTRAINT `fk_brands_applications` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table categories
# ------------------------------------------------------------

DROP TABLE IF EXISTS `categories`;

CREATE TABLE `categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `description` text,
  `image_url` varchar(500) DEFAULT NULL,
  `url` varchar(120) DEFAULT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `path` varchar(512) NOT NULL DEFAULT '/',
  PRIMARY KEY (`id`),
  KEY `name_index` (`name`),
  KEY `fk_categories_categories_idx` (`parent_id`),
  KEY `fk_categories_applications_idx` (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table collaborators
# ------------------------------------------------------------

DROP TABLE IF EXISTS `collaborators`;

CREATE TABLE `collaborators` (
  `email` varchar(254) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `application_id` bigint(20) unsigned NOT NULL,
  `role` varchar(254) DEFAULT 'editor',
  PRIMARY KEY (`email`,`application_id`),
  KEY `fk_collaborators_applications` (`application_id`),
  CONSTRAINT `fk_collaborators_applications` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table collections
# ------------------------------------------------------------

DROP TABLE IF EXISTS `collections`;

CREATE TABLE `collections` (
  `id` bigint(20) unsigned NOT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(80) DEFAULT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  KEY `fk_collections_applications_idx` (`application_id`),
  CONSTRAINT `fk_collections_applications` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table currencies
# ------------------------------------------------------------

DROP TABLE IF EXISTS `currencies`;

CREATE TABLE `currencies` (
  `id` bigint(20) unsigned NOT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(80) NOT NULL,
  `formatting` varchar(80) DEFAULT '{{amount}}',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table id_store
# ------------------------------------------------------------

DROP TABLE IF EXISTS `id_store`;

CREATE TABLE `id_store` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `stub` char(1) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `stub` (`stub`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;



# Dump of table inventory
# ------------------------------------------------------------

DROP TABLE IF EXISTS `inventory`;

CREATE TABLE `inventory` (
  `product_id` bigint(20) unsigned NOT NULL,
  `variant_id` bigint(20) unsigned NOT NULL DEFAULT '0',
  `stock_level` int(11) DEFAULT NULL,
  `stock_type` varchar(10) NOT NULL DEFAULT 'infinite',
  `stock_status` varchar(20) DEFAULT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`product_id`,`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table orders
# ------------------------------------------------------------

DROP TABLE IF EXISTS `orders`;

CREATE TABLE `orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `store_id` bigint(20) unsigned DEFAULT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  `shipping_address_id` bigint(20) unsigned NOT NULL,
  `billing_address_id` bigint(20) unsigned NOT NULL,
  `shipment_state` varchar(45) DEFAULT NULL,
  `payment_state` varchar(45) DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `currency_id` bigint(20) unsigned DEFAULT NULL,
  `total` decimal(6,2) unsigned NOT NULL,
  `display_total` varchar(45) DEFAULT NULL,
  `items_total` decimal(6,2) unsigned NOT NULL,
  `display_items_total` varchar(45) DEFAULT NULL,
  `state` varchar(45) DEFAULT 'created',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_orders_stores` (`store_id`),
  KEY `fk_orders_applications` (`application_id`),
  KEY `fk_orders_billing_address` (`billing_address_id`),
  KEY `fk_orders_shipping_address` (`shipping_address_id`),
  KEY `fk_orders_users` (`user_id`),
  KEY `fk_orders_currencies` (`currency_id`),
  CONSTRAINT `fk_orders_applications` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`),
  CONSTRAINT `fk_orders_billing_address` FOREIGN KEY (`billing_address_id`) REFERENCES `addresses` (`id`),
  CONSTRAINT `fk_orders_currencies` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `fk_orders_shipping_address` FOREIGN KEY (`shipping_address_id`) REFERENCES `addresses` (`id`),
  CONSTRAINT `fk_orders_stores` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`),
  CONSTRAINT `fk_orders_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table products
# ------------------------------------------------------------

DROP TABLE IF EXISTS `products`;

CREATE TABLE `products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `category_id` bigint(20) unsigned DEFAULT NULL,
  `brand_id` bigint(20) unsigned DEFAULT NULL,
  `store_id` bigint(20) unsigned DEFAULT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `description` text,
  `price` decimal(13,4) NOT NULL,
  `published` bit(1) NOT NULL DEFAULT b'0',
  `sku` varchar(45) DEFAULT NULL,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `stock_level` int(11) DEFAULT NULL,
  `stock_status` varchar(10) DEFAULT NULL,
  `stock_type` varchar(10) NOT NULL DEFAULT 'infinite',
  PRIMARY KEY (`id`),
  KEY `fk_products_brands_idx` (`brand_id`),
  KEY `fk_products_categories_idx` (`category_id`),
  KEY `fk_products_stores_idx` (`store_id`),
  KEY `fk_products_applications_idx` (`application_id`),
  CONSTRAINT `fk_products_applications` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_products_brands` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_products_categories` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_products_stores` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table products_in_collection
# ------------------------------------------------------------

DROP TABLE IF EXISTS `products_in_collection`;

CREATE TABLE `products_in_collection` (
  `collection_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`collection_id`,`product_id`),
  KEY `fk_products_in_collection_idx` (`product_id`),
  CONSTRAINT `fk_products_in_collection_collection` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_products_in_collection_products` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table products_in_orders
# ------------------------------------------------------------

DROP TABLE IF EXISTS `products_in_orders`;

CREATE TABLE `products_in_orders` (
  `product_id` bigint(20) unsigned NOT NULL,
  `order_id` bigint(20) unsigned NOT NULL,
  `quantity` smallint(5) unsigned DEFAULT NULL,
  `price` decimal(6,2) NOT NULL,
  PRIMARY KEY (`product_id`,`order_id`),
  KEY `fk_order_idx` (`order_id`),
  CONSTRAINT `fk_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table taxes
# ------------------------------------------------------------

DROP TABLE IF EXISTS `taxes`;

CREATE TABLE `taxes` (
  `id` bigint(20) unsigned NOT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(80) DEFAULT NULL,
  `description` text,
  `rate` decimal(4,2) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_taxes_applications_idx` (`application_id`),
  CONSTRAINT `fk_taxes_applications` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table users
# ------------------------------------------------------------

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `name` varchar(45) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `application_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `role` varchar(254) NOT NULL DEFAULT 'user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_index` (`email`,`application_id`),
  KEY `fk_users_applications_idx` (`application_id`),
  CONSTRAINT `fk_users_applications` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
