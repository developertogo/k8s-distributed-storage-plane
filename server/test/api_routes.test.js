const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const cors = require('cors');

const dbManager = require('../src/db/mongoClient');
const clusterRoutes = require('../src/routes/clusterRoutes');
const volumeRoutes = require('../src/routes/volumeRoutes');
const telemetryRoutes = require('../src/routes/telemetryRoutes');

describe('API Gateway REST Routes Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await dbManager.init('mongodb://localhost:27017/test_db');

    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/health', (req, res) => {
      res.json({ status: 'UP', service: 'k8s-distributed-storage-plane', version: '1.0.0' });
    });

    app.use('/api/cluster', clusterRoutes);
    app.use('/api/volumes', volumeRoutes);
    app.use('/api/telemetry', telemetryRoutes);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after((t, done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  test('GET /health returns status UP', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'UP');
    assert.equal(body.service, 'k8s-distributed-storage-plane');
  });

  test('GET /api/cluster/overview returns cluster state and audits', async () => {
    const res = await fetch(`${baseUrl}/api/cluster/overview`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.cluster);
    assert.equal(body.cluster.name, 'dgx-storage-cluster-prod');
    assert.equal(body.cluster.activeNodes, 3);
  });

  test('GET /api/cluster/nodes runs parallel health check and returns nodes', async () => {
    const res = await fetch(`${baseUrl}/api/cluster/nodes`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.nodes));
    assert.equal(body.nodes.length, 3);
    assert.equal(body.nodes[0].status, 'Ready');
  });

  test('POST /api/cluster/reconcile triggers reconciliation and logs audit event', async () => {
    const res = await fetch(`${baseUrl}/api/cluster/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.message, /reconciliation completed/);
  });

  let createdVolumeId;

  test('POST /api/volumes provisions new volume claim', async () => {
    const res = await fetch(`${baseUrl}/api/volumes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'api-test-checkpoint-vol',
        sizeGB: 1200,
        storagePool: 'nvme-direct-pool',
        directStorage: true,
        targetNode: 'dgx-node-02'
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.volume);
    assert.equal(body.volume.name, 'api-test-checkpoint-vol');
    assert.equal(body.volume.sizeGB, 1200);
    assert.equal(body.volume.attachedNode, 'dgx-node-02');
    createdVolumeId = body.volume.id;
  });

  test('POST /api/volumes validation rejects missing name or size', async () => {
    const res = await fetch(`${baseUrl}/api/volumes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'incomplete-vol' })
    });
    assert.equal(res.status, 400);
  });

  test('GET /api/volumes lists all storage volumes', async () => {
    const res = await fetch(`${baseUrl}/api/volumes`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.volumes));
    assert.ok(body.volumes.some(v => v.id === createdVolumeId));
  });

  test('GET /api/volumes/:id retrieves volume details', async () => {
    const res = await fetch(`${baseUrl}/api/volumes/${createdVolumeId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.volume.id, createdVolumeId);
    assert.equal(body.volume.name, 'api-test-checkpoint-vol');
  });

  test('POST /api/volumes/:id/migrate triggers worker queue migration', async () => {
    const res = await fetch(`${baseUrl}/api/volumes/${createdVolumeId}/migrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationNode: 'dgx-node-01' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.message, /migration finished/);
  });

  test('DELETE /api/volumes/:id releases volume and adjusts cluster allocation', async () => {
    const res = await fetch(`${baseUrl}/api/volumes/${createdVolumeId}`, {
      method: 'DELETE'
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.message, /deleted successfully/);

    // Verify 404
    const checkRes = await fetch(`${baseUrl}/api/volumes/${createdVolumeId}`);
    assert.equal(checkRes.status, 404);
  });

  test('GET /api/telemetry/recent returns historical time-series entries', async () => {
    const res = await fetch(`${baseUrl}/api/telemetry/recent?limit=10`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.telemetry));
  });

  test('POST /api/telemetry/simulate-burst activates checkpoint spike', async () => {
    const res = await fetch(`${baseUrl}/api/telemetry/simulate-burst`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 5 })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.message, /checkpoint burst initiated/);
  });
});
