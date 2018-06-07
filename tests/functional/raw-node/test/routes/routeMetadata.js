const assert  = require('assert');
const async = require('async');
const crypto = require('crypto');
const http = require('http');
const werelogs = require('werelogs');
const Logger = werelogs.Logger;
const { versioning } = require('arsenal');
const versionIdUtils = versioning.VersionID;

const { makeRequest } = require('../../utils/makeRequest');
const MetadataMock = require('../../utils/MetadataMock');

const ipAddress = process.env.IP ? process.env.IP : '127.0.0.1';
const metadataMock = new MetadataMock();
let httpServer;

const metadataAuthCredentials = {
    accessKey: 'accessKey1',
    secretKey: 'verySecretKey1',
};

function makeMetadataRequest(params, callback) {
    console.log('IP IS', ipAddress);
    const { method, headers, authCredentials,
        requestBody, queryObj, path } = params;
    const options = {
        authCredentials,
        hostname: ipAddress,
        port: 8000,
        method,
        headers,
        path,
        requestBody,
        jsonResponse: true,
        queryObj,
    };
    console.log('options before sending to makerequest', options);
    makeRequest(options, callback);
}

describe.only('metadata routes with metadata mock backend', () => {
    before(done => {
        console.log('setting up for metadata route tests');
        httpServer = http.createServer(
            (req, res) => metadataMock.onRequest(req, res)).listen(9000);
        done();
    });

    after(done => {
        httpServer.close();
        done();
    });

    it('should retrieve list of buckets', done => {
        return makeMetadataRequest({
            method: 'GET',
            authCredentials: metadataAuthCredentials,
            path: '/_/metadata/listbuckets/1',
        }, (err, res) => {
            assert.error(err);
            assert.strictEqual(res.body, '["bucket1","bucket2"]');
            return done();
        });
    });
    
    it('should retrieve list of objects from bucket', done => {
        return makeMetadataRequest({
            method: 'GET',
            authCredentials: metadataAuthCredentials,
            path: '/_/metadata/listobjects/bucket1',
        }, (err, res) => {
            assert.error(err);
            console.log('err is', err);
            console.log('res is', res);
            return done();
        });
    });
    
    it('should retrieve metadata of object')
});
