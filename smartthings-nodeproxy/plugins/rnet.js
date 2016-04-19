/**
 *  Russound RNET Plugin
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
 *
 *  Supported Commands:
 *   Zone On/Off state (0x00 = OFF or 0x01 = ON)
 *   Source selected -1
 *   Volume level (0x00 - 0x32, 0x00 = 0 Displayed ... 0x32 = 100 Displayed)
 *   Bass level (0x00 = -10 ... 0x0A = Flat ... 0x14 = +10)
 *   Treble level (0x00 = -10 ... 0x0A = Flat ... 0x14 = +10)
 *   Loudness (0x00 = OFF, 0x01 = ON )
 *   Balance level (0x00 = More Left ... 0x0A = Center ... 0x14 = More Right)
 *   System On state (0x00 = All Zones Off, 0x01 = Any Zone is On)
 *   Shared Source (0x00 = Not Shared 0x01 = Shared with another Zone)
 *   Party Mode state (0x00 = OFF, 0x01 = ON, 0x02 = Master)*
 *   Do Not Disturb state (0x00 = OFF, 0x01 = ON )*
*/
var express = require('express');
var serialport = require("serialport");
var app = express();
var config = require('../configuration');
var notify;

/**
 * Routes
 */
app.get('/', function (req, res) {
  res.status(200).json(rnet.check());
});
app.get('/discover', function (req, res) {
  rnet.discover();
  res.end();
});
app.get('/zones/:id/partyMode/:partyMode', function (req, res) {
  rnet.setZonePartyMode(Number(req.params.id), Number(req.params.partyMode));
  res.end();
});
app.get('/zones/:id/partyMode', function (req, res) {
  rnet.getZonePartyMode(Number(req.params.id));
  res.end();
});
app.get('/zones/:id/balance/:balance', function (req, res) {
  rnet.setZoneBalance(Number(req.params.id), Number(req.params.balance));
  res.end();
});
app.get('/zones/:id/balance', function (req, res) {
  rnet.getZoneBalance(Number(req.params.id));
  res.end();
});
app.get('/zones/:id/treble/:treble', function (req, res) {
  rnet.setZoneTreble(Number(req.params.id), Number(req.params.treble));
  res.end();
});
app.get('/zones/:id/treble', function (req, res) {
  rnet.getZoneTreble(Number(req.params.id));
  res.end();
});
app.get('/zones/:id/bass/:bass', function (req, res) {
  rnet.setZoneBass(Number(req.params.id), Number(req.params.bass));
  res.end();
});
app.get('/zones/:id/bass', function (req, res) {
  rnet.getZoneBass(Number(req.params.id));
  res.end();
});
app.get('/zones/:id/loudness/:loudness', function (req, res) {
  rnet.setZoneLoudness(Number(req.params.id), Number(req.params.loudness));
  res.end();
});
app.get('/zones/:id/loudness', function (req, res) {
  rnet.getZoneLoudness(Number(req.params.id));
  res.end();
});
app.get('/zones/:id/volume/:volume', function (req, res) {
  rnet.setZoneVolume(Number(req.params.id), Number(req.params.volume));
  res.end();
});
app.get('/zones/:id/volume', function (req, res) {
  rnet.getZoneVolume(Number(req.params.id));
  res.end();
});
app.get('/zones/:id/source/:source', function (req, res) {
  rnet.setZoneSource(Number(req.params.id), Number(req.params.source));
  res.end();
});
app.get('/zones/:id/source', function (req, res) {
  rnet.getZoneSource(Number(req.params.id));
  res.end();
});
app.get('/zones/:id/state/:state', function (req, res) {
  rnet.setZoneState(Number(req.params.id), Number(req.params.state));
  res.end();
});
app.get('/zones/:id/state', function (req, res) {
  rnet.getZoneState(Number(req.params.id));
  res.end();
});
app.get('/zones/:id/all/:state', function (req, res) {
  rnet.setAllZones(Number(req.params.state));
  res.end();
});
app.get('/zones/:id', function (req, res) {
  rnet.getZone(Number(req.params.id));
  res.end();
});

module.exports = function(f) {
  notify = f;
  return app;
};

/**
 * RNET
 */
var rnet = new Rnet();
rnet.init();

function Rnet() {
  var self = this;
  var device = null;
  var buffer = new Array();
  var serialPorts = new Array();
  var controllerId = 0x00;

  /**
   * init
   */
  this.init = function() {
    getSerialPorts();

    if (!config.get('rnet:serialPort')) {
        console.log('** NOTICE ** RNET serial port not set in config file!');
        return;
    }

    if (device && device.isOpen()) { return };

    device = new serialport.SerialPort(config.get('rnet:serialPort'), { baudrate: 19200 }, false);

    device.on('data', function(data) {
      for(var i=0; i<data.length; i++) {
        buffer.push(data[i]);
        if (data[i] == 0xf7) {
          //console.log('data: ' + stringifyByteArray(data));
          read(buffer);
          buffer = new Array();
        }
      }
    });

    device.open(function (error) {
      if (error) {
        console.log('RNET connection error: '+error);
        device = null;
        return;
      } else {
        console.log('Connected to RNET: '+config.get('rnet:serialPort'));
      }
    });
  };

  // check connection every 60 secs
  setInterval(function() { self.init(); }, 60*1000);

  /**
   * check
   */
  this.check = function() {
    if(!device) {
      return { status: 'Russound RNET plugin offline', "serialPorts": serialPorts };
    }
    return { status: 'Russound RNET plugin running' };
  };

  /**
   * write
   */
  function write(cmd) {
    if (!device || !device.isOpen()) {
      console.log('RNET not connected.');
      return;
    }

    if (!cmd || cmd.length == 0) { return; }
    //console.log('TX > '+cmd);
    device.write(buildCommand(cmd), function(err, results) {
      if (err) console.log('RNET write error: '+err);
    });
  }

  this.command = function(cmd) {
    write(cmd);
  };

  /**
   * read
   */
  function read(data) {
    if (data.length == 0) { return; }
    data.splice(-2);
    //console.log('RX < '+stringifyByteArray(data));

    var code = getSignificantBytes(data);
    if (!code) { return; }

    // generic handler
    //console.log('Handler: '+JSON.stringify(RESPONSE_TYPES[code]));
    var response = RESPONSE_TYPES[code];
    if (!response) { return; }

    var matches = getMatches(data, response['pattern']);
    if (!matches) { return; }

    responseHandler = response['handler'];
    responseHandler(matches);
  }

  /**
   * Discovery Handlers
   */
  this.discover = function() {
    if (config.get('rnet:controllerConfig')) {
      notify_handler(config.get('rnet:controllerConfig'));
      console.log('Completed controller discovery');
    } else {
      console.log('** NOTICE ** Controller configuration not set in config file!');
    }
    return;
  };

  /**
   * Generic Handlers
   */
  function zone_info(data) {
    notify_handler({
      type: 'zone',
      controller: data[0],
      zone: data[1],
      state: data[2],
      source: data[3],
      sourceName: config.get('rnet:sources')[data[3]],
      volume: data[4],
      bass: data[5],
      treble: data[6],
      loudness: data[7],
      balance: data[8],
      system: data[9],
      sharedSource: data[10],
      partyMode: data[11],
      doNotDisturb: data[12] });
  }
  this.getZone = function(id) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x01, 0x04, 0x02, 0x00, id, 0x07, 0x00, 0x00]);
  };
  this.setAllZones = function(state) {
    write([0xF0, 0x7E, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x05, 0x02, 0x02, 0x00, 0x00, 0xF1, 0x22, 0x00, 0x00, state, 0x00, 0x00, 0x01]);
    notify_handler({type: 'zone', controller: controllerId, zone: -1, state: state});
  };

  function zone_state(data) {
    notify_handler({type: 'zone', controller: data[0], zone: data[1], state: data[2]});
  }
  this.getZoneState = function(id) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x01, 0x04, 0x02, 0x00, id, 0x06, 0x00, 0x00]);
  };
  this.setZoneState = function(id, state) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x05, 0x02, 0x02, 0x00, 0x00, 0xF1, 0x23, 0x00, state, 0x00, id, 0x00, 0x01]);
    zone_state([controllerId, id, state]);
  };

  function zone_source(data) {
    notify_handler({type: 'zone', controller: data[0], zone: data[1], source: data[2], sourceName: config.get('rnet:sources')[data[2]]});
  }
  this.getZoneSource = function(id) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x01, 0x04, 0x02, 0x00, id, 0x02, 0x00, 0x00]);
  };
  this.setZoneSource = function(id, source) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, id, 0x70, 0x05, 0x02, 0x00, 0x00, 0x00, 0xF1, 0x3E, 0x00, 0x00, 0x00, source, 0x00, 0x01]);
    zone_source([controllerId, id, source, config.get('rnet:sources')[source]]);
  };

  function zone_volume(data) {
    notify_handler({type: 'zone', controller: data[0], zone: data[1], volume: data[2]});
  }
  this.getZoneVolume = function(id) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x01, 0x04, 0x02, 0x00, id, 0x01, 0x00, 0x00]);
  };
  this.setZoneVolume = function(id, volume) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x05, 0x02, 0x02, 0x00, 0x00, 0xF1, 0x21, 0x00, volume, 0x00, id, 0x00, 0x01]);
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x00, 0x05, 0x02, 0x00, id, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, volume]);
    zone_volume([controllerId, id, volume]);
  };

  function zone_bass(data) {
    notify_handler({type: 'zone', controller: data[0], zone: data[1], bass: data[2]});
  }
  this.getZoneBass = function(id) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x01, 0x05, 0x02, 0x00, id, 0x00, 0x00, 0x00, 0x00]);
  };
  this.setZoneBass = function(id, bass) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x00, 0x05, 0x02, 0x00, id, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, bass]);
    zone_bass([controllerId, id, bass]);
  };

  function zone_treble(data) {
    notify_handler({type: 'zone', controller: data[0], zone: data[1], treble: data[2]});
  }
  this.getZoneTreble = function(id) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x01, 0x05, 0x02, 0x00, id, 0x00, 0x01, 0x00, 0x00]);
  };
  this.setZoneTreble = function(id, treble) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x00, 0x05, 0x02, 0x00, id, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, treble]);
    zone_treble([controllerId, id, treble]);
  };

  function zone_loudness(data) {
    notify_handler({type: 'zone', controller: data[0], zone: data[1], loudness: data[2]});
  }
  this.getZoneLoudness = function(id) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x01, 0x05, 0x02, 0x00, id, 0x00, 0x02, 0x00, 0x00]);
  };
  this.setZoneLoudness = function(id, loudness) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x00, 0x05, 0x02, 0x00, id, 0x00, 0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, loudness]);
    zone_loudness([controllerId, id, loudness]);
  };

  function zone_balance(data) {
    notify_handler({type: 'zone', controller: data[0], zone: data[1], balance: data[2]});
  }
  this.getZoneBalance = function(id) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x01, 0x05, 0x02, 0x00, id, 0x00, 0x03, 0x00, 0x00]);
  };
  this.setZoneBalance = function(id, balance) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x00, 0x05, 0x02, 0x00, id, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, balance]);
    zone_balance([controllerId, id, balance]);
  };

  function zone_party_mode(data) {
    notify_handler({type: 'zone', controller: data[0], zone: data[1], partyMode: data[2]});
  }
  this.getZonePartyMode = function(id) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x01, 0x05, 0x02, 0x00, id, 0x00, 0x07, 0x00, 0x00]);
  };
  this.setZonePartyMode = function(id, partyMode) {
    write([0xF0, controllerId, 0x00, 0x7F, 0x00, 0x00, 0x70, 0x00, 0x05, 0x02, 0x00, id, 0x00, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, partyMode]);
    zone_party_mode([controllerId, id, partyMode]);
  };

  /**
   * Helper Functions
   */
  function notify_handler(data) {
    notify(JSON.stringify(data));
    console.log(JSON.stringify(data));
  }

  function getSerialPorts() {
    if (serialPorts.length > 0) { return; }
    serialport.list(function (err, ports) {
      ports.forEach(function(port) {
        serialPorts.push(port.comName);
      });
      console.log('Detected serial ports: ' + JSON.stringify(serialPorts));
    });
  }

  function getSignificantBytes(arr) {
    if (arr.length < 15) { return null; };
    return ("0" + arr[9].toString(16)).slice(-2)+
           ("0" + arr[13].toString(16)).slice(-2)+
           ("0" + arr[14].toString(16)).slice(-2);
  }

  function getMatches(arr, pattern) {
    if (!pattern) { return null; }
    var re = new RegExp(pattern);
    var tmp = re.exec(stringifyByteArrayNpad(arr));

    if (!tmp) { return null; }
    var matches = [];
    for(var i=1; i<tmp.length; i++) {
      matches.push(parseInt(tmp[i],16));
    }
    return matches;
  }

  function stringifyByteArray(arr) {
    str = '';
    for(var i=0; i<arr.length; i++) {
      str = str+' 0x'+("0" + arr[i].toString(16)).slice(-2);
    }
    return str;
  }

  function stringifyByteArrayNpad(arr) {
    str = '';
    for(var i=0; i<arr.length; i++) {
      str = str+("0" + arr[i].toString(16)).slice(-2);
    }
    return str;
  }

  function buildCommand(cmd) {
      var chksum=0;
      var i=cmd.length;
      while(i--) chksum += cmd[i];
      chksum += cmd.length;
      chksum = chksum & 0x007F;
      cmd.push(chksum, 0xF7);
      //console.log('command: ' + stringifyByteArray(cmd));
      return cmd;
  }

  /**
   * Constants
   */
  // match bytes [9][13][14]
  var RESPONSE_TYPES = {
    '040700': {
      'name' : 'Zone Info',
      'description' : 'All zone info',
      'pattern' : '^f0000070(.{2})007f0000040200(.{2})07000001000c00(.{2})(.{2})(.{2})(.{2})(.{2})(.{2})(.{2})(.{2})(.{2})(.{2})(.{2})00$',
      'handler' : zone_info },
    '040600': {
      'name' : 'Zone State',
      'description' : 'Zone state change (on/off)',
      'pattern' : '^f0000070(.{2})007f0000040200(.{2})06000001000100(.{2})$',
      'handler' : zone_state },
    '040200' : {
      'name' : 'Zone Source',
      'description' : 'Zone source selected (0-5)',
      'pattern' : '^f0000070(.{2})007f0000040200(.{2})02000001000100(.{2})$',
      'handler' : zone_source },
    '040100' : {
      'name' : 'Zone Volume',
      'description' : 'Zone volume level (0x00 - 0x32, 0x00 = 0 ... 0x32 = 100 displayed)',
      'pattern' : '^f0000070(.{2})007f0000040200(.{2})01000001000100(.{2})$',
      'handler' : zone_volume },
    '050000' : {
      'name' : 'Zone Bass',
      'description' : 'Zone bass level (0x00 = -10 ... 0x0A = Flat ... 0x14 = +10)',
      'pattern' : '^f0000070(.{2})007f0000050200(.{2})0000000001000100(.{2})$',
      'handler' : zone_bass },
    '050001' : {
      'name' : 'Zone Treble',
      'description' : 'Zone treble level (0x00 = -10 ... 0x0A = Flat ... 0x14 = +10)',
      'pattern' : '^f0000070(.{2})007f0000050200(.{2})0001000001000100(.{2})$',
      'handler' : zone_treble },
    '050002' : {
      'name' : 'Zone Loudness',
      'description' : 'Zone loudness (0x00 = off, 0x01 = on )',
      'pattern' : '^f0000070(.{2})007f0000050200(.{2})0002000001000100(.{2})$',
      'handler' : zone_loudness },
    '050003' : {
      'name' : 'Zone Balance',
      'description' : 'Zone balance level (0x00 = more left ... 0x0A = center ... 0x14 = more right)',
      'pattern' : '^f0000070(.{2})007f0000050200(.{2})0003000001000100(.{2})$',
      'handler' : zone_balance },
    '050007' : {
      'name' : 'Zone Party Mode',
      'description' : 'Zone party mode state (0x00 = off, 0x01 = on, 0x02 = master)',
      'pattern' : '^f0000070(.{2})007f0000050200(.{2})0007000001000100(.{2})$',
      'handler' : zone_party_mode }
  };
}
