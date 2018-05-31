const url = require('url');
const async = require('async');

const { auth, errors, s3middleware } = require('arsenal');
const { responseJSONBody } = require('arsenal').s3routes.routesUtils;
const { getSubPartIds } = s3middleware.azureHelper.mpuUtils;
const vault = require('../auth/vault');
const metadata = require('../metadata/wrapper');
const locationConstraintCheck = require(
    '../api/apiUtils/object/locationConstraintCheck');
const { dataStore } = require('../api/apiUtils/object/storeObject');
const prepareRequestContexts = require(
'../api/apiUtils/authorization/prepareRequestContexts');
const { decodeVersionId } = require('../api/apiUtils/object/versioning');
const { metadataValidateBucketAndObj,
    metadataGetObject } = require('../metadata/metadataUtils');
const { BackendInfo } = require('../api/apiUtils/object/BackendInfo');
const { config } = require('../Config');
const multipleBackendGateway = require('../data/multipleBackendGateway');
const constants = require('../../constants');

auth.setHandler(vault);

const NAMESPACE = 'default';
const CIPHER = null; // replication/lifecycle does not work on encrypted objects

let { locationConstraints } = config;
config.on('location-constraints-update', () => {
    locationConstraints = config.locationConstraints;
});

console.log('in routeMetadata file!', metadata);
function _decodeURI(uri) {
    // do the same decoding than in S3 server
    return decodeURIComponent(uri.replace(/\+/g, ' '));
}

function normalizeMetadataRequest(req) {
    /* eslint-disable no-param-reassign */
    const parsedUrl = url.parse(req.url, true);
    req.path = _decodeURI(parsedUrl.pathname);
    console.log('request path is', req.path);
    req.query = parsedUrl.query;
    const pathArr = req.path.split('/');
    console.log('path array is', pathArr);
    req.resourceType = pathArr[3];
    if (pathArr[4]) {
        req.bucketName = pathArr[5];
    }
    if (pathArr[6]) {
        req.objectKey = pathArr.slice(6).join('/');
    }
    /* eslint-enable no-param-reassign */
}

function _respond(response, payload, log, callback) {
    const body = typeof payload === 'object' ?
        JSON.stringify(payload) : payload;
    const httpHeaders = {
        'x-amz-id-2': log.getSerializedUids(),
        'x-amz-request-id': log.getSerializedUids(),
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
    };
    response.writeHead(200, httpHeaders);
    response.end(body, 'utf8', callback);
}

function _checkMultipleBackendRequest(request, log) {
    const { headers, query } = request;
    const storageType = headers['x-scal-storage-type'];
    const { operation } = query;
    let errMessage;
    if (storageType === undefined) {
        errMessage = 'bad request: missing x-scal-storage-type header';
        log.error(errMessage);
        return errors.BadRequest.customizeDescription(errMessage);
    }
    if ((operation === 'initiatempu' || operation === 'putobject') &&
        headers['x-scal-version-id'] === undefined) {
        errMessage = 'bad request: missing x-scal-version-id header';
        log.error(errMessage);
        return errors.BadRequest.customizeDescription(errMessage);
    }
    if (operation === 'putpart' &&
        headers['x-scal-part-number'] === undefined) {
        errMessage = 'bad request: missing part-number header';
        log.error(errMessage);
        return errors.BadRequest.customizeDescription(errMessage);
    }
    if ((operation === 'putpart' || operation === 'completempu') &&
        headers['x-scal-upload-id'] === undefined) {
        errMessage = 'bad request: missing upload-id header';
        log.error(errMessage);
        return errors.BadRequest.customizeDescription(errMessage);
    }
    if (operation === 'putobject' &&
        headers['x-scal-canonical-id'] === undefined) {
        errMessage = 'bad request: missing x-scal-canonical-id header';
        log.error(errMessage);
        return errors.BadRequest.customizeDescription(errMessage);
    }
    // Ensure the external backend has versioning before asserting version ID.
    if (!constants.versioningNotImplBackends[storageType] &&
        (operation === 'puttagging' || operation === 'deletetagging')) {
        if (headers['x-scal-data-store-version-id'] === undefined) {
            errMessage =
                'bad request: missing x-scal-data-store-version-id header';
            log.error(errMessage);
            return errors.BadRequest.customizeDescription(errMessage);
        }
        if (headers['x-scal-source-bucket'] === undefined) {
            errMessage = 'bad request: missing x-scal-source-bucket header';
            log.error(errMessage);
            return errors.BadRequest.customizeDescription(errMessage);
        }
        if (headers['x-scal-source-version-id'] === undefined) {
            errMessage = 'bad request: missing x-scal-source-version-id header';
            log.error(errMessage);
            return errors.BadRequest.customizeDescription(errMessage);
        }
        if (headers['x-scal-replication-endpoint-site'] === undefined) {
            errMessage = 'bad request: missing ' +
                'x-scal-replication-endpoint-site';
            log.error(errMessage);
            return errors.BadRequest.customizeDescription(errMessage);
        }
    }
    if (operation === 'putobject' &&
        headers['content-md5'] === undefined) {
        errMessage = 'bad request: missing content-md5 header';
        log.error(errMessage);
        return errors.BadRequest.customizeDescription(errMessage);
    }
    if (headers['x-scal-storage-class'] === undefined) {
        errMessage = 'bad request: missing x-scal-storage-class header';
        log.error(errMessage);
        return errors.BadRequest.customizeDescription(errMessage);
    }
    const location = locationConstraints[headers['x-scal-storage-class']];
    const isValidLocation = location && storageType.includes(location.type);
    if (!isValidLocation) {
        errMessage = 'invalid request: invalid location constraint in request';
        log.debug(errMessage, {
            method: request.method,
            bucketName: request.bucketName,
            objectKey: request.objectKey,
            resourceType: request.resourceType,
        });
        return errors.InvalidRequest.customizeDescription(errMessage);
    }
    return undefined;
}

/*
- getting list of buckets for each raft session -
GET /_/metadata/listbuckets/<raft session id>
- getting list of objects for each bucket -
GET /_/metadata/getbucket/<bucket name>
- getting metadata for bucket -
GET /_/metadata/listobjects/<bucket name>
- getting metadata for object -
GET /_/metadata/getobject/<bucket name>/<object key>
*/

// TODO: wrapper function for metadata calls, but maybe not efficient anyways?
// function _metadataWrapper(method, request, response, bucketName, objectKey,
// params, raftId, log, callback) {
//     return metadata[method]()
// }

function getRaftBuckets(request, response, raftId, log, callback) {
    const err = _checkMultipleBackendRequest(request, log);
    if (err) {
        return callback(err);
    }
    return metadata.getRaftBuckets(raftId, log, (err, res) => {
        if (err) {
            // TODO: figure out correct error to respond with
            return callback(err);
        }
        return _respond(response, { Body: res }, log, callback);
    });
}

function getBucketMetadata(request, response, bucketName, log, callback) {
    const err = _checkMultipleBackendRequest(request, log);
    if (err) {
        return callback(err);
    }
    return metadata.getBucket(bucketName, log, (err, res) => {
        if (err) {
            // TODO: figure out correct error to respond with
            return callback(err);
        }
        return _respond(response, { Body: res }, log, callback);
    });
}

function getObjectList(request, response, bucketName, params, log, callback) {
    const err = _checkMultipleBackendRequest(request, log);
    if (err) {
        return callback(err);
    }
    return metadata.listObject(bucketName, params, log, (err, res) => {
        if (err) {
            return callback(err);
        }
        return _respond(response, { Body: res }, log, callback);
    });
}

function getObjectMetadata(request, response, bucketName, objectKey, params,
log, callback) {
    const err = _checkMultipleBackendRequest(request, log);
    if (err) {
        return callback(err);
    }
    return metadata.getObjectMD(bucketName, objectKey, params, log,
    (err, res) => {
        if (err) {
            return callback(err);
        }
        return _respond(response, { Body: res }, log, callback);
    });
}

const metadataRoutes = {
    GET: {
        listbuckets: getRaftBuckets,
        listobjects: getObjectList,
        getbucket: getBucketMetadata,
        getobject: getObjectMetadata,
    },
};

function routeMetadata(clientIP, request, response, log) {
    log.debug('routing request', { method: 'routeBackbeat' });
    normalizeMetadataRequest(request);
    const useMultipleBackend = request.resourceType === 'multiplebackenddata';
    const invalidRequest = (!request.bucketName ||
                            !request.objectKey ||
                            !request.resourceType ||
                            (!request.query.operation && useMultipleBackend));
    console.log('invalid request?', invalidRequest);
    if (invalidRequest) {
        log.debug('invalid request', {
            method: request.method, bucketName: request.bucketName,
            objectKey: request.objectKey, resourceType: request.resourceType,
            query: request.query,
        });
        return responseJSONBody(errors.MethodNotAllowed, null, response, log);
    }
    const requestContexts = prepareRequestContexts('objectReplicate', request);
    const decodedVidResult = decodeVersionId(request.query);
    if (decodedVidResult instanceof Error) {
        log.trace('invalid versionId query', {
            versionId: request.query.versionId,
            error: decodedVidResult,
        });
        return responseJSONBody(errors.InvalidArgument, null, response, log);
    }
    const versionId = decodedVidResult;
    console.log('we passed all the previous stuff');
    return async.waterfall([next => auth.server.doAuth(
        request, log, (err, userInfo) => {
            console.log('do auth');
            if (err) {
                log.debug('authentication error', {
                    error: err,
                    method: request.method,
                    bucketName: request.bucketName,
                    objectKey: request.objectKey,
                });
            }
            return next(err, userInfo);
        }, 's3', requestContexts),
        (userInfo, next) => {
            console.log('userinfo');
            if (useMultipleBackend) {
                // Bucket and object do not exist in metadata.
                return next(null, null, null);
            }
            const mdValParams = { bucketName: request.bucketName,
                objectKey: request.objectKey,
                authInfo: userInfo,
                versionId,
                requestType: 'ReplicateObject' };
            console.log('mdvalparams', mdValParams);
            return metadataValidateBucketAndObj(mdValParams, log, next);
        },
        (bucketInfo, objMd, next) => {
            console.log('bucketinfo');
            const invalidRoute = metadataRoutes[request.method] === undefined ||
                metadataRoutes[request.method][request.resourceType] ===
                    undefined ||
                (metadataRoutes[request.method][request.resourceType]
                    [request.query.operation] === undefined &&
                    useMultipleBackend);
            if (invalidRoute) {
                log.debug('no such route', { method: request.method,
                    bucketName: request.bucketName,
                    objectKey: request.objectKey,
                    resourceType: request.resourceType,
                    query: request.query,
                });
                return next(errors.MethodNotAllowed);
            }
            const versioningConfig = bucketInfo.getVersioningConfiguration();
            if (!versioningConfig || versioningConfig.Status !== 'Enabled') {
                log.debug('bucket versioning is not enabled', {
                    method: request.method,
                    bucketName: request.bucketName,
                    objectKey: request.objectKey,
                    resourceType: request.resourceType,
                });
                return next(errors.InvalidBucketState);
            }
            console.log('calling backbeatRoutes', metadataRoutes);
            return metadataRoutes[request.method][request.resourceType](
                request, response, bucketInfo, objMd, log, next);
        }],
        err => {
            if (err) {
                return responseJSONBody(err, null, response, log);
            }
            log.debug('backbeat route response sent successfully',
                { method: request.method,
                    bucketName: request.bucketName,
                    objectKey: request.objectKey });
            return undefined;
        });
}


module.exports = routeMetadata;
