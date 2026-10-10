import React, { act } from 'react';
import * as ReactDOMClient from 'react-dom/client';
import ReactDOMServer from 'react-dom/server';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('c3', () => ({
  generate: jest.fn(() => ({
    flow: jest.fn(),
    load: jest.fn(),
    unload: jest.fn(),
    destroy: jest.fn()
  }))
}));

import Navbar from '../components/Navbar';
import ClusterOverview from '../components/ClusterOverview';
import VolumeManager from '../components/VolumeManager';
import OperatorStatus from '../components/OperatorStatus';
import C3TelemetryChart from '../components/C3TelemetryChart';
import App from '../App';
import mockService from '../services/mockTelemetryService';
import c3 from 'c3';

describe('UI React Components Comprehensive Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Navbar Component', () => {
    test('renders brand title and DEMO badge when in demo mode', () => {
      const html = ReactDOMServer.renderToString(
        <Navbar mode="DEMO" isBurstActive={false} />
      );
      expect(html).toContain('DGX Storage Plane');
      expect(html).toContain('ZERO-DEPENDENCY DEMO');
      expect(html).toContain('badge-demo');
      expect(html).toContain('Simulate AI Checkpoint Burst');
      expect(html).toContain('NVMe-oF / RoCEv2');
    });

    test('renders LIVE badge and burst active state properly', () => {
      const html = ReactDOMServer.renderToString(
        <Navbar mode="LIVE" isBurstActive={true} />
      );
      expect(html).toContain('LIVE INFRASTRUCTURE');
      expect(html).toContain('badge-live');
      expect(html).toContain('AI Checkpoint Burst Active...');
      expect(html).toContain('btn-danger');
    });
  });

  describe('ClusterOverview Component', () => {
    test('renders aggregate bandwidth, IOPS, and storage utilization formulas', () => {
      const telemetry = {
        totalThroughputGBps: 52.4,
        readGBps: 44.1,
        writeGBps: 8.3,
        totalIOPS: 810000,
        readIOPS: 680000,
        writeIOPS: 130000,
        latencyP99Us: 125.4
      };
      const cluster = {
        totalCapacityGB: 600000,
        allocatedCapacityGB: 240000,
        tier: 'direct-nvme',
        fabric: 'RoCE-v2'
      };
      const nodes = [
        { id: 'dgx-node-01', status: 'Ready', nvmeSlots: 8, queueDepth: 14, latencyUs: 110 },
        { id: 'dgx-node-02', status: 'Ready', nvmeSlots: 8, queueDepth: 18, latencyUs: 135 },
        { id: 'dgx-node-03', status: 'Ready', nvmeSlots: 8, queueDepth: 12, latencyUs: 105 }
      ];

      const html = ReactDOMServer.renderToString(
        <ClusterOverview telemetry={telemetry} cluster={cluster} nodes={nodes} />
      );

      // Verify throughput & IOPS metrics
      expect(html).toContain('52.4');
      expect(html).toContain('GB/s');
      expect(html).toContain('810.0');
      expect(html).toContain('IOPS');

      // Verify latency
      expect(html).toContain('125.4');
      expect(html).toContain('µs');

      // Verify utilization calculation: (240000 / 600000) * 100 = 40.0%
      expect(html).toContain('40.0%');

      // Verify node cards
      expect(html).toContain('dgx-node-01');
      expect(html).toContain('dgx-node-02');
      expect(html).toContain('dgx-node-03');
    });

    test('falls back gracefully to default values when props are omitted', () => {
      const html = ReactDOMServer.renderToString(<ClusterOverview />);
      expect(html).toContain('Aggregate Bandwidth');
      expect(html).toContain('Distributed IOPS');
      expect(html).toContain('P99 Storage Latency');
      expect(html).toContain('Storage Pool Allocation');
      expect(html).toContain('dgx-node-01');
    });
  });

  describe('VolumeManager Component', () => {
    test('renders volume list with capacity, direct storage badges, and actions', () => {
      const html = ReactDOMServer.renderToString(<VolumeManager mode="DEMO" />);
      expect(html).toContain('StorageVolumeClaims &amp; CSI Provisioned Disks');
      expect(html).toContain('Provision Volume');
      expect(html).toContain('nvme-direct-pool');
      expect(html).toContain('BYPASS ON');

      // Verify initial volumes from mockService are present
      mockService.volumes.forEach((vol) => {
        expect(html).toContain(vol.name);
      });
    });
  });

  describe('OperatorStatus Component (DOM Lifecycle & Subscriptions)', () => {
    let container;
    let root;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      root = ReactDOMClient.createRoot(container);
    });

    afterEach(() => {
      act(() => {
        root.unmount();
      });
      container.remove();
    });

    test('renders operator reconciliation stream and updates when events are published', () => {
      mockService.addOperatorLog('reconcile', 'Cluster state reconciled: 3 nodes healthy');
      mockService.addOperatorLog('burst', 'AI Checkpoint burst event recorded');

      act(() => {
        root.render(<OperatorStatus />);
      });

      expect(container.textContent).toContain('Kubernetes Storage Operator Reconciliation Stream');
      expect(container.textContent).toContain('CRD Watcher Active (5s Loop)');
      expect(container.textContent).toContain('RECONCILE');
      expect(container.textContent).toContain('Cluster state reconciled: 3 nodes healthy');
      expect(container.textContent).toContain('BURST');
      expect(container.textContent).toContain('AI Checkpoint burst event recorded');
    });
  });

  describe('C3TelemetryChart Component', () => {
    let container;
    let root;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      root = ReactDOMClient.createRoot(container);
    });

    afterEach(() => {
      act(() => {
        root.unmount();
      });
      container.remove();
    });

    test('mounts 4 chart DOM containers and invokes C3 chart generation', () => {
      act(() => {
        root.render(
          <C3TelemetryChart
            telemetry={{
              readGBps: 45.2,
              writeGBps: 8.5,
              latencyP99Us: 110,
              readIOPS: 650000,
              writeIOPS: 120000,
              nodes: [
                { id: 'dgx-node-01', queueDepth: 14, latencyUs: 112 },
                { id: 'dgx-node-02', queueDepth: 19, latencyUs: 148 },
                { id: 'dgx-node-03', queueDepth: 11, latencyUs: 98 }
              ]
            }}
          />
        );
      });

      expect(container.textContent).toContain('Dual-Axis Throughput & P99 Latency Spline');
      expect(container.textContent).toContain('Storage Pool Tiering');
      expect(container.textContent).toContain('Read vs. Write IOPS Dynamics');
      expect(container.textContent).toContain('Storage Node Queue Depth & Service Latency');
      expect(c3.generate).toHaveBeenCalledTimes(4);
    });
  });

  describe('App Main Container Component', () => {
    test('renders entire dashboard hierarchy with footer', () => {
      const html = ReactDOMServer.renderToString(<App />);
      expect(html).toContain('DGX Storage Plane');
      expect(html).toContain('Aggregate Bandwidth');
      expect(html).toContain('StorageVolumeClaims &amp; CSI Provisioned Disks');
      expect(html).toContain('Kubernetes Storage Operator Reconciliation Stream');
      expect(html).toContain('DGX Cloud Storage Plane · Kubernetes Storage Operator, CSI Plugin &amp; Telemetry Management Plane');
    });
  });
});
