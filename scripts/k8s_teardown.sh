#!/usr/bin/env bash
set -e

CLUSTER_NAME="storage-plane"

echo "=========================================================="
echo " k8s-distributed-storage-plane: Kubernetes Teardown"
echo "=========================================================="

if kind get clusters 2>&1 | grep -q "^${CLUSTER_NAME}$"; then
    echo ">> Deleting Kind cluster '${CLUSTER_NAME}'..."
    kind delete cluster --name "${CLUSTER_NAME}"
    echo ">> Kind cluster deleted."
else
    echo ">> Kind cluster '${CLUSTER_NAME}' is not running."
fi

if [ "$1" == "--all" ] && command -v colima >/dev/null 2>&1; then
    echo ">> Stopping Colima runtime..."
    colima stop
    echo ">> Colima stopped."
fi

echo ">> Teardown complete."
