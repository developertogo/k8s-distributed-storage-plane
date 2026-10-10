const dbManager = require('./mongoClient');

const ClusterModel = {
  getOverview: async () => {
    return await dbManager.getCollection('clusters').findOne({ name: 'dgx-storage-cluster-prod' });
  },
  updateOverview: async (patch) => {
    return await dbManager.getCollection('clusters').updateOne(
      { name: 'dgx-storage-cluster-prod' },
      { ...patch, updatedAt: new Date().toISOString() }
    );
  }
};

const VolumeModel = {
  listAll: async () => {
    return await dbManager.getCollection('volumes').find({});
  },
  getById: async (id) => {
    return await dbManager.getCollection('volumes').findOne({ id });
  },
  create: async (volumeData) => {
    return await dbManager.getCollection('volumes').insertOne(volumeData);
  },
  update: async (id, patch) => {
    return await dbManager.getCollection('volumes').updateOne({ id }, patch);
  },
  remove: async (id) => {
    return await dbManager.getCollection('volumes').deleteOne({ id });
  }
};

const TelemetryModel = {
  recordSnapshot: async (snapshot) => {
    return await dbManager.getCollection('telemetry').insertOne({
      ...snapshot,
      createdAt: new Date().toISOString()
    });
  },
  getRecent: async (limit = 30) => {
    const all = await dbManager.getCollection('telemetry').find({});
    return all.slice(-limit);
  }
};

const AuditModel = {
  logEvent: async (actor, action, details) => {
    return await dbManager.getCollection('audits').insertOne({
      actor,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  },
  getRecent: async (limit = 20) => {
    const all = await dbManager.getCollection('audits').find({});
    return all.slice(-limit);
  }
};

module.exports = {
  ClusterModel,
  VolumeModel,
  TelemetryModel,
  AuditModel
};
