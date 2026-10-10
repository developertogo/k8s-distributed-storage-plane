/**
 * k8s-distributed-storage-plane: C3.js (c3j) & jQuery Visualization Suite
 * Features 4 live interactive C3 charts:
 * 1. Dual-Axis Throughput & P99 Latency Spline (.flow dynamic streaming)
 * 2. Read vs. Write IOPS Dynamics Area-Spline
 * 3. Storage Pool Tiering & Capacity Donut
 * 4. Storage Node Queue Depth & Service Latency Bar Chart
 */

import React, { useEffect, useRef } from 'react';
import c3 from 'c3';
import $ from 'jquery';

export default function C3TelemetryChart({ telemetry }) {
  const chartThroughputRef = useRef(null);
  const chartIopsRef = useRef(null);
  const chartPoolRef = useRef(null);
  const chartNodesRef = useRef(null);

  const c3ThroughputInstance = useRef(null);
  const c3IopsInstance = useRef(null);
  const c3PoolInstance = useRef(null);
  const c3NodesInstance = useRef(null);

  // Buffer for history
  const historyRef = useRef({
    times: ['19:30:01', '19:30:02', '19:30:03', '19:30:04', '19:30:05'],
    readGBps: [38.2, 41.5, 39.8, 42.1, 40.5],
    writeGBps: [7.5, 8.1, 7.8, 8.4, 8.1],
    latencyP99: [115, 122, 118, 125, 120],
    readIOPS: [610000, 664000, 636000, 673000, 648000],
    writeIOPS: [120000, 129000, 124000, 134000, 129000]
  });

  useEffect(() => {
    // 1. Dual-Axis Throughput & P99 Latency Chart
    if (chartThroughputRef.current && !c3ThroughputInstance.current) {
      c3ThroughputInstance.current = c3.generate({
        bindto: chartThroughputRef.current,
        data: {
          x: 'x',
          columns: [
            ['x', ...historyRef.current.times],
            ['Read Bandwidth (GB/s)', ...historyRef.current.readGBps],
            ['Write Bandwidth (GB/s)', ...historyRef.current.writeGBps],
            ['P99 Latency (µs)', ...historyRef.current.latencyP99]
          ],
          axes: {
            'Read Bandwidth (GB/s)': 'y',
            'Write Bandwidth (GB/s)': 'y',
            'P99 Latency (µs)': 'y2'
          },
          type: 'spline',
          colors: {
            'Read Bandwidth (GB/s)': '#76b900',
            'Write Bandwidth (GB/s)': '#00b4d8',
            'P99 Latency (µs)': '#ffb703'
          }
        },
        axis: {
          x: {
            type: 'category',
            tick: { rotate: -25, multiline: false }
          },
          y: {
            label: { text: 'Throughput (GB/s)', position: 'outer-middle' },
            min: 0,
            padding: { bottom: 0 }
          },
          y2: {
            show: true,
            label: { text: 'P99 Latency (µs)', position: 'outer-middle' },
            min: 0,
            padding: { bottom: 0 }
          }
        },
        grid: {
          x: { show: false },
          y: { show: true }
        },
        point: { show: true, r: 2.5 }
      });
    }

    // 2. Read vs Write IOPS Area Spline Chart
    if (chartIopsRef.current && !c3IopsInstance.current) {
      c3IopsInstance.current = c3.generate({
        bindto: chartIopsRef.current,
        data: {
          x: 'x',
          columns: [
            ['x', ...historyRef.current.times],
            ['Read IOPS', ...historyRef.current.readIOPS],
            ['Write IOPS', ...historyRef.current.writeIOPS]
          ],
          types: {
            'Read IOPS': 'area-spline',
            'Write IOPS': 'area-spline'
          },
          colors: {
            'Read IOPS': '#76b900',
            'Write IOPS': '#ef233c'
          }
        },
        axis: {
          x: {
            type: 'category',
            tick: { rotate: -25, multiline: false }
          },
          y: {
            label: { text: 'Total IOPS', position: 'outer-middle' },
            tick: {
              format: (d) => `${(d / 1000).toFixed(0)}k`
            }
          }
        },
        grid: { y: { show: true } },
        point: { show: false }
      });
    }

    // 3. Storage Pool Capacity Allocation Donut Chart
    if (chartPoolRef.current && !c3PoolInstance.current) {
      c3PoolInstance.current = c3.generate({
        bindto: chartPoolRef.current,
        data: {
          columns: [
            ['NVMe Direct Tier (Allocated)', 42],
            ['SSD Shared Tier (Allocated)', 203],
            ['Unallocated Capacity', 375]
          ],
          type: 'donut',
          colors: {
            'NVMe Direct Tier (Allocated)': '#76b900',
            'SSD Shared Tier (Allocated)': '#00b4d8',
            'Unallocated Capacity': '#343a40'
          }
        },
        donut: {
          title: '620 TB Pool',
          width: 32
        }
      });
    }

    // 4. Storage Node Queue Depth & Service Latency Bar Chart
    if (chartNodesRef.current && !c3NodesInstance.current) {
      c3NodesInstance.current = c3.generate({
        bindto: chartNodesRef.current,
        data: {
          x: 'x',
          columns: [
            ['x', 'dgx-node-01', 'dgx-node-02', 'dgx-node-03'],
            ['Queue Depth (cmds)', 14, 19, 11],
            ['Latency (µs / 10)', 11.2, 14.8, 9.8]
          ],
          type: 'bar',
          colors: {
            'Queue Depth (cmds)': '#ffb703',
            'Latency (µs / 10)': '#76b900'
          }
        },
        axis: {
          x: { type: 'category' },
          y: { label: { text: 'Magnitude', position: 'outer-middle' } }
        },
        grid: { y: { show: true } }
      });
    }

    // jQuery modal and tooltip integration check
    $(() => {
      $('[data-bs-toggle="tooltip"]').tooltip?.();
    });
  }, []);

  // Handle live incoming telemetry streaming via C3 .flow()
  useEffect(() => {
    if (!telemetry || !c3ThroughputInstance.current) return;

    const time = telemetry.timestamp || new Date().toLocaleTimeString();

    // Flow new point into Throughput chart
    try {
      c3ThroughputInstance.current.flow({
        columns: [
          ['x', time],
          ['Read Bandwidth (GB/s)', telemetry.readGBps],
          ['Write Bandwidth (GB/s)', telemetry.writeGBps],
          ['P99 Latency (µs)', telemetry.latencyP99Us]
        ],
        length: 1,
        duration: 350
      });

      if (c3IopsInstance.current) {
        c3IopsInstance.current.flow({
          columns: [
            ['x', time],
            ['Read IOPS', telemetry.readIOPS],
            ['Write IOPS', telemetry.writeIOPS]
          ],
          length: 1,
          duration: 350
        });
      }

      if (c3NodesInstance.current && telemetry.nodes) {
        c3NodesInstance.current.load({
          columns: [
            ['x', 'dgx-node-01', 'dgx-node-02', 'dgx-node-03'],
            ['Queue Depth (cmds)', telemetry.nodes[0]?.queueDepth || 14, telemetry.nodes[1]?.queueDepth || 19, telemetry.nodes[2]?.queueDepth || 11],
            ['Latency (µs / 10)', (telemetry.nodes[0]?.latencyUs || 112) / 10, (telemetry.nodes[1]?.latencyUs || 148) / 10, (telemetry.nodes[2]?.latencyUs || 98) / 10]
          ]
        });
      }
    } catch (e) {
      // Ignore if chart is re-rendering
    }
  }, [telemetry]);

  return (
    <div className="row g-4 mb-4">
      {/* Chart 1: Dual-Axis Throughput & P99 Latency */}
      <div className="col-12 col-lg-8">
        <div className="storage-card p-3 h-100">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-0 fw-semibold text-white">Dual-Axis Throughput & P99 Latency Spline</h6>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                Primary Y: Read/Write Bandwidth (GB/s) · Secondary Y2: P99 Storage Latency (µs)
              </small>
            </div>
            <span className="badge bg-dark border text-success font-monospace" style={{ fontSize: '0.75rem' }}>
              .flow() Dynamic
            </span>
          </div>
          <div ref={chartThroughputRef} style={{ minHeight: '260px' }}></div>
        </div>
      </div>

      {/* Chart 3: Storage Pool Allocation Donut */}
      <div className="col-12 col-lg-4">
        <div className="storage-card p-3 h-100">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-0 fw-semibold text-white">Storage Pool Tiering</h6>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                Direct NVMe vs Shared SSD
              </small>
            </div>
            <span className="badge bg-dark border text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
              Capacity
            </span>
          </div>
          <div ref={chartPoolRef} style={{ minHeight: '260px' }}></div>
        </div>
      </div>

      {/* Chart 2: Read vs Write IOPS Area Spline */}
      <div className="col-12 col-lg-6">
        <div className="storage-card p-3 h-100">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-0 fw-semibold text-white">Read vs. Write IOPS Dynamics</h6>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                Ingestion Reads (Green) vs. Checkpoint Burst Writes (Red)
              </small>
            </div>
            <span className="badge bg-dark border text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
              Area-Spline
            </span>
          </div>
          <div ref={chartIopsRef} style={{ minHeight: '240px' }}></div>
        </div>
      </div>

      {/* Chart 4: Storage Node Queue Depth Bar Chart */}
      <div className="col-12 col-lg-6">
        <div className="storage-card p-3 h-100">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-0 fw-semibold text-white">Storage Node Queue Depth & Service Latency</h6>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                Hardware command queuing and controller response times per host
              </small>
            </div>
            <span className="badge bg-dark border text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
              Grouped Bar
            </span>
          </div>
          <div ref={chartNodesRef} style={{ minHeight: '240px' }}></div>
        </div>
      </div>
    </div>
  );
}
