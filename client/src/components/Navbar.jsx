import React from 'react';
import telemetryClient from '../services/websocket';
import mockService from '../services/mockTelemetryService';

export default function Navbar({ mode, isBurstActive }) {
  const [showDrawer, setShowDrawer] = React.useState(false);
  const [reconciling, setReconciling] = React.useState(false);

  const handleTriggerBurst = () => {
    telemetryClient.triggerAiBurst(8);
  };

  const handleManualReconcile = () => {
    setReconciling(true);
    mockService.addOperatorLog('reconcile', 'Manual K8s Operator reconciliation triggered by cluster operator.');
    setTimeout(() => {
      mockService.addOperatorLog('reconcile', 'Reconciler finished: DistributedStorageCluster synchronized. All volumes active.');
      setReconciling(false);
    }, 800);
  };

  // Smart resolution for Swagger API Docs URL:
  // On localhost/127.0.0.1, defaults to http://localhost:5000/api-docs (or REACT_APP_API_URL/api-docs)
  // On GitHub Pages or custom domain, uses relative ./api-docs / https://developertogo.github.io/k8s-distributed-storage-plane/api-docs
  const getSwaggerDocsUrl = () => {
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        return process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api-docs` : 'http://localhost:5000/api-docs';
      }
      const baseUrl = process.env.PUBLIC_URL || '';
      return `${baseUrl}/api-docs`;
    }
    return 'http://localhost:5000/api-docs';
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg border-bottom px-4 py-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="container-fluid px-0">
          <div className="d-flex align-items-center">
            <button
              className="me-3 p-2 rounded btn btn-link p-0 text-decoration-none"
              style={{ backgroundColor: 'rgba(118, 185, 0, 0.15)', border: '1px solid var(--nvidia-green)', cursor: 'pointer' }}
              onClick={() => setShowDrawer(!showDrawer)}
              title="Toggle Cluster Navigation Drawer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="#76b900" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
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
            disabled={reconciling}
          >
            <span className={reconciling ? "spinner-border spinner-border-sm text-success" : ""} role="status"></span>
            <span>{reconciling ? "Reconciling..." : "🔄 Reconcile CRDs"}</span>
          </button>

          <a
            href={getSwaggerDocsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline-info d-flex align-items-center gap-1 text-decoration-none"
            title="Open Interactive Swagger / OpenAPI Specification"
          >
            <span>📜</span>
            <span>Swagger API</span>
          </a>

          <div className="border-start ps-3 ms-1" style={{ borderColor: 'var(--border-color)' }}>
            <span className="badge bg-secondary text-light">NVMe-oF / RoCEv2</span>
          </div>
        </div>
      </div>
    </nav>

    {/* Side Navigation Drawer */}
    {showDrawer && (
      <>
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 1040 }}
          onClick={() => setShowDrawer(false)}
        ></div>
        <div
          className="position-fixed top-0 start-0 h-100 p-4 shadow-lg"
          style={{
            width: '320px',
            backgroundColor: 'var(--bg-card)',
            borderRight: '1px solid var(--border-color)',
            zIndex: 1050,
            overflowY: 'auto'
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
            <div className="d-flex align-items-center gap-2">
              <span className="badge badge-nvidia">K8S PLANE</span>
              <h6 className="mb-0 text-white fw-bold">Cluster Control</h6>
            </div>
            <button
              className="btn btn-sm btn-outline-secondary text-light py-0 px-2"
              onClick={() => setShowDrawer(false)}
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <div className="text-muted text-uppercase mb-2" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              Platform Navigation
            </div>
            <div className="list-group list-group-flush bg-transparent">
              <a href="#cluster-topology" onClick={() => setShowDrawer(false)} className="list-group-item list-group-item-action bg-transparent text-light border-0 py-2 px-0 d-flex align-items-center gap-2">
                <span>🖥️</span> Cluster Topology & Fabric
              </a>
              <a href="#telemetry-charts" onClick={() => setShowDrawer(false)} className="list-group-item list-group-item-action bg-transparent text-light border-0 py-2 px-0 d-flex align-items-center gap-2">
                <span>📈</span> Real-Time Telemetry Charts
              </a>
              <a href="#volume-claims" onClick={() => setShowDrawer(false)} className="list-group-item list-group-item-action bg-transparent text-light border-0 py-2 px-0 d-flex align-items-center gap-2">
                <span>💾</span> StorageVolumeClaims & CSI
              </a>
              <a href="#operator-stream" onClick={() => setShowDrawer(false)} className="list-group-item list-group-item-action bg-transparent text-light border-0 py-2 px-0 d-flex align-items-center gap-2">
                <span>⚙️</span> Storage Operator Stream
              </a>
              <a href={getSwaggerDocsUrl()} target="_blank" rel="noopener noreferrer" onClick={() => setShowDrawer(false)} className="list-group-item list-group-item-action bg-transparent text-info border-0 py-2 px-0 d-flex align-items-center gap-2">
                <span>📜</span> Interactive Swagger / OpenAPI
              </a>
            </div>
          </div>

          <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>Cluster ID</div>
            <div className="font-monospace text-white fw-bold mb-2" style={{ fontSize: '0.85rem' }}>dgx-storage-cluster-prod</div>
            <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.72rem' }}>
              <span>Orchestrator:</span>
              <span className="text-success font-monospace">Kind v1.30.0</span>
            </div>
            <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.72rem' }}>
              <span>CSI Interface:</span>
              <span className="text-info font-monospace">DirectStorage 1.2</span>
            </div>
          </div>

          <button
            className="btn btn-sm btn-nvidia w-100"
            onClick={() => {
              setShowDrawer(false);
              handleTriggerBurst();
            }}
            disabled={isBurstActive}
          >
            ⚡ Trigger AI Checkpoint Burst
          </button>
        </div>
      </>
    )}
  </>
);
}
