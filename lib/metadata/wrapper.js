const MetadataWrapper = require('arsenal').storage.metadata.MetadataWrapper;
const { config } = require('../Config');
const logger = require('../utilities/logger');
const constants = require('../../constants');
const bucketclient = require('bucketclient');

const clientName = config.backends.metadata;
let params;
if (clientName === 'mem') {
    params = {};
} else if (clientName === 'file') {
    params = {
        metadataClient: {
            host: config.metadataClient.host,
            port: config.metadataClient.port,
        },
        constants: {
            usersBucket: constants.usersBucket,
            splitter: constants.splitter,
        },
        noDbOpen: null,
    };
} else if (clientName === 'scality') {
    console.log('config.bucketd.bootstrap', config.bucketd.bootstrap);
    console.log('config.bucketd.log', config.bucketd.log);
    console.log('config.https', config.https);
    params = {
        bucketdBootstrap: config.bucketd.bootstrap,
        bucketdLog: config.bucketd.log,
        https: config.https,
    };
} else if (clientName === 'mongodb') {
    params = {
        mongodb: config.mongodb,
        replicationGroupId: config.replicationGroupId,
    };
} else if (clientName === 'cdmi') {
    params = {
        cdmi: config.cdmi,
    };
}

console.log('config.backends.metadata', config.backends.metadata);
console.log('params for metadatawrapper', params);
const metadata = new MetadataWrapper(config.backends.metadata, params,
    bucketclient, logger);
// call setup
metadata.setup(() => {});

console.log('METADAT', metadata);

module.exports = metadata;
