/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var zmq = require('zmq');
var uuid = require('node-uuid');

var ZMQomClient = function (port) {
    this.socks = [];
    this.ports = [];
    this.pendingResponse = {};

    this.init(port);
    this.sockIndex = 0;
};

ZMQomClient.prototype.getSocket = function () {
    this.sockIndex = (this.sockIndex + 1) % this.socks.length;
    return this.socks[this.sockIndex];
};

ZMQomClient.prototype.init = function (ports) {
    if (!Array.isArray(ports)) {
        ports = [ports];
    }

    ports.forEach(function (port) {
        this.ports.push(port);
        var sock = zmq.socket('dealer');
        sock.identity = uuid.v4();

        sock.connect(port);

        sock.on('message', function () {
            var messages = Array.prototype.slice.call(arguments);
            var resId;
            var type = messages.shift().toString();
            messages.forEach(function (msg) {
                msg = msg.toString();
                if (msg.lastIndexOf('ID:', 0) === 0) {
                    resId = msg.split(':')[1];
                }
            });

            if (resId && this.pendingResponse[resId]) {
                if (type === 'RES') {
                    this.pendingResponse[resId](null, messages[messages.length - 1].toString());
                }
                else if (type === 'ERR') {
                    this.pendingResponse[resId](new Error(messages[messages.length - 1].toString()), null);
                }


                delete this.pendingResponse[resId];
            }


        }.bind(this));
        this.socks.push(sock);
    }.bind(this));


};


ZMQomClient.prototype.req = function (path, data, headers, callback) {
    if (typeof headers === 'function') {
        callback = headers;
        headers = {};
    }

    var sock = this.getSocket();
    var requestId = uuid.v4();
    this.pendingResponse[requestId] = callback;

    sock.send('REQ', zmq.ZMQ_SNDMORE);
    sock.send('PATH:' + path, zmq.ZMQ_SNDMORE);
    sock.send('ID:' + requestId, zmq.ZMQ_SNDMORE);
    Object.keys(headers).forEach(function (key) {
        sock.send(key + ':' + headers[key], zmq.ZMQ_SNDMORE);
    });
    sock.send('', zmq.ZMQ_SNDMORE);
    sock.send(data);
};

module.exports = ZMQomClient;