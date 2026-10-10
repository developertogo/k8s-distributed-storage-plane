# k8s-distributed-storage-plane: System Architecture

A comprehensive technical deep-dive covering **Kubernetes Operators, CSI Plugins, Apache Kafka, Distributed Storage Architecture, C3.js Data Visualization, Full-Stack Management Planes, and macOS M3 Emulation**.

---

## Table of Contents
1. [Distributed Storage & AI Workload Fundamentals](#1-distributed-storage--ai-workload-fundamentals)
2. [Container Storage Interface (CSI) Architecture](#2-container-storage-interface-csi-architecture)
3. [Kubernetes Storage Operator & Reconciliation Loops](#3-kubernetes-storage-operator--reconciliation-loops)
4. [Kafka Telemetry Streaming & WebSocket Pipeline](#4-kafka-telemetry-streaming--websocket-pipeline)
5. [Storage Performance Calculations (Python Notation)](#5-storage-performance-calculations-python-notation)
6. [Node.js Async Module Orchestration Patterns](#6-nodejs-async-module-orchestration-patterns)
7. [Frontend Architecture & C3.js (c3j) Visualization Suite](#7-frontend-architecture--c3js-c3j-visualization-suite)
8. [Zero-Dependency Mock Engine & Standalone Demo](#8-zero-dependency-mock-engine--standalone-demo)
9. [macOS M3 (24GB) Local Emulation & Multi-Node Setup](#9-macos-m3-24gb-local-emulation--multi-node-setup)

---

## 1. Distributed Storage & AI Workload Fundamentals

Distributed storage systems pool physical NVMe drives, SSDs, and storage nodes across high-speed interconnects (RoCE / InfiniBand / PCIe Gen5) to present unified block, file, or object volumes to compute workloads.

### AI/ML Workload I/O Characteristics
* **Training Dataset Ingestion (Read-Heavy):** Massive concurrent sequential and random reads streaming training samples directly to accelerator memory.
* **Model Checkpointing (Burst Write-Heavy):** Synchronous write bursts saving model weights, optimizer states, and gradients across hundreds of compute nodes simultaneously.
* **Direct Storage Bypass:** Direct data paths bypass CPU host memory to transfer data directly between NVMe storage fabrics and accelerator buffers.

---

## 2. Container Storage Interface (CSI) Architecture

The **Container Storage Interface (CSI)** is an industry-standard specification enabling container orchestrators to interact with arbitrary storage backends via standardized gRPC services.

```
Kubernetes API / PVC Controller
            │
            ▼
┌────────────────────────────────────────────────────────┐
│                   CSI Controller Plugin                │
│  - CreateVolume (Provision storage allocation)         │
│  - DeleteVolume (De-provision / reclaim disk)          │
│  - ControllerPublishVolume (Attach volume to node)     │
│  - ControllerUnpublishVolume (Detach volume from node) │
│  - CreateSnapshot / DeleteSnapshot                     │
└───────────────────────────┬────────────────────────────┘
                            │ gRPC / Storage Fabric
                            ▼
┌────────────────────────────────────────────────────────┐
│                      CSI Node Plugin                   │
│  (Runs as a DaemonSet on every compute / worker node)  │
│  - NodeStageVolume (Format & mount to global dir)      │
│  - NodePublishVolume (Bind-mount into container path)  │
│  - NodeUnpublishVolume (Unmount from container)        │
│  - NodeGetVolumeStats (Report live IOPS & capacity)    │
└────────────────────────────────────────────────────────┘
```

### The 3 Core CSI Services
1. **Identity Service:** `GetPluginInfo()`, `GetPluginCapabilities()`, `Probe()`.
2. **Controller Service:** `CreateVolume()`, `DeleteVolume()`, `ValidateVolumeCapabilities()`, `ControllerPublishVolume()`.
3. **Node Service:** `NodeStageVolume()`, `NodePublishVolume()`, `NodeUnpublishVolume()`, `NodeGetVolumeStats()`.

---

## 3. Kubernetes Storage Operator & Reconciliation Loops

A **Kubernetes Operator** encodes operational domain knowledge into automated software controllers using Custom Resource Definitions (CRDs).

```
 ┌──────────────────────────────────────────────────────────────┐
 │                      Kubernetes Operator                     │
 │                                                              │
 │   1. OBSERVE              2. ANALYZE           3. ACT        │
 │  ┌──────────┐            ┌───────────┐       ┌────────────┐  │
 │  │ Watch    │            │ Compare   │       │ Update K8s │  │
 │  │ CRDs &   ├───────────►│ Desired   ├──────►│ Status &   │  │
 │  │ Pods     │            │ vs Actual │       │ Heal Nodes │  │
 │  └──────────┘            └───────────┘       └────────────┘  │
 └──────────────────────────────────────────────────────────────┘
```

---

## 4. Kafka Telemetry Streaming & WebSocket Pipeline

```
 ┌─────────────────────────────────┐
 │   Storage Nodes & AI Simulator  │
 └────────────────┬────────────────┘
                  │ High-Cadence Telemetry Stream
                  ▼
 ┌────────────────────────────────────────────────────────┐
 │                      Apache Kafka                      │
 │  - Topic: 'storage-telemetry' (IOPS, GB/s, Latency)   │
 │  - Topic: 'volume-events'     (CSI lifecycle events)   │
 │  - Topic: 'cluster-alerts'    (Drive SMART alerts)     │
 └────────────────────────┬───────────────────────────────┘
                          │ Consumer Group
                          ▼
 ┌────────────────────────────────────────────────────────┐
 │            Node.js Management API Gateway              │
 │  - Kafka Consumer processes streaming batches          │
 │  - Buffers and writes historical snapshots to MongoDB  │
 │  - Emits real-time payloads via WebSocket Server (ws)  │
 └────────────────────────┬───────────────────────────────┘
                          │ WebSocket Frame Push
                          ▼
 ┌────────────────────────────────────────────────────────┐
 │         React Client + C3.js (c3j) Time-Series         │
 │  - Dynamic .flow() / .load() real-time charts          │
 └────────────────────────────────────────────────────────┘
```

---

## 5. Storage Performance Calculations (Python Notation)

```python
# 1. Aggregate Bandwidth / Throughput (in GB/s)
throughput_GBps = (iops * block_size_KB) / (1024 * 1024)

# 2. Total I/O Service Time & Latency (microseconds)
total_latency_us = queue_time_us + service_time_us

# 3. P99 (99th Percentile) Latency from Sample Array
sorted_latencies = sorted(latency_samples)
p99_index = int(len(sorted_latencies) * 0.99)
latency_p99_us = sorted_latencies[p99_index]

# 4. Storage Pool Capacity Utilization Ratio
utilization_ratio = used_capacity_bytes / total_capacity_bytes
available_capacity_GB = (total_capacity_bytes - used_capacity_bytes) / (1024 ** 3)

# 5. Direct Storage Efficiency (accounting for interconnect & PCIe overhead)
effective_direct_bandwidth_GBps = raw_nvme_bandwidth_GBps * (1.0 - interconnect_overhead_factor)
```

---

## 6. Node.js Async Module Orchestration Patterns

The backend uses the standard `async` library for complex multi-step distributed operations:

* **`async.waterfall`**: Sequential workflows (validate quota $\rightarrow$ allocate storage chunk $\rightarrow$ invoke CSI $\rightarrow$ save metadata).
* **`async.parallel`**: Concurrent non-dependent health checks across storage nodes.
* **`async.queue`**: Worker task queues with concurrency limits for batch volume migrations.

---

## 7. Frontend Architecture & C3.js (c3j) Visualization Suite

The dashboard features **4 interactive C3.js charts** powered by C3's live `.flow()` and `.load()` dynamic streaming API:

1. **Dual-Axis Throughput (GB/s) & P99 Latency (Spline):** Primary Y-axis (`read_bandwidth_GBps`, `write_bandwidth_GBps`) and Secondary Y2-axis (`latency_p99_us`).
2. **Read vs. Write IOPS Dynamics (Area-Spline):** Shows ingestion reads vs checkpoint writes.
3. **Storage Pool Tiering & Capacity Allocation (Donut):** NVMe direct tier vs SSD shared tier vs free space.
4. **Storage Node Queue Depth & Latency Breakdown (Grouped Bar):** NVMe queue depth and service latency per node.

---

## 8. Zero-Dependency Mock Engine & Standalone Demo

* **In-Browser Simulator (`mockTelemetryService.js`):** Generates 1-second cadence telemetry pulses, AI training bursts, and simulated K8s operator events in memory.
* **GitHub Pages Ready:** Build standalone static bundle (`npm run build` in `client/`) to host online or record video walkthroughs without background containers.

---

## 9. macOS M3 (24GB) Local Emulation & Multi-Node Setup

### Multi-Node Cluster Configuration (Colima + Kind)

```bash
# 1. Start Colima runtime with 4 CPUs and 4GB RAM
colima start --cpu 4 --memory 4

# 2. Create multi-node Kind cluster
kind create cluster --name storage-plane --config=- <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
EOF

# 3. Verify all 3 nodes are Ready
kubectl get nodes
```
