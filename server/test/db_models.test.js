const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const dbManager = require('../src/db/mongoClient');
const { ClusterModel, VolumeModel, TelemetryModel, AuditModel } = require('../src/db/models');

describe('Database Layer & Models Tests', () => {

  before(async () => {
    await dbManager.init('mongodb://localhost:27017/test_db');
  });

  describe('InMemoryCollection Core Engine', () => {
    test('insertOne and findOne retrieve stored document', async () => {
      const col = dbManager.getCollection('test_custom');
      const doc = await col.insertOne({ key: 'nvme_ctrl_01', healthy: true });
      assert.ok(doc._id);
      assert.equal(doc.key, 'nvme_ctrl_01');

      const fetched = await col.findOne({ key: 'nvme_ctrl_01' });
      assert.equal(fetched.healthy, true);
    });

    test('updateOne updates existing document', async () => {
      const col = dbManager.getCollection('test_custom');
      const updateResult = await col.updateOne({ key: 'nvme_ctrl_01' }, { healthy: false, tempC: 45 });
      assert.equal(updateResult.modifiedCount, 1);

      const updated = await col.findOne({ key: 'nvme_ctrl_01' });
      assert.equal(updated.healthy, false);
      assert.equal(updated.tempC, 45);
    });

    test('deleteOne removes document', async () => {
      const col = dbManager.getCollection('test_custom');
      const delResult = await col.deleteOne({ key: 'nvme_ctrl_01' });
      assert.equal(delResult.deletedCount, 1);

      const check = await col.findOne({ key: 'nvme_ctrl_01' });
      assert.equal(check, null);
    });

    test('countDocuments accurately counts filtered items', async () => {
      const col = dbManager.getCollection('test_count');
      await col.insertOne({ type: 'A' });
      await col.insertOne({ type: 'A' });
      await col.insertOne({ type: 'B' });

      const countA = await col.countDocuments({ type: 'A' });
      const countTotal = await col.countDocuments();
      assert.equal(countA, 2);
      assert.equal(countTotal, 3);
    });
  });

  describe('ClusterModel', () => {
    test('getOverview returns seeded cluster with active nodes', async () => {
      const cluster = await ClusterModel.getOverview();
      assert.ok(cluster);
      assert.equal(cluster.name, 'dgx-storage-cluster-prod');
      assert.equal(cluster.activeNodes, 3);
      assert.equal(cluster.totalCapacityGB, 620000);
    });

    test('updateOverview patches cluster values', async () => {
      await ClusterModel.updateOverview({ allocatedCapacityGB: 260000 });
      const updated = await ClusterModel.getOverview();
      assert.equal(updated.allocatedCapacityGB, 260000);
      assert.ok(updated.updatedAt);
    });
  });

  describe('VolumeModel', () => {
    const testVolId = 'vol-test-model-99';

    test('create stores new volume', async () => {
      const created = await VolumeModel.create({
        id: testVolId,
        name: 'model-weights-test',
        sizeGB: 1000,
        storagePool: 'nvme-direct-pool',
        directStorageEnabled: true,
        attachedNode: 'dgx-node-03',
        phase: 'Bound'
      });
      assert.equal(created.id, testVolId);
    });

    test('getById returns target volume', async () => {
      const found = await VolumeModel.getById(testVolId);
      assert.ok(found);
      assert.equal(found.name, 'model-weights-test');
      assert.equal(found.directStorageEnabled, true);
    });

    test('listAll contains all created volumes', async () => {
      const all = await VolumeModel.listAll();
      assert.ok(all.length >= 3);
      assert.ok(all.some(v => v.id === testVolId));
    });

    test('update modifies volume attributes', async () => {
      await VolumeModel.update(testVolId, { attachedNode: 'dgx-node-01' });
      const updated = await VolumeModel.getById(testVolId);
      assert.equal(updated.attachedNode, 'dgx-node-01');
    });

    test('remove deletes volume', async () => {
      const del = await VolumeModel.remove(testVolId);
      assert.equal(del.deletedCount, 1);
      const check = await VolumeModel.getById(testVolId);
      assert.equal(check, null);
    });
  });

  describe('TelemetryModel & AuditModel', () => {
    test('TelemetryModel records snapshots and retrieves recent ones', async () => {
      await TelemetryModel.recordSnapshot({ totalThroughputGBps: 52.4, latencyP99Us: 118 });
      const recent = await TelemetryModel.getRecent(5);
      assert.ok(recent.length > 0);
      assert.ok(recent[recent.length - 1].createdAt);
    });

    test('AuditModel logs events with timestamp and actor', async () => {
      await AuditModel.logEvent('test-runner', 'UNIT_TEST', 'Testing audit event persistence');
      const audits = await AuditModel.getRecent(5);
      assert.ok(audits.some(a => a.actor === 'test-runner' && a.action === 'UNIT_TEST'));
    });
  });
});
