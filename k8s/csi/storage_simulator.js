/**
 * k8s-distributed-storage-plane: NVMe-oF & Direct Storage Hardware Simulator
 * Simulates physical NVMe target subsystems, PCIe Gen5 namespaces, and Direct GPU bypass mounts.
 */

class StorageSimulator {
  constructor() {
    this.storagePools = {
      'nvme-direct-pool': {
        type: 'nvme-direct',
        totalCapacityBytes: 120 * 1024 * 1024 * 1024 * 1024, // 120 TB
        allocatedBytes: 42 * 1024 * 1024 * 1024 * 1024,
        rawBandwidthGBps: 64.0,
        interconnectOverhead: 0.05, // 5% PCIe / RoCEv2 overhead
        baseLatencyUs: 90
      },
      'ssd-shared-pool': {
        type: 'ssd-shared',
        totalCapacityBytes: 500 * 1024 * 1024 * 1024 * 1024, // 500 TB
        allocatedBytes: 203 * 1024 * 1024 * 1024 * 1024,
        rawBandwidthGBps: 25.0,
        interconnectOverhead: 0.12, // 12% fabric overhead
        baseLatencyUs: 220
      }
    };

    this.allocatedVolumes = new Map();
    this.stagedVolumes = new Map();
    this.publishedVolumes = new Map();
  }

  // Storage Performance Formula: Direct storage effective bandwidth
  // direct_storage_bandwidth_GBps = raw_nvme_bandwidth_GBps * (1.0 - interconnect_overhead_factor)
  getEffectiveBandwidth(poolName) {
    const pool = this.storagePools[poolName] || this.storagePools['nvme-direct-pool'];
    return pool.rawBandwidthGBps * (1.0 - pool.interconnectOverhead);
  }

  // Storage Performance Formula: Utilization ratio
  // utilization_ratio = used_capacity_bytes / total_capacity_bytes
  getPoolUtilization(poolName) {
    const pool = this.storagePools[poolName] || this.storagePools['nvme-direct-pool'];
    return pool.totalCapacityBytes > 0 ? pool.allocatedBytes / pool.totalCapacityBytes : 0;
  }

  // Storage Performance Formula: Throughput (GB/s)
  // throughput_GBps = (iops * block_size_KB) / (1024 * 1024)
  calculateThroughputGBps(iops, blockSizeKB = 64) {
    return (iops * blockSizeKB) / (1024 * 1024);
  }

  // Storage Performance Formula: P99 Latency from samples
  // latency_p99_us = sorted_latencies[int(len(sorted_latencies) * 0.99)]
  calculateP99Latency(samples) {
    if (!samples || samples.length === 0) return 120.0;
    const sorted = [...samples].sort((a, b) => a - b);
    const p99Index = Math.floor(sorted.length * 0.99);
    return sorted[Math.min(p99Index, sorted.length - 1)];
  }

  allocateVolume(volumeId, sizeGB, poolName = 'nvme-direct-pool', directStorage = true) {
    const pool = this.storagePools[poolName] || this.storagePools['nvme-direct-pool'];
    const sizeBytes = sizeGB * 1024 * 1024 * 1024;

    if (pool.allocatedBytes + sizeBytes > pool.totalCapacityBytes) {
      throw new Error(`Insufficient capacity in pool ${poolName}. Requested ${sizeGB}GB.`);
    }

    pool.allocatedBytes += sizeBytes;
    const volData = {
      volumeId,
      sizeGB,
      sizeBytes,
      poolName,
      directStorage,
      createdAt: new Date().toISOString(),
      nqn: `nqn.2014-08.org.nvmexpress:uuid:${volumeId}`,
      pcieAddress: `0000:${(Math.floor(Math.random() * 80) + 10).toString(16)}:00.0`,
      attachedNode: null
    };

    this.allocatedVolumes.set(volumeId, volData);
    return volData;
  }

  releaseVolume(volumeId) {
    const vol = this.allocatedVolumes.get(volumeId);
    if (!vol) return false;
    const pool = this.storagePools[vol.poolName];
    if (pool) {
      pool.allocatedBytes = Math.max(0, pool.allocatedBytes - vol.sizeBytes);
    }
    this.allocatedVolumes.delete(volumeId);
    this.stagedVolumes.delete(volumeId);
    this.publishedVolumes.delete(volumeId);
    return true;
  }

  attachToNode(volumeId, nodeId) {
    const vol = this.allocatedVolumes.get(volumeId);
    if (!vol) throw new Error(`Volume ${volumeId} does not exist`);
    vol.attachedNode = nodeId;
    return vol;
  }

  detachFromNode(volumeId) {
    const vol = this.allocatedVolumes.get(volumeId);
    if (!vol) throw new Error(`Volume ${volumeId} does not exist`);
    vol.attachedNode = null;
    return vol;
  }

  stageVolume(volumeId, stagingTargetPath) {
    this.stagedVolumes.set(volumeId, { stagingTargetPath, stagedAt: new Date().toISOString() });
    return true;
  }

  publishVolume(volumeId, targetPath, readonly = false) {
    this.publishedVolumes.set(volumeId, { targetPath, readonly, publishedAt: new Date().toISOString() });
    return true;
  }

  unpublishVolume(volumeId) {
    return this.publishedVolumes.delete(volumeId);
  }

  getVolumeMetrics(volumeId) {
    const vol = this.allocatedVolumes.get(volumeId);
    if (!vol) return null;

    const baseIops = vol.directStorage ? 350000 : 90000;
    const jitter = Math.floor(Math.random() * 40000) - 20000;
    const liveIops = Math.max(10000, baseIops + jitter);
    const throughputGBps = this.calculateThroughputGBps(liveIops, 64);

    // generate random latency distribution
    const samples = Array.from({ length: 100 }, () => {
      const base = vol.directStorage ? 85 : 180;
      return base + (Math.random() * 40 - 20);
    });
    const p99LatencyUs = this.calculateP99Latency(samples);

    return {
      volumeId,
      sizeBytes: vol.sizeBytes,
      usedBytes: Math.floor(vol.sizeBytes * (0.35 + Math.random() * 0.1)),
      iops: liveIops,
      throughputGBps: parseFloat(throughputGBps.toFixed(2)),
      p99LatencyUs: parseFloat(p99LatencyUs.toFixed(1)),
      directStorageActive: vol.directStorage
    };
  }
}

module.exports = new StorageSimulator();
