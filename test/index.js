var assert = require('assert');
var ZMQomClient = require('./../lib/ZMQomClient');
var ZMQomServer = require('./../lib/ZMQomServer');


var testClient;
var testServer;
before(function (done) {
    // Test Server
    testServer = new ZMQomServer('tcp://127.0.0.1:3000');
    testServer.req('/echo', function (req, res, next) {
        res.body = req.data;
        return next();
    });

    // Test Client
    testClient = new ZMQomClient('tcp://127.0.0.1:3000');
    
    // TODO: Emit event when client/server is ready
    setTimeout(function () {
        done();
    }, 200);
});

describe('Basic Tests', function () {
    it('Test echo', function (done) {
        testClient.req('/echo', 'Hello !', function (err, data) {
            if (err) throw err;
            assert.equal(data, 'Hello !', 'Echo not equals to request');
            done();
        });
    });
});
