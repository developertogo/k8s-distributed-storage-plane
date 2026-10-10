const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const kafkaService = require('../src/kafka/kafkaService');
const dbManager = require('../src/db/mongoClient');

describe('Kafka Pipeline & Telemetry Emitter Tests', () => {

  before(async () => {
    await dbManager.init('mongodb://localhost:27017/test_db');
  });

  after(() => {
    kafkaService.stop();
  });

  test('generateTelemetryPulse generates standard baseline I/O metrics', () => {
    const pulse = kafkaService.generateTelemetryPulse();
    assert.ok(pulse);
    assert.ok(pulse.readIOPS > 0);
    assert.ok(pulse.writeIOPS > 0);
    assert.equal(pulse.totalIOPS, pulse.readIOPS + pulse.writeIOPS);
    assert.ok(pulse.readGBps > 0);
    assert.ok(pulse.writeGBps > 0);
    assert.equal(pulse.totalThroughputGBps, parseFloat((pulse.readGBps + pulse.writeGBps).toFixed(2)));
    assert.ok(pulse.latencyP99Us > 0);
    assert.equal(pulse.aiBurstActive, false);
    assert.ok(pulse.nodeQueueDepths['dgx-node-01'] > 0);
  });

  test('triggerAiCheckpointBurst induces write IOPS surge and elevated latency', () => {
    kafkaService.triggerAiCheckpointBurst(2);
    assert.equal(kafkaService.aiBurstActive, true);
    assert.equal(kafkaService.aiBurstRemainingTicks, 2);

    const burstPulse = kafkaService.generateTelemetryPulse();
    // Burst write IOPS should exceed 800k and latency elevated
    assert.ok(burstPulse.writeIOPS >= 800000);
    assert.ok(burstPulse.latencyP99Us >= 300);
    assert.equal(burstPulse.aiBurstActive, true);

    // After 2 ticks, it recovers to baseline
    kafkaService.generateTelemetryPulse();
    assert.equal(kafkaService.aiBurstActive, false);
  });

  test('kafkaService emits telemetry and alert events to subscribers', (t, done) => {
    const testAlert = { topic: 'cluster-alerts', level: 'INFO', message: 'test alert' };

    kafkaService.once('alert', (received) => {
      assert.equal(received.level, 'INFO');
      assert.equal(received.message, 'test alert');
      done();
    });

    kafkaService.emit('alert', testAlert);
  });
});
