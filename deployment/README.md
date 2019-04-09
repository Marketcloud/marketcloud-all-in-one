# Marketcloud all in one

This is the open source version of the discontinued backend as a service [marketcloud](http://www.marketcloud.it)

## Getting started

First thigns first, clone the repository

```
git clone https://github.com/Marketcloud/marketcloud-all-in-one.git
cd marketcloud-all-in-one
cd deployment
```

At this point we need to create an env file in which we will populate the needed environment variables. The repository provide an example env file you can use as a template:

```
cp .env-example .env
```

Now open it with your favourite text editor

## Configuration
```
NODE_ENV=development

# Maketcloud API url
MARKETCLOUD_API_BASE_URL=http://api:5000
MARKETCLOUD_DASHBOARD_BASE_URL=http://localhost:8000

# MongoDB
MONGODB_DBNAME=marketcloud
MONGODB_HOSTNAME=mongodb
MONGODB_USERNAME=myuser
MONGODB_PASSWORD=mypass
MONGODB_PORT=27017
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=root
MONGO_INITDB_DATABASE=marketcloud

# MySQL
MYSQL_DATABASE=marketcloud
MYSQL_HOSTNAME=mysql
MYSQL_USER=myuser
MYSQL_PASSWORD=mypass
MYSQL_PORT=3306

# Redis
REDIS_HOSTNAME=redis
REDIS_PORT=6379


# RabbitMQ data for container initialization
RABBITMQ_DEFAULT_USER=myuser
RABBITMQ_DEFAULT_PASS=mypass
RABBITMQ_DEFAULT_VHOST= /

# RabbitMQ connection string for apps
RABBITMQ_CONNECTION_STRING=amqp://myuser:mypass@rabbitmq:5672

# MYSQL container env variables
MYSQL_ROOT_PASSWORD=mypassword

# Sendgrid
SENDGRID_KEY=mysendgridkey

# Organization
ORGANIZATION_EMAIL=test@example.com
ORGANIZATION_NAME=example

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=myaccount
AZURE_STORAGE_ACCOUNT_ACCESS_KEY=mykey
AZURE_STORAGE_CDN_BASE_URL=http://cdn.mysite.com
```

As you can see variables are quite self explainatory, just remembter that every one is required.

## Run

The recommended way to run everything is through docker-compose, if your server doesn't have it uou can read about how to install it [here](https://docs.docker.com/compose/).

```
docker-compose -p marketcloud up -d
```

The above command will take some time, doing the following things:
- download missing docker images
- build images for local projects (api, website, workers)
- build containers from images
- start everything
