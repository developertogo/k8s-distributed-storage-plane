import React from 'react';
import telemetryClient from '../services/websocket';
import mockService from '../services/mockTelemetryService';

export default function Navbar({ mode, isBurstActive }) {
  const handleTriggerBurst = () => {
    telemetryClient.triggerAiBurst(8);
  };

  const handleManualReconcile = () => {
    mockService.addOperatorLog('reconcile', 'Manual K8s Operator reconciliation triggered by cluster operator.');
  };

  return (
    <nav className="navbar navbar-expand-lg border-bottom px-4 py-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="container-fluid px-0">
        <div className="d-flex align-items-center">
          <div className="me-3 p-2 rounded" style={{ backgroundColor: 'rgba(118, 185, 0, 0.15)', border: '1px solid var(--nvidia-green)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 6H20M4 12H20M4 18H20" stroke="#76b900" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-bold text-white tracking-wide">DGX Storage Plane</h5>
              <span className={`badge ${mode === 'LIVE' ? 'badge-live' : 'badge-demo'}`}>
                {mode === 'LIVE' ? '● LIVE INFRASTRUCTURE' : '● ZERO-DEPENDENCY DEMO'}
              </span>
            </div>
            <small className="text-muted" style={{ fontSize: '0.78rem' }}>
              Kubernetes Storage Operator & CSI Telemetry Controller
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            className={`btn btn-sm ${isBurstActive ? 'btn-danger' : 'btn-nvidia-outline'} d-flex align-items-center gap-2`}
            onClick={handleTriggerBurst}
            disabled={isBurstActive}
          >
            <span className="spinner-grow spinner-grow-sm" role="status" style={{ display: isBurstActive ? 'inline-block' : 'none' }}></span>
            {isBurstActive ? 'AI Checkpoint Burst Active...' : '⚡ Simulate AI Checkpoint Burst'}
          </button>

          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 text-light"
            onClick={handleManualReconcile}
          >
            <span>🔄 Reconcile CRDs</span>
          </button>

          <div className="border-start ps-3 ms-1" style={{ borderColor: 'var(--border-color)' }}>
            <span className="badge bg-secondary text-light">NVMe-oF / RoCEv2</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
