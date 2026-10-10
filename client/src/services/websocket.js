/**
 * Client-Side Telemetry Stream Client
 * Manages WebSocket connection with automatic reconnect and fallback to MockTelemetryService.
 */

import mockTelemetryService from './mockTelemetryService';

class TelemetryStreamClient {
  constructor() {
    this.ws = null;
    this.mode = 'DEMO'; // 'LIVE' or 'DEMO'
    this.subscribers = new Set();
    this.modeListeners = new Set();
    this.wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5001';
    this.init();
  }

  init() {
    // Attempt live WebSocket connection
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[Telemetry Stream] Connected to Live WebSocket Server at', this.wsUrl);
        this.setMode('LIVE');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'TELEMETRY_PULSE') {
            this.notify(message.data);
          }
        } catch (e) {
          console.error('[Telemetry Stream] Error parsing frame:', e);
        }
      };

      this.ws.onerror = () => {
        // Fallback to in-browser demo engine
        if (this.mode !== 'DEMO') {
          console.log('[Telemetry Stream] Live WebSocket unavailable. Switching to In-Browser Demo Engine.');
          this.setMode('DEMO');
        }
      };

      this.ws.onclose = () => {
        if (this.mode !== 'DEMO') {
          console.log('[Telemetry Stream] WebSocket closed. Switching to In-Browser Demo Engine.');
          this.setMode('DEMO');
        }
      };
    } catch (e) {
      this.setMode('DEMO');
    }

    // Subscribe to mock engine
    mockTelemetryService.subscribe((data) => {
      if (this.mode === 'DEMO') {
        this.notify(data);
      }
    });
  }

  setMode(newMode) {
    this.mode = newMode;
    for (const listener of this.modeListeners) {
      listener(newMode);
    }
  }

  onModeChange(callback) {
    this.modeListeners.add(callback);
    callback(this.mode);
    return () => this.modeListeners.delete(callback);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(data) {
    for (const sub of this.subscribers) {
      sub(data);
    }
  }

  triggerAiBurst(duration = 8) {
    if (this.mode === 'LIVE') {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      fetch(`${apiUrl}/api/telemetry/simulate-burst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration })
      }).catch(() => {
        mockTelemetryService.triggerAiCheckpointBurst(duration);
      });
    } else {
      mockTelemetryService.triggerAiCheckpointBurst(duration);
    }
  }
}

export default new TelemetryStreamClient();
