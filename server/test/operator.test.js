const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const StorageOperatorController = require('../../k8s/operator/controller');

describe('Kubernetes Storage Operator Tests', () => {

  test('calculateClusterMetrics implements accurate storage formulas', () => {
    const operator = new StorageOperatorController();

    const totalBytes = 100 * 1024 * 1024 * 1024; // 100 GB
    const usedBytes = 40 * 1024 * 1024 * 1024;  // 40 GB
    const iops = 500000;
    const blockSizeKB = 64;
    const rawBandwidthGBps = 64.0;
    const overhead = 0.05;
    const latencySamples = Array.from({ length: 100 }, (_, i) => 100 + i);

    const metrics = operator.calculateClusterMetrics(
      totalBytes,
      usedBytes,
      iops,
      blockSizeKB,
      rawBandwidthGBps,
      overhead,
      latencySamples
    );

    // utilization_ratio = used_capacity_bytes / total_capacity_bytes = 0.4
    assert.equal(metrics.utilizationRatio, 0.4);

    // throughput_GBps = (iops * block_size_KB) / (1024 * 1024) = (500000 * 64) / 1048576 = 30.52 GB/s
    assert.equal(metrics.throughputGBps, 30.52);

    // direct_storage_bandwidth_GBps = 64.0 * (1.0 - 0.05) = 60.8 GB/s
    assert.equal(metrics.directBandwidthGBps, 60.8);

    // latency_p99_us = 99th percentile sample = 100 + 99 = 199
    assert.equal(metrics.latencyP99Us, 199.0);
  });

  test('reconcileCluster runs multi-step waterfall and parallel node health check loop', (t, done) => {
    const operator = new StorageOperatorController();

    operator.reconcileCluster(operator.simulatedCluster, (err, status) => {
      assert.ifError(err);
      assert.ok(status);
      assert.equal(status.state, 'Healthy');
      assert.equal(status.activeNodes, 3);
      assert.ok(status.throughputGBps > 0);
      assert.ok(status.p99LatencyUs > 0);
      assert.ok(status.lastReconciledAt);
      done();
    });
  });

  test('operator start and stop lifecycle manages interval timer cleanly', () => {
    const operator = new StorageOperatorController();
    assert.equal(operator.timer, null);

    operator.start();
    assert.ok(operator.timer !== null);

    operator.stop();
    assert.equal(operator.timer, null);
  });
});
