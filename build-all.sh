#!/bin/bash

function build_dir()  # $1 is the dir to get it
{
    depths=$(echo $1 | tr -cd '/' | wc -c)
    cd $1
    ./build.sh
    for ((i=0; i<=depths; i++)); do
        cd ..
    done
    echo "✔ Built $1"
}

echo "🔨 Building all"

build_dir "pipeline/broker"
build_dir "box/broker-client"
build_dir "pipeline/cleaner"
build_dir "pipeline/normalizer"

echo "✅ Built all"

