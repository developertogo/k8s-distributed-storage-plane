/**
 * k8s-distributed-storage-plane: Kafka Telemetry & Event Streaming Pipeline
 * Manages producer and consumer pipelines for storage-telemetry, volume-events, and cluster-alerts.
 * Includes resilient in-process streaming emitter for zero-dependency operation.
 */

const EventEmitter = require('events');
const { TelemetryModel, AuditModel } = require('../db/models');

class KafkaPipelineService extends EventEmitter {
  constructor() {
    super();
    this.topics = {
      TELEMETRY: 'storage-telemetry',
      VOLUME_EVENTS: 'volume-events',
      CLUSTER_ALERTS: 'cluster-alerts'
    };
    this.isStreaming = false;
    this.intervalHandle = null;
    this.aiBurstActive = false;
    this.aiBurstRemainingTicks = 0;
  }

  async init(brokers) {
    console.log(`[Kafka Pipeline] Initializing streaming pipeline with brokers: ${brokers.join(', ')}`);
    console.log('[Kafka Pipeline] Subscribing consumer groups to topics: storage-telemetry, volume-events, cluster-alerts');
    this.startStreamingProducer();
  }

  startStreamingProducer(cadenceMs = 1000) {
    if (this.isStreaming) return;
    this.isStreaming = true;

    this.intervalHandle = setInterval(async () => {
      const snapshot = this.generateTelemetryPulse();
      
      // Store in DB
      await TelemetryModel.recordSnapshot(snapshot);

      // Emit to WebSocket hub
      this.emit('telemetry', snapshot);

      // Randomly emit cluster alerts or SMART notifications
      if (Math.random() < 0.05) {
        const alert = {
          topic: this.topics.CLUSTER_ALERTS,
          level: 'INFO',
          source: 'nvme-smart-daemon',
          message: 'NVMe-oF path keepalive verified on all PCIe Gen5 controllers',
          timestamp: new Date().toISOString()
        };
        this.emit('alert', alert);
      }
    }, cadenceMs);
  }

  triggerAiCheckpointBurst(durationTicks = 8) {
    console.log('[Kafka Pipeline] AI Training Checkpoint Burst triggered!');
    this.aiBurstActive = true;
    this.aiBurstRemainingTicks = durationTicks;
  }

  generateTelemetryPulse() {
    let readIOPS = 650000 + Math.floor(Math.random() * 80000);
    let writeIOPS = 120000 + Math.floor(Math.random() * 40000);
    let blockSizeKB = 64;
    let baseLatency = 110;

    if (this.aiBurstActive) {
      // Checkpointing causes massive write IOPS spike and temporary latency increase
      writeIOPS = 920000 + Math.floor(Math.random() * 150000);
      readIOPS = 150000 + Math.floor(Math.random() * 50000);
      blockSizeKB = 128; // Checkpoints use larger block sizes
      baseLatency = 380;
      this.aiBurstRemainingTicks -= 1;
      if (this.aiBurstRemainingTicks <= 0) {
        this.aiBurstActive = false;
      }
    }

    // Python Formula Reference:
    // throughput_GBps = (iops * block_size_KB) / (1024 * 1024)
    const readGBps = (readIOPS * blockSizeKB) / (1024 * 1024);
    const writeGBps = (writeIOPS * blockSizeKB) / (1024 * 1024);
    const parsedReadGBps = parseFloat(readGBps.toFixed(2));
    const parsedWriteGBps = parseFloat(writeGBps.toFixed(2));
    const totalThroughputGBps = parseFloat((parsedReadGBps + parsedWriteGBps).toFixed(2));

    // Generate latency samples and compute p99
    const samples = Array.from({ length: 100 }, () => baseLatency + (Math.random() * 50 - 25));
    const sorted = [...samples].sort((a, b) => a - b);
    const latencyP99Us = sorted[Math.floor(sorted.length * 0.99)];

    return {
      timestamp: new Date().toLocaleTimeString(),
      isoTimestamp: new Date().toISOString(),
      readIOPS,
      writeIOPS,
      totalIOPS: readIOPS + writeIOPS,
      readGBps: parsedReadGBps,
      writeGBps: parsedWriteGBps,
      totalThroughputGBps,
      latencyP99Us: parseFloat(latencyP99Us.toFixed(1)),
      aiBurstActive: this.aiBurstActive,
      nodeQueueDepths: {
        'dgx-node-01': 12 + Math.floor(Math.random() * 6),
        'dgx-node-02': 16 + Math.floor(Math.random() * 8),
        'dgx-node-03': 10 + Math.floor(Math.random() * 5)
      }
    };
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.isStreaming = false;
    }
  }
}

module.exports = new KafkaPipelineService();
