#!/bin/bash

# Building docker image
echo "Begin: Building docker image ial/broker-setup-broker"
docker build -t "ial/broker-setup-broker" .
echo "Done: Building docker image ial/broker-setup-broker"
