require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  wsPort: parseInt(process.env.WS_PORT, 10) || 5001,
  kafkaBrokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/storage_plane',
  clusterName: process.env.CLUSTER_NAME || 'dgx-storage-cluster-prod',
  defaultTier: process.env.DEFAULT_TIER || 'direct-nvme',
  fabric: process.env.NETWORK_FABRIC || 'RoCE-v2',
  nodes: ['dgx-node-01', 'dgx-node-02', 'dgx-node-03'],
  telemetryIntervalMs: 1000
};
