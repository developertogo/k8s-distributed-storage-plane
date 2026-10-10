import React, { useState } from 'react';
import mockService from '../services/mockTelemetryService';

export default function VolumeManager({ mode }) {
  const [volumes, setVolumes] = useState(mockService.volumes);
  const [showModal, setShowModal] = useState(false);
  const [newVolume, setNewVolume] = useState({
    name: 'transformer-weights-v2',
    sizeGB: 1500,
    storagePool: 'nvme-direct-pool',
    directStorage: true,
    targetNode: 'dgx-node-03'
  });

  const handleCreateVolume = (e) => {
    e.preventDefault();
    const created = mockService.provisionVolume(newVolume);
    setVolumes([...mockService.volumes]);
    setShowModal(false);
  };

  const handleDeleteVolume = (volId) => {
    mockService.deleteVolume(volId);
    setVolumes([...mockService.volumes]);
  };

  const handleMigrateNode = (volId) => {
    const vol = volumes.find(v => v.id === volId);
    if (!vol) return;
    const target = vol.attachedNode === 'dgx-node-01' ? 'dgx-node-02' : 'dgx-node-01';
    mockService.migrateVolume(volId, target);
    setVolumes([...mockService.volumes]);
  };

  return (
    <div className="storage-card p-3 mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 className="mb-0 fw-semibold text-white">StorageVolumeClaims & CSI Provisioned Disks</h6>
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>
            Managed via Kubernetes CSI Driver & Custom Volume Controller
          </small>
        </div>
        <button
          className="btn btn-sm btn-nvidia d-flex align-items-center gap-1"
          onClick={() => setShowModal(true)}
        >
          <span>＋</span> Provision Volume
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-dark-custom mb-0">
          <thead>
            <tr>
              <th>Volume Name / ID</th>
              <th>Size</th>
              <th>Storage Pool</th>
              <th>Direct Storage</th>
              <th>Attached Node</th>
              <th>Max Bandwidth</th>
              <th>IOPS Limit</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {volumes.map((vol) => (
              <tr key={vol.id}>
                <td>
                  <div className="fw-semibold text-white">{vol.name}</div>
                  <small className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>
                    {vol.id}
                  </small>
                </td>
                <td className="font-monospace fw-semibold">{vol.sizeGB} GB</td>
                <td>
                  <span className={`badge ${vol.storagePool === 'nvme-direct-pool' ? 'bg-primary' : 'bg-secondary'}`} style={{ fontSize: '0.72rem' }}>
                    {vol.storagePool}
                  </span>
                </td>
                <td>
                  {vol.directStorageEnabled ? (
                    <span className="badge badge-nvidia" style={{ fontSize: '0.7rem' }}>BYPASS ON</span>
                  ) : (
                    <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>HOST BUFFER</span>
                  )}
                </td>
                <td className="font-monospace text-light">{vol.attachedNode}</td>
                <td className="font-monospace text-success">{vol.bandwidthGBps} GB/s</td>
                <td className="font-monospace text-info">{(vol.iopsLimit / 1000).toFixed(0)}k</td>
                <td>
                  <span className="badge bg-success" style={{ fontSize: '0.7rem' }}>{vol.phase}</span>
                </td>
                <td className="text-end">
                  <div className="btn-group btn-group-sm">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      title="Migrate to alternate node via async.queue"
                      onClick={() => handleMigrateNode(vol.id)}
                    >
                      ⇄ Migrate
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      title="De-provision volume via CSI DeleteVolume"
                      onClick={() => handleDeleteVolume(vol.id)}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Provision Volume Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              <div className="modal-header border-secondary">
                <h6 className="modal-title text-white fw-bold">Provision Distributed Volume Claim</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateVolume}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-muted" style={{ fontSize: '0.8rem' }}>Volume Claim Name</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary font-monospace"
                      value={newVolume.name}
                      onChange={(e) => setNewVolume({ ...newVolume, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label text-muted" style={{ fontSize: '0.8rem' }}>Capacity (GB)</label>
                      <input
                        type="number"
                        className="form-control bg-dark text-light border-secondary font-monospace"
                        value={newVolume.sizeGB}
                        onChange={(e) => setNewVolume({ ...newVolume, sizeGB: e.target.value })}
                        required
                        min="10"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-muted" style={{ fontSize: '0.8rem' }}>Target Node</label>
                      <select
                        className="form-select bg-dark text-light border-secondary font-monospace"
                        value={newVolume.targetNode}
                        onChange={(e) => setNewVolume({ ...newVolume, targetNode: e.target.value })}
                      >
                        <option value="dgx-node-01">dgx-node-01</option>
                        <option value="dgx-node-02">dgx-node-02</option>
                        <option value="dgx-node-03">dgx-node-03</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted" style={{ fontSize: '0.8rem' }}>Storage Performance Pool</label>
                    <select
                      className="form-select bg-dark text-light border-secondary"
                      value={newVolume.storagePool}
                      onChange={(e) => setNewVolume({ ...newVolume, storagePool: e.target.value })}
                    >
                      <option value="nvme-direct-pool">nvme-direct-pool (PCIe Gen5, Direct GPU Bypass, 64 GB/s)</option>
                      <option value="ssd-shared-pool">ssd-shared-pool (SATA/SAS SSD Shared Tier, 25 GB/s)</option>
                    </select>
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="directStorageCheck"
                      checked={newVolume.directStorage}
                      onChange={(e) => setNewVolume({ ...newVolume, directStorage: e.target.checked })}
                    />
                    <label className="form-check-label text-light" htmlFor="directStorageCheck" style={{ fontSize: '0.85rem' }}>
                      Enable Direct GPU/Accelerator Storage Bypass (Zero-Copy)
                    </label>
                  </div>
                </div>
                <div className="modal-footer border-secondary">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-nvidia">
                    Execute CSI Provisioning
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
