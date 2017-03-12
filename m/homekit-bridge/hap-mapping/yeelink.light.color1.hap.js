var mistat = require('../lib/mistat');
var uuid = require('hap-nodejs').uuid;
var Accessory = require('hap-nodejs').Accessory;
var Service = require('hap-nodejs').Service;
var Characteristic = require('hap-nodejs').Characteristic;

module.exports = function (device) {
    var a = new YeelinkLightColor1(device);
    return a.getAccessory();
};

function YeelinkLightColor1(device) {
    this.device = device;
    this.accessory = new Accessory(device.displayName, uuid.generate(device.mac));
    this.accessory.username = device.mac;
    this.initializeServices();
}

YeelinkLightColor1.prototype.getAccessory = function () {
    return this.accessory;
}

YeelinkLightColor1.prototype.initializeServices = function () {
    var Lightbulb = new Service.Lightbulb("Lightbulb");

    Lightbulb.getCharacteristic(Characteristic.On)
        .on("set", this.SetOn.bind(this))
        .on("get", this.GetOn.bind(this));

    Lightbulb.getCharacteristic(Characteristic.Brightness)
        .on("set", this.SetBrightness.bind(this))
        .on("get", this.GetBrightness.bind(this));

    Lightbulb.getCharacteristic(Characteristic.Hue)
        .on("set", this.SetHue.bind(this))
        .on("get", this.GetHue.bind(this));

    this.accessory.addService(Lightbulb);
}

YeelinkLightColor1.prototype.SetOn = function(value, callback) {
    var method_name = "set_power";
    var method_args = value ? ["on"] : ["off"];

    console.log("SetOn: " + value + " => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'set', 'On', value);

    this.device.homekit_execute_method(method_name, method_args, callback);
}

YeelinkLightColor1.prototype.GetOn = function(callback) {
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

YeelinkLightColor1.prototype.SetBrightness = function(value, callback) {
    var method_name = "set_bright";
    var method_args = [value, "sudden", 0];

    console.log("SetBrightness: " + value + " => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'set', 'Brightness', value);

    this.device.homekit_execute_method(method_name, method_args, callback);
}

YeelinkLightColor1.prototype.GetBrightness = function(callback) {
    var method_name = "get_prop";
    var method_args = ['bright'];

    console.log("GetBrightness => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'Brightness', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = parseInt(jres.result[0]);
            console.log("Brightness = " + value);
            callback(code, value);
        }
        else {
            callback(code, 0);
        }
    });
}

YeelinkLightColor1.prototype.SetHue = function(value, callback) {
    var v = value * 360.0 / 0xffffff;
    var method_name = "set_rgb";
    var method_args = [v, "sudden", 0];

    console.log("SetHue: " + value + " => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'set', 'Hue', value);

    this.device.homekit_execute_method(method_name, method_args, callback);
}

YeelinkLightColor1.prototype.GetHue = function(callback) {
    var method_name = "get_prop";
    var method_args = ['color'];

    console.log("GetHue => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'get', 'Hue', 0);

    this.device.homekit_execute_get(method_name, method_args, function (code, jres) {
        if (jres && jres.result && jres.result[0]) {
            var value = jres.result[0];
            var v = value * 360.0 / 0xffffff;
            console.log("Hue = " + value);
            callback(code, v);
        }
        else {
            callback(code, 0.0);
        }
    });
}