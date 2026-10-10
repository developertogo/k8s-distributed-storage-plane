import mockService from '../services/mockTelemetryService';

describe('mockTelemetryService In-Browser Simulator Tests', () => {
  afterEach(() => {
    mockService.isBurstActive = false;
    mockService.burstRemainingTicks = 0;
  });

  test('initializes with default 3-node cluster state', () => {
    expect(mockService.clusterState.name).toBe('dgx-storage-cluster-prod');
    expect(mockService.clusterState.activeNodes).toBe(3);
    expect(mockService.clusterState.tier).toBe('direct-nvme');
    expect(mockService.nodes.length).toBe(3);
    expect(mockService.volumes.length).toBeGreaterThanOrEqual(2);
  });

  test('provisionVolume adds volume and updates cluster allocation', () => {
    const initialAllocation = mockService.clusterState.allocatedCapacityGB;
    const newVol = mockService.provisionVolume({
      name: 'test-resnet-weights',
      sizeGB: 1500,
      storagePool: 'nvme-direct-pool',
      directStorage: true,
      targetNode: 'dgx-node-03'
    });

    expect(newVol.id).toMatch(/^vol-dgx-/);
    expect(newVol.name).toBe('test-resnet-weights');
    expect(newVol.sizeGB).toBe(1500);
    expect(newVol.directStorageEnabled).toBe(true);
    expect(newVol.attachedNode).toBe('dgx-node-03');
    expect(mockService.clusterState.allocatedCapacityGB).toBe(initialAllocation + 1500);
  });

  test('migrateVolume transfers volume attachment and logs event', () => {
    const vol = mockService.volumes[0];
    const initialNode = vol.attachedNode;
    const targetNode = initialNode === 'dgx-node-01' ? 'dgx-node-02' : 'dgx-node-01';

    const success = mockService.migrateVolume(vol.id, targetNode);
    expect(success).toBe(true);
    expect(vol.attachedNode).toBe(targetNode);
  });

  test('deleteVolume removes volume and reduces allocated capacity', () => {
    const testVol = mockService.provisionVolume({
      name: 'temporary-eval-vol',
      sizeGB: 800,
      storagePool: 'nvme-direct-pool',
      directStorage: false,
      targetNode: 'dgx-node-01'
    });

    const allocBefore = mockService.clusterState.allocatedCapacityGB;
    const delSuccess = mockService.deleteVolume(testVol.id);
    expect(delSuccess).toBe(true);
    expect(mockService.clusterState.allocatedCapacityGB).toBe(allocBefore - 800);
    expect(mockService.volumes.some(v => v.id === testVol.id)).toBe(false);
  });

  test('triggerAiCheckpointBurst activates burst write mode and logs warning', () => {
    mockService.triggerAiCheckpointBurst(5);
    expect(mockService.isBurstActive).toBe(true);
    expect(mockService.burstRemainingTicks).toBe(5);
    expect(mockService.operatorLogs[0].type).toBe('burst');
  });
});
