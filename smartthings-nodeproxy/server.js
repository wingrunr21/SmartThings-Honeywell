/**
 *  SmartThings Node Proxy (STNP)
 *
 *  Author: redloro@gmail.com
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 */

////////////////////
// DO NOT CHANGE BELOW THIS LINE
////////////////////
var express = require('express');
var http = require('http');
var app = express();
var config = require('./configuration');

/**
 * Root route
 */
app.get('/', function (req, res) {
  res.status(200).json({ status: 'SmartThings Node Proxy running' });
});

/**
 * Enforce basic authentication route; verify that HTTP.HEADERS['stnp-auth'] == CONFIG['authCode']
 */
app.use(function (req, res, next) {
  console.log('%s %s %s', req.ip, req.method, req.url);

  var headers = req.headers;
  if (!headers['stnp-auth'] ||
    headers['stnp-auth'] != config.get('authCode')) {
    console.log('Authentication error');
    res.status(500).json({ error: 'Authentication error' });
    return;
  }

  next();
});

/**
 * Subscribe route used by SmartThings Hub to register for callback/notifications and write to config.json
 * @param {String} host - The SmartThings Hub IP address and port number
 */
app.get('/subscribe/:host', function (req, res) {
  var parts = req.params.host.split(":");
  config.set('notify:address', parts[0]);
  config.set('notify:port', parts[1]);
  config.save(function (err) {
    if (err) {
      console.log('Configuration error: '+err.message);
      res.status(500).json({ error: 'Configuration error: '+err.message });
      return;
    }
  });
  res.end();
});

/**
 * Startup
 */
var server = app.listen(config.get('port'), function () {
  console.log('SmartThings Node Proxy listening at http://%s:%s', server.address().address, server.address().port);
});

/**
 * Load all plugins
 */
var fs = require('fs');
fs.readdir('./plugins', function(err, files) {
  files
    .filter(function(file) { return file.substr(-3) === '.js'; })
    .forEach(function(file) {
      var plugin = file.split(".")[0];
      if (config.get(plugin)) {
        app.use('/plugins/'+plugin, require('./plugins/'+plugin)(function(data){notify(plugin,data);}));
        console.log('Loaded plugin: '+plugin);
      } else {
        console.log('Skipped plugin '+plugin+' as it is not configured');
      }
    });
});

/**
 * Callback to the SmartThings Hub via HTTP NOTIFY
 * @param {String} plugin - The name of the STNP plugin
 * @param {String} data - The HTTP message body
 */
var notify = function(plugin, data) {
  if (!config.get('notify:address') || config.get('notify:address').length == 0 ||
    !config.get('notify:port') || config.get('notify:port') == 0) {
    console.log("Notify server address and port not set!");
    return;
  }

  var opts = {
    method: 'NOTIFY',
    host: config.get('notify:address'),
    port: config.get('notify:port'),
    path: '/notify',
    headers: {
      'CONTENT-TYPE': 'application/json',
      'CONTENT-LENGTH': Buffer.byteLength(data),
      'stnp-plugin': plugin
    }
  };

  var req = http.request(opts);
  req.on('error', function(err, req, res) {
    console.log("Notify error: "+err);
  });
  req.write(data);
  req.end();
}
