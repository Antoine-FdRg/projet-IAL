#!/bin/bash

# Building docker image
echo "Begin: Building docker image ial/box-broker-client"
docker build -t "ial/box-broker-client" .
echo "Done: Building docker image ial/box-broker-client"
