#!/bin/bash

# Building docker image
echo "Begin: Building docker image ial/outlier-filter"
docker build -t "ial/outlier-filter" .
echo "Done: Building docker image ial/outlier-filter"
