/**
 * k8s-distributed-storage-plane: Zero-Dependency Mock Telemetry & Cluster Engine
 * In-browser simulator for 100% standalone GitHub Pages demo hosting & screen recording.
 * Generates dynamic 1-second cadence telemetry pulses, AI training checkpoint spikes,
 * and K8s CRD reconciliation logs.
 */

// Storage Performance Formulas (Python Notation Reference):
// throughput_GBps = (iops * block_size_KB) / (1024 * 1024)
// direct_storage_bandwidth_GBps = raw_nvme_bandwidth_GBps * (1.0 - interconnect_overhead_factor)
// latency_p99_us = sorted_latencies[int(len(sorted_latencies) * 0.99)]
// utilization_ratio = used_capacity_bytes / total_capacity_bytes

class MockTelemetryService {
  constructor() {
    this.listeners = new Set();
    this.operatorLogListeners = new Set();
    this.timer = null;
    this.isBurstActive = false;
    this.burstRemainingTicks = 0;
    this.tickCount = 0;

    this.clusterState = {
      name: 'dgx-storage-cluster-prod',
      tier: 'direct-nvme',
      fabric: 'RoCE-v2',
      state: 'Healthy',
      activeNodes: 3,
      totalCapacityGB: 620000,
      allocatedCapacityGB: 245000,
      throughputGBps: 48.6,
      p99LatencyUs: 142.5
    };

    this.nodes = [
      { id: 'dgx-node-01', status: 'Ready', nvmeSlots: 8, queueDepth: 14, latencyUs: 112 },
      { id: 'dgx-node-02', status: 'Ready', nvmeSlots: 8, queueDepth: 19, latencyUs: 148 },
      { id: 'dgx-node-03', status: 'Ready', nvmeSlots: 8, queueDepth: 11, latencyUs: 98 }
    ];

    this.volumes = [
      {
        id: 'vol-dgx-nvme-9921',
        name: 'pytorch-checkpoint-vol',
        sizeGB: 2000,
        storagePool: 'nvme-direct-pool',
        directStorageEnabled: true,
        attachedNode: 'dgx-node-01',
        phase: 'Bound',
        mountPath: '/mnt/checkpoints',
        iopsLimit: 450000,
        bandwidthGBps: 27.5,
        createdAt: '1 hour ago'
      },
      {
        id: 'vol-dgx-ssd-4103',
        name: 'dataset-imagenet-cache',
        sizeGB: 8000,
        storagePool: 'ssd-shared-pool',
        directStorageEnabled: false,
        attachedNode: 'dgx-node-02',
        phase: 'Bound',
        mountPath: '/mnt/datasets/imagenet',
        iopsLimit: 180000,
        bandwidthGBps: 11.2,
        createdAt: '2 hours ago'
      },
      {
        id: 'vol-dgx-nvme-7740',
        name: 'llama3-70b-weights',
        sizeGB: 14500,
        storagePool: 'nvme-direct-pool',
        directStorageEnabled: true,
        attachedNode: 'dgx-node-03',
        phase: 'Bound',
        mountPath: '/mnt/models/llama3-70b',
        iopsLimit: 520000,
        bandwidthGBps: 32.5,
        createdAt: '3 hours ago'
      },
      {
        id: 'vol-dgx-nvme-3312',
        name: 'megatron-tensor-shards',
        sizeGB: 6400,
        storagePool: 'nvme-direct-pool',
        directStorageEnabled: true,
        attachedNode: 'dgx-node-01',
        phase: 'Bound',
        mountPath: '/mnt/distributed/shards',
        iopsLimit: 480000,
        bandwidthGBps: 29.8,
        createdAt: '4 hours ago'
      },
      {
        id: 'vol-dgx-nvme-5519',
        name: 'kv-cache-paged-attention',
        sizeGB: 3800,
        storagePool: 'nvme-direct-pool',
        directStorageEnabled: true,
        attachedNode: 'dgx-node-02',
        phase: 'Bound',
        mountPath: '/mnt/kvcache',
        iopsLimit: 475000,
        bandwidthGBps: 29.1,
        createdAt: '5 hours ago'
      }
    ];

    this.operatorLogs = [
      { timestamp: new Date(Date.now() - 15000).toLocaleTimeString(), type: 'reconcile', message: 'Reconciler cycle completed: All 3 nodes Ready, NVMe-oF multipath verified.' },
      { timestamp: new Date(Date.now() - 10000).toLocaleTimeString(), type: 'csi', message: 'CSI NodePublishVolume bound /mnt/checkpoints via DirectStorage on dgx-node-01.' },
      { timestamp: new Date(Date.now() - 5000).toLocaleTimeString(), type: 'csi', message: 'CSI Controller staged volume llama3-70b-weights on dgx-node-03 over RoCEv2.' },
      { timestamp: new Date().toLocaleTimeString(), type: 'reconcile', message: 'CRD Watcher sync: DistributedStorageCluster dgx-storage-cluster-prod status Healthy.' }
    ];

    this.startStreaming();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeOperatorLogs(callback) {
    this.operatorLogListeners.add(callback);
    callback(this.operatorLogs);
    return () => this.operatorLogListeners.delete(callback);
  }

  triggerAiCheckpointBurst(durationSeconds = 8) {
    this.isBurstActive = true;
    this.burstRemainingTicks = durationSeconds;
    this.addOperatorLog('burst', `⚠️ AI Training Checkpoint Burst detected! Synchronous weight flush on 3 nodes (Expected duration: ${durationSeconds}s).`);
  }

  addOperatorLog(type, message) {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    this.operatorLogs = [entry, ...this.operatorLogs].slice(0, 40);
    for (const cb of this.operatorLogListeners) {
      cb(this.operatorLogs);
    }
  }

  startStreaming() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tickCount += 1;
      if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
        if (this.tickCount === 4 && !this.isBurstActive) {
          this.triggerAiCheckpointBurst(4);
        }
      }

      let readIOPS = 640000 + Math.floor(Math.random() * 80000);
      let writeIOPS = 120000 + Math.floor(Math.random() * 30000);
      let blockSizeKB = 64;
      let baseLatency = 110;

      if (this.isBurstActive) {
        // Massive burst write during distributed model checkpointing
        writeIOPS = 940000 + Math.floor(Math.random() * 120000);
        readIOPS = 160000 + Math.floor(Math.random() * 40000);
        blockSizeKB = 128;
        baseLatency = 380;
        this.burstRemainingTicks -= 1;
        if (this.burstRemainingTicks <= 0) {
          this.isBurstActive = false;
          this.addOperatorLog('reconcile', 'AI Checkpoint write burst concluded. Storage queue depths returning to baseline.');
        }
      }

      // Throughput calculation: throughput_GBps = (iops * block_size_KB) / (1024 * 1024)
      const readGBps = (readIOPS * blockSizeKB) / (1024 * 1024);
      const writeGBps = (writeIOPS * blockSizeKB) / (1024 * 1024);
      const totalGBps = readGBps + writeGBps;

      // P99 Latency calculation
      const samples = Array.from({ length: 100 }, () => baseLatency + (Math.random() * 50 - 25));
      const sorted = [...samples].sort((a, b) => a - b);
      const p99Index = Math.floor(sorted.length * 0.99);
      const latencyP99Us = sorted[p99Index];

      // Update node queue depths
      this.nodes.forEach(node => {
        node.queueDepth = this.isBurstActive 
          ? 38 + Math.floor(Math.random() * 12)
          : 10 + Math.floor(Math.random() * 8);
        node.latencyUs = Math.floor(latencyP99Us * (0.8 + Math.random() * 0.4));
      });

      this.clusterState.throughputGBps = parseFloat(totalGBps.toFixed(2));
      this.clusterState.p99LatencyUs = parseFloat(latencyP99Us.toFixed(1));

      const snapshot = {
        timestamp: new Date().toLocaleTimeString(),
        readIOPS,
        writeIOPS,
        totalIOPS: readIOPS + writeIOPS,
        readGBps: parseFloat(readGBps.toFixed(2)),
        writeGBps: parseFloat(writeGBps.toFixed(2)),
        totalThroughputGBps: parseFloat(totalGBps.toFixed(2)),
        latencyP99Us: parseFloat(latencyP99Us.toFixed(1)),
        isBurstActive: this.isBurstActive,
        nodes: [...this.nodes],
        cluster: { ...this.clusterState }
      };

      for (const listener of this.listeners) {
        listener(snapshot);
      }

      // Periodically add regular reconciliation heartbeat log
      if (Math.random() < 0.15) {
        this.addOperatorLog('reconcile', `Operator Reconcile: Health probe OK, throughput = ${snapshot.totalThroughputGBps} GB/s, p99 = ${snapshot.latencyP99Us}µs.`);
      }
    }, 1000);
  }

  // Volume CRUD operations in mock mode
  provisionVolume({ name, sizeGB, storagePool, directStorage, targetNode }) {
    const volId = `vol-dgx-${Math.random().toString(36).substring(2, 8)}`;
    const effectiveBw = storagePool === 'nvme-direct-pool' ? (directStorage ? 28.5 : 22.0) : 12.0;
    const newVol = {
      id: volId,
      name,
      sizeGB: parseInt(sizeGB, 10),
      storagePool: storagePool || 'nvme-direct-pool',
      directStorageEnabled: directStorage !== false,
      attachedNode: targetNode || 'dgx-node-01',
      phase: 'Bound',
      mountPath: `/mnt/dgx-${name}`,
      iopsLimit: directStorage ? 420000 : 180000,
      bandwidthGBps: effectiveBw,
      createdAt: 'Just now'
    };

    this.volumes.push(newVol);
    this.clusterState.allocatedCapacityGB += newVol.sizeGB;
    this.addOperatorLog('csi', `CSI Driver provisioned volume ${name} (${sizeGB}GB) attached to ${targetNode}.`);
    return newVol;
  }

  deleteVolume(volumeId) {
    const vol = this.volumes.find(v => v.id === volumeId);
    if (!vol) return false;
    this.volumes = this.volumes.filter(v => v.id !== volumeId);
    this.clusterState.allocatedCapacityGB = Math.max(0, this.clusterState.allocatedCapacityGB - vol.sizeGB);
    this.addOperatorLog('csi', `CSI Controller unpublished and deleted volume ${vol.name} (${volumeId}).`);
    return true;
  }

  migrateVolume(volumeId, destinationNode) {
    const vol = this.volumes.find(v => v.id === volumeId);
    if (!vol) return false;
    const oldNode = vol.attachedNode;
    vol.attachedNode = destinationNode;
    this.addOperatorLog('reconcile', `Operator migrated volume ${vol.name} from ${oldNode} -> ${destinationNode} without I/O disruption.`);
    return true;
  }
}

export default new MockTelemetryService();
