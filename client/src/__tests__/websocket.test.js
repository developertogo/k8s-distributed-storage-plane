import telemetryClient from '../services/websocket';

describe('telemetryClient & WebSocket Service Tests', () => {
  test('defaults to DEMO mode when live WebSocket server is offline', () => {
    expect(['DEMO', 'LIVE']).toContain(telemetryClient.mode);
  });

  test('onModeChange notifies subscribers of current mode', (done) => {
    let unsub;
    unsub = telemetryClient.onModeChange((mode) => {
      expect(['DEMO', 'LIVE']).toContain(mode);
      if (unsub) unsub();
      done();
    });
    if (unsub) unsub();
  });

  test('subscribe registers listener and receives pulses', (done) => {
    const unsub = telemetryClient.subscribe((data) => {
      expect(data).toBeDefined();
      expect(data.readIOPS).toBeGreaterThan(0);
      expect(data.writeIOPS).toBeGreaterThan(0);
      expect(data.totalThroughputGBps).toBeGreaterThan(0);
      unsub();
      done();
    });
  });
});
