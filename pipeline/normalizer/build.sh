#!/bin/bash

# Building docker image
echo "Begin: Building docker image ial/normalizer"
docker build -t "ial/normalizer" .
echo "Done: Building docker image ial/normalizer"
