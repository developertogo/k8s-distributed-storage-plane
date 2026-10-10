const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const dbManager = require('../src/db/mongoClient');
const { ClusterModel, VolumeModel } = require('../src/db/models');
const { provisionVolumeWorkflow, probeClusterNodesWorkflow, migrationQueue } = require('../src/orchestration/asyncWorkflows');

describe('Async Orchestration Engine Tests', () => {

  before(async () => {
    await dbManager.init('mongodb://localhost:27017/test_db');
  });

  describe('provisionVolumeWorkflow (async.waterfall)', () => {
    test('successfully executes 4-step waterfall workflow and provisions volume', (t, done) => {
      provisionVolumeWorkflow({
        name: 'waterfall-vol-01',
        sizeGB: 500,
        storagePool: 'nvme-direct-pool',
        directStorage: true,
        targetNode: 'dgx-node-02'
      }, async (err, result) => {
        assert.ifError(err);
        assert.ok(result);
        assert.equal(result.name, 'waterfall-vol-01');
        assert.equal(result.sizeGB, 500);
        assert.equal(result.directStorageEnabled, true);
        assert.equal(result.attachedNode, 'dgx-node-02');
        assert.equal(result.phase, 'Bound');

        // Verify DB persistence
        const volInDb = await VolumeModel.getById(result.id);
        assert.ok(volInDb);
        assert.equal(volInDb.name, 'waterfall-vol-01');
        done();
      });
    });

    test('waterfall calculates effective bandwidth taking interconnect overhead into account', (t, done) => {
      // nvme-direct-pool (64 GB/s) with directStorage=true (5% overhead) -> 64.0 * 0.95 = 60.8 GB/s
      provisionVolumeWorkflow({
        name: 'waterfall-bw-test',
        sizeGB: 100,
        storagePool: 'nvme-direct-pool',
        directStorage: true,
        targetNode: 'dgx-node-01'
      }, (err, result) => {
        assert.ifError(err);
        assert.equal(result.bandwidthGBps, 60.8);
        assert.equal(result.iopsLimit, 450000);
        done();
      });
    });

    test('waterfall rejects provisioning when requested size exceeds available capacity', (t, done) => {
      provisionVolumeWorkflow({
        name: 'waterfall-exceed-quota',
        sizeGB: 9999999, // Exceeds 620,000 GB cluster limit
        storagePool: 'nvme-direct-pool',
        directStorage: true,
        targetNode: 'dgx-node-01'
      }, (err, result) => {
        assert.ok(err);
        assert.match(err.message, /Quota exceeded/);
        assert.equal(result, undefined);
        done();
      });
    });
  });

  describe('probeClusterNodesWorkflow (async.parallel)', () => {
    test('concurrently probes all cluster nodes and computes p99 latencies and queue depths', (t, done) => {
      const targetNodes = ['dgx-node-01', 'dgx-node-02', 'dgx-node-03'];

      probeClusterNodesWorkflow(targetNodes, (err, probeResults) => {
        assert.ifError(err);
        assert.equal(probeResults.length, 3);

        probeResults.forEach(node => {
          assert.ok(targetNodes.includes(node.nodeId));
          assert.equal(node.status, 'Ready');
          assert.equal(node.nvmeHealthy, true);
          assert.ok(node.queueDepth > 0);
          assert.ok(node.p99LatencyUs > 0);
          assert.ok(node.checkedAt);
        });
        done();
      });
    });
  });

  describe('migrationQueue (async.queue)', () => {
    test('worker queue migrates volume across nodes and updates database', (t, done) => {
      // First provision a volume
      provisionVolumeWorkflow({
        name: 'migration-candidate-vol',
        sizeGB: 200,
        storagePool: 'nvme-direct-pool',
        directStorage: true,
        targetNode: 'dgx-node-01'
      }, (err, volume) => {
        assert.ifError(err);

        // Submit to migration queue
        migrationQueue.push({
          volumeId: volume.id,
          destinationNode: 'dgx-node-03'
        }, async (queueErr, queueResult) => {
          assert.ifError(queueErr);
          assert.equal(queueResult.success, true);
          assert.equal(queueResult.newNode, 'dgx-node-03');

          // Verify updated database state
          const updated = await VolumeModel.getById(volume.id);
          assert.equal(updated.attachedNode, 'dgx-node-03');
          done();
        });
      });
    });
  });
});
