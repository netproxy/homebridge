var mistat = require('../lib/mistat');
var uuid = require('hap-nodejs').uuid;
var Accessory = require('hap-nodejs').Accessory;
var Service = require('hap-nodejs').Service;
var Characteristic = require('hap-nodejs').Characteristic;

module.exports = function (device) {
    var a = new ZhimiFanV2(device);
    return a.getAccessory();
};

function ZhimiFanV2(device) {
    this.device = device;
    this.accessory = new Accessory(device.displayName, uuid.generate(device.mac));
    this.accessory.username = device.mac;
    this.initializeServices();
}

ZhimiFanV2.prototype.getAccessory = function () {
    return this.accessory;
}

ZhimiFanV2.prototype.initializeServices = function () {
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
     * TemperatureSensor
     */
    var theTemperatureSensor = new Service.TemperatureSensor("Temperature");
    theTemperatureSensor.getCharacteristic(Characteristic.CurrentTemperature)
        .on("get", this.GetCurrentTemperature.bind(this));

    this.accessory.addService(theTemperatureSensor);

    /**
     * HumiditySensor
     */
    var theHumiditySensor = new Service.HumiditySensor("Humidity");
    theHumiditySensor.getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on("get", this.GetCurrentRelativeHumidity.bind(this));

    this.accessory.addService(theHumiditySensor);

    /**
     * BatteryService
     */
    var theBatteryService = new Service.BatteryService("Battery");
    theBatteryService.getCharacteristic(Characteristic.BatteryLevel)
        .on("get", this.GetBatteryLevel.bind(this));

    theBatteryService.getCharacteristic(Characteristic.ChargingState)
        .on("get", this.GetChargingState.bind(this));

    theBatteryService.getCharacteristic(Characteristic.StatusLowBattery)
        .on("get", this.GetStatusLowBattery.bind(this));

    this.accessory.addService(theBatteryService);
}

ZhimiFanV2.prototype.SetOn = function(value, callback) {
    var method_name = "set_power";
    var method_args = value ? ["on"] : ["off"];

    console.log("SetOn: " + value + " => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'set', 'On', value);

    this.device.homekit_execute_method(method_name, method_args, callback);
}

ZhimiFanV2.prototype.GetOn = function(callback) {
    var method_name = "get_prop";
    var method_args = ['power'];

    console.log("GetOn => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'On', 0);

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
}

ZhimiFanV2.prototype.SetRotationSpeed = function(value, callback) {
    var method_name = "set_speed_level";
    var method_args = [value];

    if (value == 0) {
        method_name = "set_power";
        method_args = ["off"];
    }

    console.log("SetRotationSpeed: " + value + " => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'set', 'RotationSpeed', value);

    this.device.homekit_execute_method(method_name, method_args, callback);
}

ZhimiFanV2.prototype.GetRotationSpeed = function(callback) {
    var method_name = "get_prop";
    var method_args = ['speed_level'];

    console.log("GetRotationSpeed => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'RotationSpeed', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            console.log("RotationSpeed = " + value);
            callback(code, value);
        }
        else {
            callback(code, 0);
        }
    });
}

ZhimiFanV2.prototype.GetCurrentTemperature = function(callback) {
    var method_name = "get_prop";
    var method_args = ['temp_dec'];

    console.log("GetCurrentTemperature => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'CurrentTemperature', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            console.log("CurrentTemperature = " + value);

            var v = value / 10;
            if (v > 100) {
                v = 100;
            }

            if (v < 0) {
                v = 0;
            }

            callback(code, v);
        }
        else {
            callback(code, 0);
        }
    });
}

ZhimiFanV2.prototype.GetCurrentRelativeHumidity = function(callback) {
    var method_name = "get_prop";
    var method_args = ['humidity'];

    console.log("GetCurrentRelativeHumidity => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'CurrentRelativeHumidity', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            console.log("CurrentRelativeHumidity = " + value);

            callback(code, value);
        }
        else {
            callback(code, 0);
        }
    });
}

ZhimiFanV2.prototype.GetBatteryLevel = function(callback) {
    var method_name = "get_prop";
    var method_args = ['battery'];

    console.log("GetBatteryLevel => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'BatteryLevel', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            console.log("BatteryLevel = " + value);

            if (value < 0) {
                value = 0;
            }

            callback(code, value);
        }
        else {
            callback(code, 0);
        }
    });
}

ZhimiFanV2.prototype.GetChargingState = function(callback) {
    var method_name = "get_prop";
    var method_args = ['bat_charge'];

    console.log("GetChargingState => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'ChargingState', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            console.log("ChargingState = " + value);

            var v = 0;
            if (value === "progress") {
                v = 1;
            }

            callback(code, v);
        }
        else {
            callback(code, 0);
        }
    });
}

ZhimiFanV2.prototype.GetStatusLowBattery = function(callback) {
    var method_name = "get_prop";
    var method_args = ['battery'];

    console.log("GetStatusLowBattery => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'StatusLowBattery', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            console.log("StatusLowBattery = " + value);

            /**
             * 0: NORMAL, 1 = LOW
             */
            var v = 0;
            if (value < 30) {
                v = 1;
            }

            callback(code, v);
        }
        else {
            callback(code, 0);
        }
    });
}