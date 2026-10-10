#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " k8s-distributed-storage-plane: Quickstart Bootstrap (M3)"
echo "=========================================================="

MODE=${1:-demo}

if [ "$MODE" == "demo" ]; then
    echo ">> Launching Zero-Dependency UI Demo Mode (Client Simulator)..."
    echo ">> This mode requires no Docker, Kafka, or Kubernetes."
    cd client
    if [ ! -d "node_modules" ]; then
        echo ">> Installing client dependencies..."
        npm install
    fi
    echo ">> Starting React Dashboard on http://localhost:3000..."
    npm start

elif [ "$MODE" == "full" ]; then
    echo ">> Launching Full-Stack Infrastructure with Docker Compose..."
    docker-compose up --build

elif [ "$MODE" == "k8s" ]; then
    echo ">> Provisioning Multi-Node Kubernetes Cluster via Colima & Kind..."
    ./scripts/k8s_setup.sh
    ./deploy.sh

else
    echo "Usage: ./quickstart.sh [demo|full|k8s]"
    echo "  demo  - (Default) Starts standalone UI with in-browser mock engine"
    echo "  full  - Starts Docker Compose stack (Zookeeper, Kafka, Mongo, API, UI)"
    echo "  k8s   - Sets up Colima 3-node Kind cluster and deploys CRDs & Operator"
    exit 1
fi
