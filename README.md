# SmartThings

Repository for all things related to SmartThings.
- SmartThing Node Proxy
  - Envisalink Vista TPI Plugin
  - Russound RNET Plugin
- SmartThings SmartApps
  - Honeywell Security
  - Russound RNET
  - Blink Home Monitoring

## SmartThings Node Proxy

Node JS proxy service for connecting SmartThings apps and devices via local LAN to anything.  Built the service as I needed to connect to a Russound multi-zone controller/amplifier via RS-232 and this seemed the easiest.  Extended the service to connect to a Honeywell Ademco alarm system via Envisalink TPI all on local LAN.  The service accepts inbound HTTP calls from your SmartThings apps and devices and is setup to support HTTP NOTIFY callbacks to SmartThings.  This allows you to connect apps and devices to things asynchronously and not require refresh or polling from SmartThings to obtain status.  This also allows you to setup local LAN communication between devices and forego the SmartThings cloud service for callbacks using OAUTH.  Plugin support is available, allowing you to extend the functionality of the service.

### Config
```
config.json
{
  "port": 8080,                   // REQUIRED: SmartThings Node Porxy service port
  "authCode": "secret-key"        // REQUIRED: Auth code used to gain access to SmartThings Node Proxy
  "notify": {
    "address": "192.168.2.31",    // OPTIONAL (will be set automatically): See /subscribe route below
    "port": "39500"               // OPTIONAL (will be set automatically): See /subscribe route below
  }
}
```

### Installation
1. Install Node
2. Download smartthings-nodeproxy to local folder
3. Download and install all package dependencies:

  ```
  cd ~/smartthings-nodeproxy
  npm install
  ```
4. Edit `config.json`
  * Remove all comments
  * Set *port*
  * Set *authCode*.
5. Start the service using the included script:

  ```
  ./restart.me
  ```
6. Open a browser and test access:

  ```
  http://<proxy-ip>:<port>
  ```

### Usage

#### Routes
```
/
```
Default root which can be used to test if the service is up and running.

```
/subscribe/<host:port>
```
Called by the SmartThings app/device to set the callback/notify host address and port.  This will usually be set to the SmartThings Hub IP and port.  The notify host address and port will be saved to the config file.

#### Plugins
All plugins located in the `./plugins` folder will be automatically loaded by the SmartThings Node Proxy.
* To include a plugin, place it in the `./plugins` folder.
* To exclude a plugin, remove it from the `./plugins` folder.

Configuration data for the plugins is also stored in the `config.json` configuration file.

#### Callback / Notifications
A plugin can post data to the SmartThings Hub asynchronously via an HTTP NOTIFY.  The `notify()` method is exposed to a plugin by the SmartThings Node Proxy, to be used for this purpose.  The plugin can call the `notify()` method to post data back to the SmartThings Hub whenever an update or change of state is required.  It is the responsibility of the corresponding SmartThings app/device to process the notification.

### Envisalink Vista TPI Plugin
SmartThings Node Proxy plugin to connect over local lan to a Honeywell / Ademco Vista 20p alarm panel.

Supports the following zone types:
- Door, Window Contact
- Motion Sensor
- Smoke Detector

Supports the following actions:
- Arm Away
- Arm Stay
- Disarm

#### Config
```
config.json
{
  "envisalink": {
    "address": "192.168.1.11",    // OPTIONAL (can be set via SmartApp): Address of Envisalink Vista TPI module
    "port": "4025",               // OPTIONAL (can be set via SmartApp): Envisalink port - default is 4025
    "password": "user",           // OPTIONAL (can be set via SmartApp): Envisalink password - default is user
    "securityCode": "1234",       // OPTIONAL (can be set via SmartApp): Security code to arm/disarm the panel

    "panelConfig": {              // REQUIRED: Set this to define partitions and zones
      "type": "discover",
      "partitions": [
        {"partition": 1, "name": "Security Panel"}
      ],
      "zones": [
        {"zone": 1, "type": "smoke", "name": "Smoke Detector"},
        {"zone": 2, "type": "contact", "name": "Front Door"},
        {"zone": 3, "type": "contact", "name": "Back Door"},
        {"zone": 4, "type": "contact", "name": "Kitchen Door"},
        {"zone": 5, "type": "contact", "name": "Kitchen Window"}
      ]
    }
  }
}
```

#### Installation
1. Verify `envisalink.js` plugin is in `./plugins` folder
2. Edit `config.json`
  * Remove all comments
  * Set *envisalink* configuration settings
3. Restart the SmartThings Node Proxy service using the included script:

  ```
  ./restart.me
  ```
4. Check log files to verify startup and connectivity to the Envisalink Vista TPI module

### Russound RNET Plugin
SmartThings Node Proxy plugin to connect over RS-232 to Russound multi-zone controller such as CAA66, CAM66, CAV66, etc.

Supports by default 6 zones and 6 sources.  The Russound multi-zone controller must support RNET over RS-232.

Supports the following actions:
- Zone ON/OFF
- Source assignment
- Volume level
- Bass level
- Treble level
- Loudness
- Balance

#### Config
```
config.json
{
  "rnet": {
    "serialPort": "/dev/usbser",  // REQUIRED: RS-232 port connected to Russound controller
    "sources": [                  // REQUIRED: Set this to define sources
      "Sonos",
      "Airplay",
      "Apple TV",
      "Source 4",
      "Source 5",
      "Source 6"
    ],
    "controllerConfig": {         // REQUIRED: Set this to define zones
      "type": "discover",
      "zones": [
        {"zone": 0, "name": "Family Room"},
        {"zone": 1, "name": "Kitchen"},
        {"zone": 2, "name": "Living Room"},
        {"zone": 3, "name": "Patio"},
        {"zone": 4, "name": "Dining Room"},
        {"zone": 5, "name": "Office"}
      ]
    }
  }
}
```

#### Installation
1. Verify `rnet.js` plugin is in `./plugins` folder
2. Edit `config.json`
  * Remove all comments
  * Set *rnet* configuration settings
3. Restart the SmartThings Node Proxy service using the included script:

  ```
  ./restart.me
  ```
4. Check log files to verify startup and connectivity to the Russound controller.  *NOTE: if you do not know the name of the USB serial device, check the logs after service startup as the plugin will dump a list of known/detected USB serial devices for you to identify.*

## SmartThings SmartApps

### Honeywell Security
SmartApp and Devices to support full SmartThings integration with the Honeywell / Ademco Vista 20p alarm panel.  This will allow you to view status of the zones, view the status of the alarm panel and arm/disarm the panel, as well as integrate with the SmartThings Smart Home Monitor.  The SmartApp and Devices communicate with the alarm panel via the SmartThings Node Proxy Envisalink plugin (pictured below).  Make sure that you have the SmartThings Node Proxy and Envisalink plugin installed and working before adding the SmartApp and Devices to SmartThings.

```
SmartThings Hub <-> SmartThings Node Proxy <-> Envisalink plugin <-> Envisalink Vista TPI module <-> Honeywell / Ademco Vista panel
```

#### Installation
1. Create a new SmartApp and use the code from ./smartapps/honeywell-security.groovy
2. Create the following new Device Handlers:
  - ./devicetypes/honeywell-partition.groovy
  - ./devicetypes/honeywell-zone-contact.groovy
  - ./devicetypes/honeywell-zone-motion.groovy
  - ./devicetypes/honeywell-zone-smoke.groovy
3. Add the Honeywell Security SmartApp from the SmartThings marketplace
4. Configure the SmartApp
  - SmartThings Hub: REQUIRED
  - SmartThings Node Proxy: REQUIRED to connect to the SmarThings Node Proxy
  - Envisalink Vista TPI: OPTIONAL as this can also be set in `config.json`
  - Security Panel: OPTIONAL as this can also be set in `config.json`
  - Smart Home Monitor: OPTIONAL integration with SmartThings Smart Home Monitor
5. Done! *Note that all the zones defined in `config.json` will be loaded 10 seconds after the SmartApp is configured and all the devices should show up under your Things.  If the zones/devices do not show up, simply open the SmartApp again and hit done to force a refresh of the zones/devices.*

### Russound RNET
SmartApp and Devices to support full SmartThings integration with a Russound multi-zone controller.  This will allow you to view status of the zones and perform actions against the controller.  The SmartApp and Devices communicate with the audio controller via the SmartThings Node Proxy Russound RNET plugin (pictured below).  Make sure that you have the SmartThings Node Proxy and Russound RNET plugin installed and working before adding the SmartApp and Devices to SmartThings.

```
SmartThings Hub <-> SmartThings Node Proxy <-> Russound RNET plugin <-> Russound multi-zone controller
```

#### Installation
1. Create a new SmartApp and use the code from ./smartapps/russound-rnet.groovy
2. Create a new Device Handler and use the code from ./devicetypes/russound-zone.groovy
3. Add the Russound RNET SmartApp from the SmartThings marketplace
4. Configure the SmartApp
  - SmartThings Hub: REQUIRED
  - SmartThings Node Proxy: REQUIRED to connect to the SmarThings Node Proxy
5. Done! *Note that all the zones defined in `config.json` will be loaded 10 seconds after the SmartApp is configured and all the devices should show up under your Things.  If the zones/devices do not show up, simply open the SmartApp again and hit done to force a refresh of the zones/devices.*

### Blink Home Monitoring
SmartApp and Devices to support basic SmartThings integration with a Blink Monitoring System.  This will allow you to view status of the monitoring system and arm/disarm the system, as well as integrate with the SmartThings Smart Home Monitor

#### Installation
1. Create a new SmartApp and use the code from ./smartapps/blink-home-monitoring.groovy
2. Create a new Device Handler and use the code from ./devicetypes/blink-monitor.groovy
3. Add the Blink Home Monitoring SmartApp from the SmartThings marketplace
4. Configure the SmartApp
  - SmartThings Hub: REQUIRED
  - Blink Credentials: REQUIRED to connect to the Blink monitoring system
  - Smart Home Monitor: OPTIONAL integration with SmartThings Smart Home Monitor
5. Done!
