import React, { useState, useEffect } from 'react';
import telemetryClient from './services/websocket';
import Navbar from './components/Navbar';
import ClusterOverview from './components/ClusterOverview';
import C3TelemetryChart from './components/C3TelemetryChart';
import VolumeManager from './components/VolumeManager';
import OperatorStatus from './components/OperatorStatus';

export default function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [mode, setMode] = useState('DEMO');

  useEffect(() => {
    const unsubTelemetry = telemetryClient.subscribe((data) => {
      setTelemetry(data);
    });

    const unsubMode = telemetryClient.onModeChange((newMode) => {
      setMode(newMode);
    });

    return () => {
      unsubTelemetry();
      unsubMode();
    };
  }, []);

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Navbar mode={mode} isBurstActive={telemetry?.isBurstActive || false} />

      <main className="container-fluid px-4 py-4 flex-grow-1">
        <div id="cluster-topology">
          <ClusterOverview
            telemetry={telemetry}
            cluster={telemetry?.cluster}
            nodes={telemetry?.nodes}
          />
        </div>

        <div id="telemetry-charts">
          <C3TelemetryChart telemetry={telemetry} />
        </div>

        <div id="volume-claims">
          <VolumeManager mode={mode} />
        </div>

        <div id="operator-stream">
          <OperatorStatus />
        </div>
      </main>

      <footer className="border-top py-3 text-center text-muted" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', fontSize: '0.8rem' }}>
        <span>DGX Cloud Storage Plane · Kubernetes Storage Operator, CSI Plugin & Telemetry Management Plane</span>
      </footer>
    </div>
  );
}
