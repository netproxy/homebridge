var chuangmiPlugM1 = require('./lib/ChuangmiPlugM1.js');
var mistat = require('../lib/mistat');
var Service, Characteristic, Accessory, UUIDGen;

module.exports = function(homebridge) {
    Accessory = homebridge.platformAccessory;
    
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    homebridge.registerPlatform("homebridge-Plug", "chuangmiPlugM1", ChuangmiPlugM1, true);    
function ChuangmiPlugM1(log, config, api) {
    log("AirpurifierPlatform Init");
    homebridge.registerPlatform("homebridge-Plug", "chuangmiPlugM1", ChuangmiPlugM1, true);    
}

function ChuangmiPlugM1(log, config, api) {
    log("ChuangmiPlugM1 Init");
    
    this.log = log;
    this.config = config;
    this.plugAccessories = [];
    var platform = this;
    if (api) {
    this.api = api;

    this.api.on('didFinishLaunching', function() {
	    platform.log("DidFinishLaunching");
	        //以下是开始upnp发现yeelight
            platform.plugAgent = new chuangmiPlugM1(platform);
            platform.plugAgent.startDisc();
	    
	}.bind(this));
    }
}

ChuangmiPlugM1.prototype = {

    onDevFound: function(dev) {
        var that = this;
        var uuid;
        var found = 0;
        var newAccessory = null;
        var plugService = null;
        var name;

        for (var index in this.plugAccessories) {
            var accessory = this.plugAccessories[index];
            if (accessory.context.did == dev.did) {
                newAccessory = accessory;
                found = 1;
                break;
            }
        }
        var that = this;
        var uuid;
        var found = 0;
        var newAccessory = null;
        var plugService = null;
        var name ;
        
        for (var index in this.plugAccessories) {
            var accessory = this.plugAccessories[index];
            if (accessory.context.did == dev.did) {
            newAccessory = accessory;
            found = 1;
            break;
            }
	    }

        if (found) {
            this.log("cached accessory: " + newAccessory.context.did);
            plugService = newAccessory.getService(Service.Switch);
            plugService.getCharacteristic(Characteristic.On)
            .on("set", this.SetOn.bind(this))
            .on("get", this.GetOn.bind(this));
        } else {
            uuid = UUIDGen.generate(dev.did);
                name = dev.did.substring(dev.did.length-6);
                this.log("found dev: " + name); 
            newAccessory = new Accessory(name, uuid);
            newAccessory.context.did = dev.did;
            newAccessory.context.model = dev.model;
            plugService = new Service.Switch(name);	
            plugService.getCharacteristic(Characteristic.on)
            .on("set",this.SetOn.bind(this))
            .on("get",this.GetOn.bind(this))

        }
        
        dev.ctx = newAccessory;
        
        plugService
            .getCharacteristic(Characteristic.On)
            .on('set', function(value, callback) { that.exeCmd(dev.did, "power", value, callback);})
            .value = dev.power;

        // if (!found) {
        //     plugService
        // 	.addCharacteristic(Characteristic.Brightness)
        // 	.on('set', function(value, callback) { that.exeCmd(dev.did, "brightness", value, callback);})
        // 	.value = dev.bright;

        //     if (dev.model == "color" || dev.model == "stripe") {
        // 	plugService
        // 	    .addCharacteristic(Characteristic.Hue)
        // 	    .on('set', function(value, callback) { that.exeCmd(dev.did, "hue", value, callback);})
        //             .value = dev.hue;

        // 	plugService
        // 	    .addCharacteristic(Characteristic.Saturation)
        // 	    .on('set', function(value, callback) { that.exeCmd(dev.did, "saturation", value, callback);})
        //             .value = dev.sat;
        //     }
        // } else {
        //     plugService
        // 	.getCharacteristic(Characteristic.Brightness)
        // 	.on('set', function(value, callback) { that.exeCmd(dev.did, "brightness", value, callback);})
        // 	.value = dev.bright;

        //     if (dev.model == "color" || dev.model == "stripe") {
        // 	plugService
        // 	    .getCharacteristic(Characteristic.Hue)
        // 	    .on('set', function(value, callback) { that.exeCmd(dev.did, "hue", value, callback);})
        //             .value = dev.hue;
            

        // 	plugService
        // 	    .getCharacteristic(Characteristic.Saturation)
        // 	    .on('set', function(value, callback) { that.exeCmd(dev.did, "saturation", value, callback);})
        //             .value = dev.sat;
        //     }	    
        // }

        newAccessory.reachable = true;

        if (!found) {
            newAccessory.addService(plugService, name);
            this.plugAccessories.push(newAccessory);
            this.api.registerPlatformAccessories("homebridge-Plug", "chuangmiPlugM1", [newAccessory]);
        }
    },

    onDevConnected: function(dev) {
        this.log("accesseory reachable");

        this.log("dev connected " + dev.did + " " + dev.connected);	
        var accessory = dev.ctx;
        accessory.updateReachability(true);	
    },

    onDevDisconnected: function(dev) {
        this.log("accesseory unreachable");

        this.log("dev disconnected " + dev.did + " " + dev.connected);	
        var accessory = dev.ctx;

        // updateReachability seems have bug, but remove the accessory will cause
        // the name of the light gone, leave the user to decide...
        if (1) {
            accessory.updateReachability(false);	    
        } else {
            this.api.unregisterPlatformAccessories("homebridge-Plug", "chuangmiPlugM1", [accessory]);

            var idx = this.plugAccessories.indexOf(accessory);
            if (idx > -1) {
            this.plugAccessories.splice(idx, 1);
            }

            this.plugAgent.delDevice(dev.did);
        }
    },

    onDevPropChange: function(dev, prop, val) {
        var accessory = dev.ctx;
        var character;
        var plugService = accessory.getService(Service.Lightbulb);

        this.log("update accessory prop: " + prop + "value: " + val);

        if (prop == "power") {
            character = plugService.getCharacteristic(Characteristic.On)
        // } else if (prop == "bright") {
        //     character = plugService.getCharacteristic(Characteristic.Brightness)
        // } else if (prop == "sat") {
        //     character = plugService.getCharacteristic(Characteristic.Saturation)
        // } else if (prop == "hue") {
        //     character = plugService.getCharacteristic(Characteristic.Hue)
        // } else {
        //     return;
        }
        character.updateValue(val);
    },

    configureAccessory: function(accessory) {
        var platform = this;

        //accessory.updateReachability(false);
        accessory.reachable = true;

        accessory.on('identify', function(paired, callback) {
                platform.log("identify ....");
        });

        this.plugAccessories.push(accessory);
        
        return;
    },

   exeCmd: function(did, characteristic, value, callback) {
        dev = this.plugAgent.getDevice(did);

        if (dev == null) {
            this.log("no device found for did: " + did);
            return;
        }

        switch(characteristic.toLowerCase()) {
            
        case 'identify':
        this.log("identfy....");
            //dev.setBlink();
            break;
        case 'power':
             dev.setPower(value);
           break;
        // case 'hue':
        //     dev.setColor(value, dev.sat);
        //     break;
        // case 'brightness':
        //     dev.setBright(value);
        //     break;
        // case 'saturation':
        //     dev.setColor(dev.hue, value);
        //     break;
        default:
            break;
        }

        if (callback)
            callback();
    },
    SetOn:{

        function(value, callback) {
            var method_name = "set_power";
            var method_args = value ? ["on"] : ["off"];

            console.log("SetOn: " + value + " => " + method_name + ": " + method_args);
            mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'set', 'On', value);

            this.device.homekit_execute_method(method_name, method_args, callback);
        }


    },

    GetOn : function(callback){
        var method_name = "get_prop";
        var method_args = ['power'];
        console.log("GetOn => " + method_name + ": " + method_args);
        mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'On', -1e);
        this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
            if (jres && jres.result && jres.result[0]) {
                var value = jres.result[0];
                console.log("On = " + value);
                var v = value == "on" ? 1 : 0;
                callback(code, v);
            }
            else {
                callback(code, 0);
            }
        });
    },
    /*
    configurationRequestHandler : function(context, request, callback) {
	this.log("Context: ", JSON.stringify(context));
	this.log("Request: ", JSON.stringify(request));

	// Check the request response
	if (request && request.response && request.response.inputs && request.response.inputs.name) {
	    this.addAccessory(request.response.inputs.name);
	    return;
	}


	var respDict = {
	    "type": "Interface",
	    "interface": "input",
	    "title": "Add Accessory",
	    "items": [
		{
		    "id": "name",
		    "title": "Name",
		    "placeholder": "Fancy Light"
		},
	    ]
	}

	context.ts = "Hello";
	//invoke callback to update setup UI
	callback(respDict);
    }
    */
};


