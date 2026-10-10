/**
 * k8s-distributed-storage-plane: Container Storage Interface (CSI) Plugin Driver
 * Implements Identity, Controller, and Node services according to the CSI v1.5.0 specification.
 */

const storageSim = require('./storage_simulator');

class CSIDriver {
  constructor() {
    this.pluginName = 'dgx.storage.csi.k8s.io';
    this.pluginVersion = '1.0.0';
  }

  // ==========================================
  // 1. Identity Service
  // ==========================================
  GetPluginInfo() {
    return {
      name: this.pluginName,
      vendor_version: this.pluginVersion,
      manifest: {
        'built_by': 'NVIDIA DGX Cloud Storage Architecture',
        'direct_storage_supported': 'true',
        'fabrics': 'RoCEv2, InfiniBand-NDR'
      }
    };
  }

  GetPluginCapabilities() {
    return {
      capabilities: [
        { type: 'CONTROLLER_SERVICE' },
        { type: 'VOLUME_ACCESSIBILITY_CONSTRAINTS' },
        { type: 'ONLINE_EXPANSION' }
      ]
    };
  }

  Probe() {
    // Health probe of the underlying storage fabric
    return {
      ready: true,
      fabric_status: 'HEALTHY',
      timestamp: new Date().toISOString()
    };
  }

  // ==========================================
  // 2. Controller Service
  // ==========================================
  CreateVolume(request) {
    const { name, capacity_range, parameters = {} } = request;
    const sizeGB = capacity_range?.required_bytes 
      ? Math.ceil(capacity_range.required_bytes / (1024 * 1024 * 1024))
      : 100;
    
    const pool = parameters.storagePool || 'nvme-direct-pool';
    const directStorage = parameters.directStorage !== 'false';
    const volumeId = `vol-dgx-${Math.random().toString(36).substring(2, 9)}`;

    const allocated = storageSim.allocateVolume(volumeId, sizeGB, pool, directStorage);
    const effectiveBw = storageSim.getEffectiveBandwidth(pool);

    return {
      volume: {
        volume_id: volumeId,
        capacity_bytes: allocated.sizeBytes,
        volume_context: {
          storage_pool: pool,
          direct_storage_enabled: String(directStorage),
          nqn: allocated.nqn,
          pcie_address: allocated.pcieAddress,
          effective_bandwidth_GBps: String(effectiveBw)
        }
      }
    };
  }

  DeleteVolume(request) {
    const { volume_id } = request;
    const success = storageSim.releaseVolume(volume_id);
    return { success };
  }

  ControllerPublishVolume(request) {
    const { volume_id, node_id } = request;
    const vol = storageSim.attachToNode(volume_id, node_id);
    return {
      publish_context: {
        device_path: `/dev/disk/by-id/nvme-${volume_id}`,
        attached_node: node_id,
        attached_at: new Date().toISOString()
      }
    };
  }

  ControllerUnpublishVolume(request) {
    const { volume_id } = request;
    storageSim.detachFromNode(volume_id);
    return { success: true, detached_at: new Date().toISOString() };
  }

  ValidateVolumeCapabilities(request) {
    return {
      confirmed: {
        volume_capabilities: request.volume_capabilities || [
          { access_mode: { mode: 'SINGLE_NODE_WRITER' } }
        ]
      }
    };
  }

  // ==========================================
  // 3. Node Service
  // ==========================================
  NodeStageVolume(request) {
    const { volume_id, staging_target_path } = request;
    storageSim.stageVolume(volume_id, staging_target_path);
    return {
      staged: true,
      filesystem: 'ext4',
      staging_target_path
    };
  }

  NodePublishVolume(request) {
    const { volume_id, target_path, readonly = false } = request;
    storageSim.publishVolume(volume_id, target_path, readonly);
    return {
      published: true,
      mount_path: target_path,
      direct_storage_bypass_active: true
    };
  }

  NodeUnpublishVolume(request) {
    const { volume_id } = request;
    const success = storageSim.unpublishVolume(volume_id);
    return { success };
  }

  NodeGetVolumeStats(request) {
    const { volume_id } = request;
    const metrics = storageSim.getVolumeMetrics(volume_id);
    if (!metrics) {
      throw new Error(`Volume ${volume_id} not found`);
    }

    return {
      usage: [
        { available: metrics.sizeBytes - metrics.usedBytes, total: metrics.sizeBytes, used: metrics.usedBytes, unit: 'BYTES' }
      ],
      volume_condition: {
        abnormal: false,
        message: 'Direct NVMe hardware path operating nominally'
      },
      performance: {
        iops: metrics.iops,
        throughput_GBps: metrics.throughputGBps,
        latency_p99_us: metrics.p99LatencyUs
      }
    };
  }
}

module.exports = new CSIDriver();
