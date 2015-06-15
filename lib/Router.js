/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var Router = function () {
    this.routes = {
        REQ: [],
        RES: []
    };
    this.end;
};

Router.prototype.route = function (req) {
    var method = req.method;
    var path = req.headers.PATH || '/';

    var res = {
        body: void 0
    };
    if (this.routes[method].length > 0) {
        var candidates = [];
        for (var i = 0, size = this.routes[method].length; i < size; i++) {
            var route = this.routes[method][i];
            var result = route.path.exec(path);
            if (!result)
                continue;

            var params = {};
            var j = 0;
            if (route.path.icyParams && route.path.icyParams.length > 0) {
                route.path.icyParams.forEach(function (p) {
                    if (++j < result.length)
                        params[p] = decodeURIComponent(result[j]);
                });
            }

            candidates.push({callback: route.callback, params: params});
        }

        if (candidates.length > 0) {
            var i = 0;
            var exec = function (err) {
                if (err && err instanceof Error) {
                    return end(err);
                }
                if (candidates[i + 1]) {
                    req.params = candidates[i].params;
                    candidates[i++].callback(req, res, exec);
                }
                else {
                    req.params = candidates[i].params;
                    candidates[i++].callback(req, res, end);
                }
            }.bind(this);
            var end = function (err) {
                console.log("Fin de traitement");
                if (this.end) {
                    if (err && err instanceof Error) {
                        res.body = err;
                    }
                    return this.end(req, res);
                }
            }.bind(this);
            exec();
        }
    }
};


Router.prototype.req = function (path, callback) {
    this.routes.REQ.push({
        path: compilePath(path),
        callback: callback
    });
};


function compilePath(path) {
    var pattern = '^';
    var params = [];

    var parts = path.split('/');
    parts.forEach(function (part) {
        if (part.length === 0) {
            return false;
        }
        pattern += '\\/';
        if (part.charAt(0) === ':') {
            pattern += '([^/]*)';
            params.push(part.slice(1));
        }
        else {
            pattern += part;
        }
    });

    pattern += '$';
    var reg = new RegExp(pattern);
    reg.icyParams = params;
    return reg;
}
;

module.exports = Router;