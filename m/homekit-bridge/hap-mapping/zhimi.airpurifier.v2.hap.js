var mistat = require('../lib/mistat');
var uuid = require('hap-nodejs').uuid;
var Accessory = require('hap-nodejs').Accessory;
var Service = require('hap-nodejs').Service;
var Characteristic = require('hap-nodejs').Characteristic;

module.exports = function (device) {
    var a = new ZhimiAirpurifierV2(device);
    return a.getAccessory();
};

function ZhimiAirpurifierV2(device) {
    this.device = device;
    this.accessory = new Accessory(device.displayName, uuid.generate(device.mac));
    this.accessory.username = device.mac;
    this.initializeServices();
}

ZhimiAirpurifierV2.prototype.getAccessory = function () {
    return this.accessory;
}

ZhimiAirpurifierV2.prototype.initializeServices = function () {
    /**
     * Fan
     */
    var theFan = new Service.Fan("Fan");

    theFan.getCharacteristic(Characteristic.On)
        .on("set", this.SetOn.bind(this))
        .on("get", this.GetOn.bind(this));

    theFan.getCharacteristic(Characteristic.RotationSpeed)
        .on("set", this.SetRotationSpeed.bind(this))
        .on("get", this.GetRotationSpeed.bind(this));

    this.accessory.addService(theFan);

    /**
     * AirQualitySensor
     */
    var theAirQualitySensor = new Service.AirQualitySensor("AirQualitySensor");
    theAirQualitySensor.getCharacteristic(Characteristic.AirQuality)
        .on("get", this.GetAirQuality.bind(this));

    this.accessory.addService(theAirQualitySensor);
}

ZhimiAirpurifierV2.prototype.SetOn = function(value, callback) {
    var method_name = "set_mode";
    var method_args = value ? ["auto"] : ["idle"];

    console.log("SetOn: " + value + " => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'set', 'On', value);

    this.device.homekit_execute_method(method_name, method_args, callback);
}

ZhimiAirpurifierV2.prototype.GetOn = function(callback) {
    var method_name = "get_prop";
    var method_args = ['mode'];

    console.log("GetOn => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'On', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            console.log("On = " + value);

            var v = value == "idle" ? 0 : 1;

            callback(code, v);
        }
        else {
            callback(code, 0);
        }
    });
}

ZhimiAirpurifierV2.prototype.SetRotationSpeed = function(value, callback) {
    var method_name = "set_mode";
    var method_args;

    if (value == 0) {
        method_args = ["idle"];
    }
    else if (value < 20) {
        method_args = ["silent"];
    }
    else if (value < 40) {
        method_args = ["low"];
    }
    else if (value < 60) {
        method_args = ["medium"];
    }
    else if (value < 80) {
        method_args = ["high"];
    }
    else if (value <= 100) {
        method_args = ["strong"];
    }
    else {
        method_args = ["auto"];
    }

    console.log("SetRotationSpeed: " + value + " => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'set', 'RotationSpeed', value);

    this.device.homekit_execute_method(method_name, method_args, callback);
}

ZhimiAirpurifierV2.prototype.GetRotationSpeed = function(callback) {
    var method_name = "get_prop";
    var method_args = ['speed_level'];

    console.log("GetRotationSpeed => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'RotationSpeed', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            var v = 50;

            if (value === "idle") {
                v = 0;
            }
            else if (value === 'silent') {
                v = 20;
            }
            else if (value === "low") {
                v = 40;
            }
            else if (value === 'medium') {
                v = 60;
            }
            else if (value === 'high') {
                v = 80;
            }
            else if (value === 'strong') {
                v = 100;
            }
            else {
                v = 50;
            }

            console.log("RotationSpeed = " + v);
            callback(code, v);
        }
        else {
            callback(code, 0);
        }
    });
}

ZhimiAirpurifierV2.prototype.GetAirQuality = function(callback) {
    var method_name = "get_prop";
    var method_args = ['aqi'];

    console.log("GetAirQuality => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'AirQuality', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            console.log("get_prop aqi = " + value);
            var v = 0;

            if (value < 120) {
                v = 1;
            }
            else if (value < 240) {
                v = 2;
            }
            else if (value < 360) {
                v = 3;
            }
            else if (value < 480) {
                v = 4;
            }
            else if (value < 600) {
                v = 5;
            }
            else {
                v = 0;
            }

            console.log("GetAirQuality = " + v);

            callback(code, v);
        }
        else {
            callback(code, 0);
        }
    });
}
