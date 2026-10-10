#!/usr/bin/env bash
set -e

CLUSTER_NAME="storage-plane"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=========================================================="
echo " k8s-distributed-storage-plane: Multi-Node Kind Cluster"
echo " Engine: Colima + Kind on macOS Apple Silicon (M3 / arm64)"
echo "=========================================================="

# 1. Check & start Colima runtime
if command -v colima >/dev/null 2>&1; then
    if ! colima status >/dev/null 2>&1; then
        echo ">> Starting Colima runtime (4 CPUs, 4GB RAM, virtiofs)..."
        colima start --cpu 4 --memory 4 --vm-type=vz --mount-type=virtiofs
    else
        echo ">> Colima runtime is already running."
    fi
    # Ensure Docker CLI points to Colima socket if needed
    export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"
else
    echo ">> Note: Colima CLI not found. Falling back to default Docker daemon."
fi

# 2. Check Kind CLI
if ! command -v kind >/dev/null 2>&1; then
    echo ">> Error: 'kind' is not installed. Please install with: brew install kind"
    exit 1
fi

# 3. Create Multi-Node Kind Cluster
if kind get clusters 2>&1 | grep -q "^${CLUSTER_NAME}$"; then
    echo ">> Kind cluster '${CLUSTER_NAME}' already exists."
else
    echo ">> Creating 3-Node Kind Cluster from ${ROOT_DIR}/k8s/kind-config.yaml..."
    kind create cluster --config "${ROOT_DIR}/k8s/kind-config.yaml"
fi

# 4. Verify Nodes
echo ""
echo ">> Verifying Kubernetes Nodes:"
kubectl get nodes -o wide --show-labels

# 5. Apply CRDs
echo ""
echo ">> Registering Distributed Storage Custom Resource Definitions (CRDs)..."
kubectl apply -f "${ROOT_DIR}/k8s/crds/storagecluster.crd.yaml"
kubectl apply -f "${ROOT_DIR}/k8s/crds/storagevolume.crd.yaml"

# 6. Apply Sample Workloads
echo ""
echo ">> Applying Sample Cluster & Volume Claim Resources..."
kubectl apply -f "${ROOT_DIR}/k8s/examples/storagecluster-sample.yaml"
kubectl apply -f "${ROOT_DIR}/k8s/examples/storagevolume-sample.yaml"

echo ""
echo ">> Current Custom Resources:"
kubectl get distributedstorageclusters -A
kubectl get storagevolumeclaims -A

echo ""
echo "=========================================================="
echo ">> Multi-Node Setup Complete!"
echo ">> You can now start the Operator controller with:"
echo "   cd ${ROOT_DIR}/k8s/operator && npm start"
echo "=========================================================="
