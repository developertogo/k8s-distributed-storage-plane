#!/usr/bin/env python3
"""
Unit tests for Python workload simulator and CSI benchmark math.
Runs using Python built-in unittest (zero extra dependencies).
"""

import unittest
import sys
import os

# Add scripts directory to module path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simulate_ai_workload import (
    calculate_throughput_GBps,
    calculate_direct_storage_bandwidth,
    calculate_p99_latency_us
)
from benchmark_csi import calculate_p99

class TestStorageFormulas(unittest.TestCase):

    def test_throughput_formula(self):
        # Formula: throughput_GBps = (iops * block_size_KB) / (1024 * 1024)
        # 1,048,576 IOPS with 64KB block size should yield exactly 64.0 GB/s
        iops = 1048576
        block_size_KB = 64
        throughput = calculate_throughput_GBps(iops, block_size_KB)
        self.assertAlmostEqual(throughput, 64.0, places=2)

    def test_direct_storage_bandwidth_formula(self):
        # Formula: direct_storage_bandwidth_GBps = raw_nvme_bandwidth_GBps * (1.0 - interconnect_overhead_factor)
        raw_bw = 64.0
        overhead = 0.05
        effective_bw = calculate_direct_storage_bandwidth(raw_bw, overhead)
        self.assertAlmostEqual(effective_bw, 60.8, places=2)

    def test_p99_latency_calculation(self):
        # Formula: latency_p99_us = sorted_latencies[int(len(sorted_latencies) * 0.99)]
        # Sample array 1 to 100
        samples = list(range(1, 101))
        p99 = calculate_p99_latency_us(samples)
        self.assertEqual(p99, 100)

        # Empty sample handling
        self.assertEqual(calculate_p99_latency_us([]), 0.0)

    def test_benchmark_p99(self):
        samples = [10.0, 20.0, 30.0, 40.0, 50.0]
        p99 = calculate_p99(samples)
        self.assertEqual(p99, 50.0)
        self.assertEqual(calculate_p99([]), 0.0)

if __name__ == "__main__":
    unittest.main()
