/**
 * k8s-distributed-storage-plane: Async Orchestration Engine
 * Implements complex distributed storage workflows using async.waterfall, async.parallel, and async.queue.
 */

const async = require('async');
const { ClusterModel, VolumeModel, AuditModel } = require('../db/models');
const csiDriver = require('../../../k8s/csi/driver');

// Python Formula Reference:
// throughput_GBps = (iops * block_size_KB) / (1024 * 1024)
// direct_storage_bandwidth_GBps = raw_nvme_bandwidth_GBps * (1.0 - interconnect_overhead_factor)
// latency_p99_us = sorted_latencies[int(len(sorted_latencies) * 0.99)]
// utilization_ratio = used_capacity_bytes / total_capacity_bytes

/**
 * 1. Sequential Volume Provisioning Workflow via async.waterfall
 * Step A: Validate capacity quota & pool limits
 * Step B: Select optimal storage node & compute NVMe-oF parameters
 * Step C: Invoke CSI Controller CreateVolume
 * Step D: Persist volume metadata and audit log
 */
function provisionVolumeWorkflow(params, callback) {
  const { name, sizeGB, storagePool = 'nvme-direct-pool', directStorage = true, targetNode = 'dgx-node-01' } = params;

  async.waterfall([
    // Step A: Check capacity quotas
    (stepDone) => {
      ClusterModel.getOverview().then(cluster => {
        if (!cluster) return stepDone(new Error('Storage cluster not initialized'));
        const remainingGB = cluster.totalCapacityGB - cluster.allocatedCapacityGB;
        if (sizeGB > remainingGB) {
          return stepDone(new Error(`Quota exceeded: Requested ${sizeGB}GB, available: ${remainingGB}GB`));
        }
        stepDone(null, cluster);
      }).catch(stepDone);
    },

    // Step B: Calculate performance specs
    (cluster, stepDone) => {
      const rawBandwidth = storagePool === 'nvme-direct-pool' ? 64.0 : 25.0;
      const overheadFactor = directStorage ? 0.05 : 0.15;
      
      // direct_storage_bandwidth_GBps = raw_nvme_bandwidth_GBps * (1.0 - interconnect_overhead_factor)
      const effectiveBandwidthGBps = parseFloat((rawBandwidth * (1.0 - overheadFactor)).toFixed(2));
      const iopsLimit = directStorage ? 450000 : 180000;

      stepDone(null, { cluster, effectiveBandwidthGBps, iopsLimit });
    },

    // Step C: Invoke CSI Plugin
    (context, stepDone) => {
      try {
        const csiResponse = csiDriver.CreateVolume({
          name,
          capacity_range: { required_bytes: sizeGB * 1024 * 1024 * 1024 },
          parameters: {
            storagePool,
            directStorage: String(directStorage)
          }
        });

        // ControllerPublish to targetNode
        csiDriver.ControllerPublishVolume({
          volume_id: csiResponse.volume.volume_id,
          node_id: targetNode
        });

        stepDone(null, { ...context, csiResponse });
      } catch (err) {
        stepDone(err);
      }
    },

    // Step D: Persist metadata & audit record
    (context, stepDone) => {
      const volId = context.csiResponse.volume.volume_id;
      const newVolume = {
        id: volId,
        name,
        sizeGB,
        storagePool,
        directStorageEnabled: directStorage,
        attachedNode: targetNode,
        phase: 'Bound',
        mountPath: `/mnt/dgx-${name}`,
        iopsLimit: context.iopsLimit,
        bandwidthGBps: context.effectiveBandwidthGBps,
        createdAt: new Date().toISOString()
      };

      VolumeModel.create(newVolume).then(async (saved) => {
        // Update cluster allocation
        await ClusterModel.updateOverview({
          allocatedCapacityGB: context.cluster.allocatedCapacityGB + sizeGB
        });

        await AuditModel.logEvent(
          'csi-controller',
          'PROVISION_VOLUME',
          `Provisioned ${name} (${sizeGB}GB) on ${targetNode} with direct storage=${directStorage}`
        );

        stepDone(null, saved);
      }).catch(stepDone);
    }
  ], (err, result) => {
    if (err) return callback(err);
    callback(null, result);
  });
}

/**
 * 2. Parallel Storage Node Probes via async.parallel
 * Concurrently checks status, PCIe queue depth, and service latency of all cluster nodes.
 */
function probeClusterNodesWorkflow(nodes, callback) {
  const probeTasks = nodes.map(nodeId => (taskDone) => {
    // Simulating concurrent asynchronous RPC probe to NVMe target daemon
    setTimeout(() => {
      const queueDepth = Math.floor(Math.random() * 15) + 8;
      const latencySamples = Array.from({ length: 50 }, () => 90 + Math.floor(Math.random() * 60));
      const sorted = [...latencySamples].sort((a, b) => a - b);
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      taskDone(null, {
        nodeId,
        status: 'Ready',
        queueDepth,
        p99LatencyUs: p99,
        nvmeHealthy: true,
        checkedAt: new Date().toISOString()
      });
    }, 15 + Math.floor(Math.random() * 20));
  });

  async.parallel(probeTasks, (err, results) => {
    if (err) return callback(err);
    callback(null, results);
  });
}

/**
 * 3. Batch Volume Migration Worker Queue via async.queue
 * Concurrency limited to 2 workers to prevent RoCEv2 fabric saturation during live pod migrations.
 */
const migrationQueue = async.queue((task, taskDone) => {
  console.log(`[Migration Queue] Processing migration for volume: ${task.volumeId} -> ${task.destinationNode}`);

  async.waterfall([
    // Step 1: ControllerUnpublish from source node
    (stepDone) => {
      try {
        csiDriver.ControllerUnpublishVolume({ volume_id: task.volumeId });
        stepDone(null);
      } catch (err) {
        stepDone(err);
      }
    },
    // Step 2: ControllerPublish to destination node
    (stepDone) => {
      try {
        csiDriver.ControllerPublishVolume({
          volume_id: task.volumeId,
          node_id: task.destinationNode
        });
        stepDone(null);
      } catch (err) {
        stepDone(err);
      }
    },
    // Step 3: Update DB Record
    (stepDone) => {
      VolumeModel.update(task.volumeId, { attachedNode: task.destinationNode }).then(() => {
        AuditModel.logEvent(
          'migration-engine',
          'MIGRATE_VOLUME',
          `Migrated volume ${task.volumeId} to node ${task.destinationNode}`
        );
        stepDone(null, { success: true, volumeId: task.volumeId, newNode: task.destinationNode });
      }).catch(stepDone);
    }
  ], (err, result) => {
    if (err) {
      console.error(`[Migration Queue] Migration failed for ${task.volumeId}:`, err.message);
      return taskDone(err);
    }
    taskDone(null, result);
  });
}, 2); // Concurrency = 2

module.exports = {
  provisionVolumeWorkflow,
  probeClusterNodesWorkflow,
  migrationQueue
};
