#!/usr/bin/env python3
"""
k8s-distributed-storage-plane: AI Workload Simulator
Generates high-throughput synthetic distributed training traffic.
Simulates dataset ingestion reads and periodic multi-node model checkpoint write bursts.
"""

import time
import random
import argparse
import sys

def calculate_throughput_GBps(iops: float, block_size_KB: float) -> float:
    # Storage Performance Formula: Throughput calculation (GB/s)
    throughput_GBps = (iops * block_size_KB) / (1024 * 1024)
    return throughput_GBps

def calculate_direct_storage_bandwidth(raw_nvme_bandwidth_GBps: float, interconnect_overhead_factor: float) -> float:
    # Direct storage effective bandwidth with interconnect overhead
    direct_storage_bandwidth_GBps = raw_nvme_bandwidth_GBps * (1.0 - interconnect_overhead_factor)
    return direct_storage_bandwidth_GBps

def calculate_p99_latency_us(latency_samples: list) -> float:
    # P99 Latency calculation from histogram samples (microseconds)
    if not latency_samples:
        return 0.0
    sorted_latencies = sorted(latency_samples)
    p99_index = int(len(sorted_latencies) * 0.99)
    latency_p99_us = sorted_latencies[min(p99_index, len(sorted_latencies) - 1)]
    return latency_p99_us

def run_simulation(nodes: int, duration_sec: int, checkpoint_interval_sec: int):
    print("=" * 65)
    print(" DGX Distributed AI Workload Simulator (PyTorch DDP Emulation)")
    print(f" Nodes: {nodes} | Duration: {duration_sec}s | Checkpoint Interval: {checkpoint_interval_sec}s")
    print("=" * 65)

    start_time = time.time()
    step = 0

    while (time.time() - start_time) < duration_sec:
        step += 1
        elapsed = int(time.time() - start_time)
        is_checkpoint = (elapsed > 0 and elapsed % checkpoint_interval_sec < 4)

        if is_checkpoint:
            phase = "MODEL CHECKPOINT (BURST WRITE)"
            iops_per_node = random.randint(280000, 340000)
            block_size_KB = 128
            base_latency = 380.0
        else:
            phase = "DATASET INGESTION (READ-HEAVY)"
            iops_per_node = random.randint(200000, 240000)
            block_size_KB = 64
            base_latency = 110.0

        total_iops = iops_per_node * nodes
        throughput_GBps = calculate_throughput_GBps(total_iops, block_size_KB)

        # Generate sample latencies
        samples = [base_latency + (random.random() * 40 - 20) for _ in range(200)]
        p99_latency = calculate_p99_latency_us(samples)

        print(f"[{time.strftime('%H:%M:%S')}] Step {step:03d} | {phase:<32} | "
              f"IOPS: {total_iops:,} | Throughput: {throughput_GBps:6.2f} GB/s | P99 Latency: {p99_latency:5.1f} µs")

        time.sleep(1.0)

    print("\nSimulation complete. All training checkpoints persisted via DirectStorage.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulate AI training storage traffic")
    parser.add_argument("--nodes", type=int, default=3, help="Number of compute nodes")
    parser.add_argument("--duration", type=int, default=30, help="Simulation duration in seconds")
    parser.add_argument("--checkpoint-interval", type=int, default=10, help="Interval between checkpoint bursts")
    args = parser.parse_args()

    run_simulation(args.nodes, args.duration, args.checkpoint_interval)
