#!/usr/bin/env bash

echo "Starting jasmine tests for Marketcloud api. The API server should be in testing mode or tests will fail."
if [ "$#" -ne 1]
then
    echo "Illegal number of parameters. Usage:\n\n\ttest.sh URL \n\n"
    exit 1
fi

for file in ./test/*spec.js
do
echo $file
jasmine-node $file --config url $1
done
