#!/bin/bash

mongo -- <<EOF
var user = '$MONGO_INITDB_ROOT_USERNAME';
var passwd = '$MONGO_INITDB_ROOT_PASSWORD';
var admin = db.getSiblingDB('admin');
admin.auth(user, passwd);
use $MONGODB_DBNAME
db.init.insert({createdAt: "now"})
db.createUser({user: "$MONGODB_USERNAME", pwd: "$MONGODB_PASSWORD", roles: ["readWrite"]});
EOF