/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var zmq = require('zmq');
var uuid = require('node-uuid');
var Router = require('./Router');

var ZMQomServer = function (port) {
    this.router;
    this.port;
    this.sock;

    this.init(port)
};

ZMQomServer.prototype.init = function (port) {
    this.port = port;
    this.router = new Router();

    this.router.end = function (req, res) {
        if (res.body instanceof Error) {
            this.sock.send(req.envelope, zmq.ZMQ_SNDMORE);
            this.sock.send('ERR', zmq.ZMQ_SNDMORE);
            this.sock.send('ID:' + req.headers.ID, zmq.ZMQ_SNDMORE);
            this.sock.send('', zmq.ZMQ_SNDMORE);
            this.sock.send(res.body);
        }
        else {
            this.sock.send(req.envelope, zmq.ZMQ_SNDMORE);
            this.sock.send('RES', zmq.ZMQ_SNDMORE);
            this.sock.send('ID:' + req.headers.ID, zmq.ZMQ_SNDMORE);
            this.sock.send('', zmq.ZMQ_SNDMORE);
            this.sock.send(res.body);
        }
    }.bind(this);

    this.sock = zmq.socket('router');
    this.sock.identity = uuid.v4();
    this.sock.bind(this.port, function (err) {
        if (err)
            throw err

        this.sock.on('message', function () {
            this.route(arguments);
        }.bind(this));
    }.bind(this));
}

ZMQomServer.prototype.req = function (path, callback) {
    return this.router.req(path, callback);
};

ZMQomServer.prototype.route = function (arguments) {
    var req = {
        headers: {}
    };
    var messages = Array.prototype.slice.call(arguments);
    req.envelope = messages.shift();
    req.method = messages.shift().toString();

    while (messages.length > 0) {
        var msg = messages.shift().toString();
        if (msg === '') {
            break;
        }
        var separatorPos = msg.indexOf(':');
        if (separatorPos === -1) {
            continue;
        }
        req.headers[msg.substr(0, separatorPos)] = msg.substr(separatorPos + 1);
    }

    // Reste les data
    if (messages.length > 0) {
        req.data = messages.shift().toString();
    }

    this.router.route(req);
};

module.exports = ZMQomServer;