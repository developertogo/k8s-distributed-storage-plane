/**
 * k8s-distributed-storage-plane: Central Management API Gateway & WebSocket Hub
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const config = require('./config');
const dbManager = require('./db/mongoClient');
const kafkaService = require('./kafka/kafkaService');

const clusterRoutes = require('./routes/clusterRoutes');
const volumeRoutes = require('./routes/volumeRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');
const docsRoutes = require('./routes/docsRoutes');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes & Documentation
app.use('/api-docs', docsRoutes);
app.use('/api/cluster', clusterRoutes);
app.use('/api/volumes', volumeRoutes);
app.use('/api/telemetry', telemetryRoutes);

// Health Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'k8s-distributed-storage-plane',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// WebSocket Telemetry Hub
const wss = new WebSocketServer({ port: config.wsPort });
console.log(`[WebSocket Hub] Listening on ws://0.0.0.0:${config.wsPort}`);

const connectedClients = new Set();

wss.on('connection', (ws) => {
  connectedClients.add(ws);
  console.log(`[WebSocket Hub] Client connected. Total active clients: ${connectedClients.size}`);

  ws.send(JSON.stringify({
    type: 'WELCOME',
    message: 'Connected to High-Performance Storage Telemetry Stream',
    cluster: config.clusterName
  }));

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log(`[WebSocket Hub] Client disconnected. Total active clients: ${connectedClients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket Hub] Socket error:', err.message);
    connectedClients.delete(ws);
  });
});

// Forward Kafka streaming pulses to all WebSocket clients
kafkaService.on('telemetry', (snapshot) => {
  const payload = JSON.stringify({ type: 'TELEMETRY_PULSE', data: snapshot });
  for (const client of connectedClients) {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  }
});

kafkaService.on('alert', (alert) => {
  const payload = JSON.stringify({ type: 'CLUSTER_ALERT', data: alert });
  for (const client of connectedClients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
});

// Bootstrap Services
async function bootstrap() {
  try {
    await dbManager.init(config.mongoUri);
    await kafkaService.init(config.kafkaBrokers);

    server.listen(config.port, () => {
      console.log(`[API Gateway] Storage Management Plane API running at http://0.0.0.0:${config.port}`);
      console.log(`[Swagger UI] Interactive API Documentation live at http://0.0.0.0:${config.port}/api-docs`);
      console.log(`[Architecture] Ready for high-throughput AI workloads and CSI orchestration.`);
    });
  } catch (err) {
    console.error('[Bootstrap] Initialization error:', err);
    process.exit(1);
  }
}

bootstrap();

module.exports = { app, server, wss };
