#!/bin/bash
set -Eeuo pipefail

export DOCKER_BUILDKIT=${DOCKER_BUILDKIT:-1}
export BUILDKIT_PROGRESS=${BUILDKIT_PROGRESS:-plain}

components=(
    "box/broker"
    "box/broker-client"
    "box/cleaner"
    "box/normalizer"
    "box/outlier-filter"
    "box/uploader"
    "save-service"
    "family-notification-service"
    "analyze-service"
    "box/gatt-server"
    "devices/mock-watch"
)

build_dir() {
    local dir="$1"
    echo "🔨 Building $dir"
    if [[ ! -x "$dir/build.sh" ]]; then
        echo "❌ '$dir/build.sh' introuvable ou non exécutable"
        exit 1
    fi
    # Exécuter dans un sous-shell pour ne pas salir le CWD et échouer si erreur
    ( cd "$dir" && ./build.sh )
}

echo "🔨 Building all docker images 🔨"
for d in "${components[@]}"; do
    build_dir "$d"
done
echo "✅ Built all docker images ✅"