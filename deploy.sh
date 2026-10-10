#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " k8s-distributed-storage-plane: Kubernetes Deploy Script"
echo "=========================================================="

echo ">> Registering Custom Resource Definitions (CRDs)..."
kubectl apply -f k8s/crds/storagecluster.crd.yaml
kubectl apply -f k8s/crds/storagevolume.crd.yaml

echo ">> Verifying CRD Registration..."
kubectl get crd distributedstorageclusters.storage.dgx.nvidia.com
kubectl get crd storagevolumeclaims.storage.dgx.nvidia.com

echo ">> Sample CRD manifest verification complete."
echo ">> You can now run the Operator Reconciler: node k8s/operator/controller.js"
