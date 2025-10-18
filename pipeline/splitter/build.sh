#!/bin/bash

# Building docker image
echo "Begin: Building docker image ial/splitter"
docker build -t "ial/splitter" .
echo "Done: Building docker image ial/splitter"
