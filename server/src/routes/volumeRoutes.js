const express = require('express');
const router = express.Router();
const { VolumeModel, AuditModel, ClusterModel } = require('../db/models');
const { provisionVolumeWorkflow, migrationQueue } = require('../orchestration/asyncWorkflows');
const csiDriver = require('../../../k8s/csi/driver');

// GET /api/volumes
router.get('/', async (req, res) => {
  try {
    const volumes = await VolumeModel.listAll();
    res.json({ volumes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/volumes/:id
router.get('/:id', async (req, res) => {
  try {
    const vol = await VolumeModel.getById(req.params.id);
    if (!vol) return res.status(404).json({ error: 'Volume not found' });
    res.json({ volume: vol });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/volumes - Provisions volume via async.waterfall workflow
router.post('/', (req, res) => {
  const { name, sizeGB, storagePool, directStorage, targetNode } = req.body;
  if (!name || !sizeGB) {
    return res.status(400).json({ error: 'Name and sizeGB are required' });
  }

  provisionVolumeWorkflow({
    name,
    sizeGB: parseInt(sizeGB, 10),
    storagePool: storagePool || 'nvme-direct-pool',
    directStorage: directStorage !== false,
    targetNode: targetNode || 'dgx-node-01'
  }, (err, created) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Volume provisioned successfully', volume: created });
  });
});

// POST /api/volumes/:id/migrate - Queues volume migration via async.queue
router.post('/:id/migrate', async (req, res) => {
  const { destinationNode } = req.body;
  if (!destinationNode) return res.status(400).json({ error: 'destinationNode is required' });

  migrationQueue.push({
    volumeId: req.params.id,
    destinationNode
  }, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Volume migration finished', result });
  });
});

// DELETE /api/volumes/:id
router.delete('/:id', async (req, res) => {
  try {
    const vol = await VolumeModel.getById(req.params.id);
    if (!vol) return res.status(404).json({ error: 'Volume not found' });

    csiDriver.DeleteVolume({ volume_id: req.params.id });
    await VolumeModel.remove(req.params.id);

    const cluster = await ClusterModel.getOverview();
    if (cluster) {
      await ClusterModel.updateOverview({
        allocatedCapacityGB: Math.max(0, cluster.allocatedCapacityGB - vol.sizeGB)
      });
    }

    await AuditModel.logEvent('csi-controller', 'DELETE_VOLUME', `Deleted volume ${vol.name} (${vol.id})`);
    res.json({ message: 'Volume deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
