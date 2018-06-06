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
    const { method, headers, authCredentials,
        requestBody, queryObj, path } = params;
    const options = {
        authCredentials,
        hostName: ipAddress,
        port: 9000,
        method,
        headers,
        path,
        requestBody,
        jsonResponse: true,
        queryObj,
    };
    makeRequest(options, callback);
}

describe.skip('metadata routes with metadata mock backend', () => {
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
        makeMetadataRequest({
            method: 'GET',
            authCredentials: metadataAuthCredentials,
            path: '/_/metadata/listbuckets/1',
        }, (err, res) => {
            console.log('ERR IS', err);
            console.log('RES IS', res);
            done();
        });
    });
});
