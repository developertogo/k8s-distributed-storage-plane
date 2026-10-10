const express = require('express');
const router = express.Router();
const { ClusterModel, AuditModel } = require('../db/models');
const { probeClusterNodesWorkflow } = require('../orchestration/asyncWorkflows');
const config = require('../config');

// GET /api/cluster/overview
router.get('/overview', async (req, res) => {
  try {
    const overview = await ClusterModel.getOverview();
    const audits = await AuditModel.getRecent(10);
    res.json({ cluster: overview, audits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cluster/nodes
router.get('/nodes', (req, res) => {
  probeClusterNodesWorkflow(config.nodes, (err, nodeStatuses) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ nodes: nodeStatuses });
  });
});

// POST /api/cluster/reconcile
router.post('/reconcile', async (req, res) => {
  try {
    await AuditModel.logEvent('user-admin', 'MANUAL_RECONCILE', 'Manual cluster reconciliation cycle initiated');
    const overview = await ClusterModel.getOverview();
    res.json({ message: 'Cluster reconciliation completed', cluster: overview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
