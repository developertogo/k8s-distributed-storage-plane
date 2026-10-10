const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const csiDriver = require('../../k8s/csi/driver');
const storageSim = require('../../k8s/csi/storage_simulator');

describe('CSI Driver & Storage Hardware Simulator Tests', () => {

  describe('Storage Simulator Math & Logic (Python Formulas)', () => {
    test('calculateThroughputGBps matches formula: (iops * block_size_KB) / (1024 * 1024)', () => {
      // 1,048,576 IOPS with 64KB block size = (1048576 * 64) / (1024 * 1024) = 64.0 GB/s
      const throughput = storageSim.calculateThroughputGBps(1048576, 64);
      assert.equal(throughput, 64.0);
    });

    test('getEffectiveBandwidth matches: raw_nvme_bandwidth_GBps * (1.0 - interconnect_overhead_factor)', () => {
      // 64.0 * (1 - 0.05) = 60.8 GB/s
      const bw = storageSim.getEffectiveBandwidth('nvme-direct-pool');
      assert.equal(bw, 60.8);
    });

    test('calculateP99Latency returns 99th percentile sample', () => {
      // array of 100 samples from 1 to 100
      const samples = Array.from({ length: 100 }, (_, i) => i + 1);
      const p99 = storageSim.calculateP99Latency(samples);
      assert.equal(p99, 100);
    });

    test('getPoolUtilization computes ratio of used to total capacity', () => {
      const ratio = storageSim.getPoolUtilization('nvme-direct-pool');
      assert.ok(ratio >= 0 && ratio <= 1.0);
    });

    test('allocateVolume fails when requesting capacity exceeding pool limit', () => {
      assert.throws(() => {
        // Pool is 120TB max, requesting 1,000,000 GB should throw
        storageSim.allocateVolume('vol-overflow-test', 1000000, 'nvme-direct-pool');
      }, /Insufficient capacity/);
    });
  });

  describe('CSI Identity Service', () => {
    test('GetPluginInfo returns valid plugin name and vendor version', () => {
      const info = csiDriver.GetPluginInfo();
      assert.equal(info.name, 'dgx.storage.csi.k8s.io');
      assert.equal(info.vendor_version, '1.0.0');
      assert.equal(info.manifest.direct_storage_supported, 'true');
    });

    test('GetPluginCapabilities advertises CONTROLLER_SERVICE', () => {
      const caps = csiDriver.GetPluginCapabilities();
      assert.ok(caps.capabilities.some(c => c.type === 'CONTROLLER_SERVICE'));
      assert.ok(caps.capabilities.some(c => c.type === 'VOLUME_ACCESSIBILITY_CONSTRAINTS'));
    });

    test('Probe returns ready state and HEALTHY fabric status', () => {
      const probe = csiDriver.Probe();
      assert.equal(probe.ready, true);
      assert.equal(probe.fabric_status, 'HEALTHY');
    });
  });

  describe('CSI Controller & Node Service Lifecycle', () => {
    let testVolumeId;

    test('CreateVolume provisions a volume allocation', () => {
      const response = csiDriver.CreateVolume({
        name: 'unit-test-dataset-vol',
        capacity_range: { required_bytes: 50 * 1024 * 1024 * 1024 }, // 50GB
        parameters: { storagePool: 'nvme-direct-pool', directStorage: 'true' }
      });

      assert.ok(response.volume);
      assert.ok(response.volume.volume_id.startsWith('vol-dgx-'));
      testVolumeId = response.volume.volume_id;
      assert.equal(response.volume.capacity_bytes, 50 * 1024 * 1024 * 1024);
      assert.equal(response.volume.volume_context.direct_storage_enabled, 'true');
    });

    test('ValidateVolumeCapabilities confirms SINGLE_NODE_WRITER access mode', () => {
      const val = csiDriver.ValidateVolumeCapabilities({
        volume_id: testVolumeId,
        volume_capabilities: [{ access_mode: { mode: 'SINGLE_NODE_WRITER' } }]
      });
      assert.ok(val.confirmed);
    });

    test('ControllerPublishVolume attaches volume to target compute node', () => {
      const attachRes = csiDriver.ControllerPublishVolume({
        volume_id: testVolumeId,
        node_id: 'dgx-node-01'
      });
      assert.equal(attachRes.publish_context.attached_node, 'dgx-node-01');
      assert.ok(attachRes.publish_context.device_path.includes(testVolumeId));
    });

    test('NodeStageVolume stages volume to target directory', () => {
      const stageRes = csiDriver.NodeStageVolume({
        volume_id: testVolumeId,
        staging_target_path: '/var/lib/kubelet/plugins/csi/globalmount'
      });
      assert.equal(stageRes.staged, true);
      assert.equal(stageRes.filesystem, 'ext4');
    });

    test('NodePublishVolume bind-mounts to container path with direct storage active', () => {
      const pubRes = csiDriver.NodePublishVolume({
        volume_id: testVolumeId,
        target_path: '/mnt/dgx-data/test'
      });
      assert.equal(pubRes.published, true);
      assert.equal(pubRes.direct_storage_bypass_active, true);
    });

    test('NodeGetVolumeStats returns live IOPS, capacity, and P99 latency', () => {
      const stats = csiDriver.NodeGetVolumeStats({ volume_id: testVolumeId });
      assert.ok(stats.usage[0].total > 0);
      assert.ok(stats.performance.iops > 0);
      assert.ok(stats.performance.throughput_GBps > 0);
      assert.ok(stats.performance.latency_p99_us > 0);
      assert.equal(stats.volume_condition.abnormal, false);
    });

    test('NodeUnpublishVolume unmounts container path', () => {
      const unpubRes = csiDriver.NodeUnpublishVolume({ volume_id: testVolumeId });
      assert.equal(unpubRes.success, true);
    });

    test('ControllerUnpublishVolume detaches volume from node', () => {
      const unattachRes = csiDriver.ControllerUnpublishVolume({ volume_id: testVolumeId });
      assert.equal(unattachRes.success, true);
    });

    test('DeleteVolume releases volume resources', () => {
      const delRes = csiDriver.DeleteVolume({ volume_id: testVolumeId });
      assert.equal(delRes.success, true);
    });
  });
});
