import React from 'react';

export default function ClusterOverview({ telemetry, cluster, nodes }) {
  const currentTelemetry = telemetry || {
    totalThroughputGBps: 48.6,
    totalIOPS: 760000,
    readIOPS: 640000,
    writeIOPS: 120000,
    latencyP99Us: 142.5
  };

  const currentCluster = cluster || {
    totalCapacityGB: 620000,
    allocatedCapacityGB: 245000,
    tier: 'direct-nvme',
    fabric: 'RoCE-v2'
  };

  // Storage Performance Formula: utilization_ratio = used_capacity_bytes / total_capacity_bytes
  const utilizationRatio = currentCluster.totalCapacityGB > 0
    ? ((currentCluster.allocatedCapacityGB / currentCluster.totalCapacityGB) * 100).toFixed(1)
    : 0;

  const currentNodes = nodes && nodes.length > 0 ? nodes : [
    { id: 'dgx-node-01', status: 'Ready', nvmeSlots: 8, queueDepth: 14, latencyUs: 112 },
    { id: 'dgx-node-02', status: 'Ready', nvmeSlots: 8, queueDepth: 19, latencyUs: 148 },
    { id: 'dgx-node-03', status: 'Ready', nvmeSlots: 8, queueDepth: 11, latencyUs: 98 }
  ];

  return (
    <div className="mb-4">
      {/* Stat Counter Grid */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-3">
          <div className="storage-card p-3 h-100">
            <div className="stat-label">Aggregate Bandwidth</div>
            <div className="d-flex align-items-baseline">
              <span className="stat-value" style={{ color: 'var(--nvidia-green)' }}>
                {currentTelemetry.totalThroughputGBps || 0}
              </span>
              <span className="stat-unit">GB/s</span>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
              Read: {currentTelemetry.readGBps || 0} GB/s · Write: {currentTelemetry.writeGBps || 0} GB/s
            </div>
          </div>
        </div>

        <div className="col-12 col-md-3">
          <div className="storage-card p-3 h-100">
            <div className="stat-label">Distributed IOPS</div>
            <div className="d-flex align-items-baseline">
              <span className="stat-value" style={{ color: 'var(--cyan-accent)' }}>
                {((currentTelemetry.totalIOPS || 0) / 1000).toFixed(1)}k
              </span>
              <span className="stat-unit">IOPS</span>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
              R: {((currentTelemetry.readIOPS || 0) / 1000).toFixed(0)}k · W: {((currentTelemetry.writeIOPS || 0) / 1000).toFixed(0)}k
            </div>
          </div>
        </div>

        <div className="col-12 col-md-3">
          <div className="storage-card p-3 h-100">
            <div className="stat-label">P99 Storage Latency</div>
            <div className="d-flex align-items-baseline">
              <span className="stat-value" style={{ color: currentTelemetry.latencyP99Us > 300 ? 'var(--amber-alert)' : 'var(--text-primary)' }}>
                {currentTelemetry.latencyP99Us || 0}
              </span>
              <span className="stat-unit">µs</span>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
              Target SLA: &lt; 250 µs on PCIe Gen5
            </div>
          </div>
        </div>

        <div className="col-12 col-md-3">
          <div className="storage-card p-3 h-100">
            <div className="stat-label">Storage Pool Allocation</div>
            <div className="d-flex align-items-baseline">
              <span className="stat-value">{utilizationRatio}</span>
              <span className="stat-unit">%</span>
            </div>
            <div className="progress mt-2" style={{ height: '6px', backgroundColor: '#21262d' }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${utilizationRatio}%`, backgroundColor: 'var(--nvidia-green)' }}
              ></div>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
              {(currentCluster.allocatedCapacityGB / 1000).toFixed(1)} TB of {(currentCluster.totalCapacityGB / 1000).toFixed(0)} TB allocated
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Node Cluster Topology */}
      <div className="storage-card p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 fw-semibold text-white d-flex align-items-center gap-2">
            <span>Cluster Topology & NVMe Fabric</span>
            <span className="badge bg-dark border text-muted">3 Nodes Online</span>
          </h6>
          <small className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
            Interconnect: {currentCluster.fabric} · PCIe Gen5 x16
          </small>
        </div>

        <div className="row g-3">
          {currentNodes.map((node) => (
            <div key={node.id} className="col-12 col-md-4">
              <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold font-monospace text-white" style={{ fontSize: '0.9rem' }}>
                    {node.id}
                  </span>
                  <span className="badge badge-nvidia" style={{ fontSize: '0.7rem' }}>
                    {node.status}
                  </span>
                </div>
                <div className="row g-2 mt-1">
                  <div className="col-6">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>NVMe Slots</div>
                    <div className="fw-semibold font-monospace" style={{ fontSize: '0.85rem' }}>8x 15.3TB U.2</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>NVMe Queue Depth</div>
                    <div className="fw-semibold font-monospace" style={{ fontSize: '0.85rem', color: node.queueDepth > 30 ? 'var(--amber-alert)' : 'inherit' }}>
                      {node.queueDepth} cmds
                    </div>
                  </div>
                  <div className="col-6 mt-2">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Direct Bypass</div>
                    <div className="fw-semibold font-monospace text-success" style={{ fontSize: '0.85rem' }}>ENABLED</div>
                  </div>
                  <div className="col-6 mt-2">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Service Latency</div>
                    <div className="fw-semibold font-monospace" style={{ fontSize: '0.85rem' }}>
                      {node.latencyUs} µs
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
