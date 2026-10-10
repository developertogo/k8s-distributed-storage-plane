const express = require('express');
const router = express.Router();
const { TelemetryModel } = require('../db/models');
const kafkaService = require('../kafka/kafkaService');

// GET /api/telemetry/recent
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 30;
    const history = await TelemetryModel.getRecent(limit);
    res.json({ telemetry: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telemetry/simulate-burst
router.post('/simulate-burst', (req, res) => {
  const duration = parseInt(req.body.duration, 10) || 8;
  kafkaService.triggerAiCheckpointBurst(duration);
  res.json({ message: `AI training checkpoint burst initiated for ${duration} pulses` });
});

module.exports = router;
