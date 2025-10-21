#!/bin/bash

# Building docker image
echo "Begin: Building docker image ial/cleaner"
docker build -t "ial/cleaner" .
echo "Done: Building docker image ial/cleaner"
