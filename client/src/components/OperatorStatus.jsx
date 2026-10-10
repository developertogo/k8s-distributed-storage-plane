import React, { useState, useEffect } from 'react';
import mockService from '../services/mockTelemetryService';

export default function OperatorStatus() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const unsubscribe = mockService.subscribeOperatorLogs((newLogs) => {
      setLogs([...newLogs]);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="storage-card p-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center gap-2">
          <div className="spinner-grow spinner-grow-sm text-success" role="status"></div>
          <h6 className="mb-0 fw-semibold text-white">Kubernetes Storage Operator Reconciliation Stream</h6>
        </div>
        <span className="badge badge-dark-custom">
          CRD Watcher Active (5s Loop)
        </span>
      </div>

      <div className="terminal-window">
        {logs.length === 0 ? (
          <div className="text-muted">Listening for operator reconciliation events...</div>
        ) : (
          logs.map((log, idx) => {
            let typeColor = 'log-reconcile';
            if (log.type === 'burst') typeColor = 'log-burst';
            if (log.type === 'csi') typeColor = 'log-csi';

            return (
              <div key={idx} className="log-entry">
                <span className="log-time">[{log.timestamp}]</span>
                <span className={`fw-bold me-2 ${typeColor}`}>
                  [{log.type.toUpperCase()}]
                </span>
                <span className="text-light">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
