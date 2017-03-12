var mistat = require('../lib/mistat');
var uuid = require('hap-nodejs').uuid;
var Accessory = require('hap-nodejs').Accessory;
var Service = require('hap-nodejs').Service;
var Characteristic = require('hap-nodejs').Characteristic;

module.exports = function (device) {
    var a = new ChuangmiPlugV1(device);
    return a.getAccessory();
};

function ChuangmiPlugV1(device) {
    this.device = device;
    this.accessory = new Accessory(device.displayName, uuid.generate(device.mac));
    this.accessory.username = device.mac;
    this.initializeServices();
}

ChuangmiPlugV1.prototype.getAccessory = function () {
    return this.accessory;
}

ChuangmiPlugV1.prototype.initializeServices = function () {
    var Switch = new Service.Switch("Switch");

    Switch.getCharacteristic(Characteristic.On)
        .on("set", this.SetOn.bind(this))
        .on("get", this.GetOn.bind(this));

    this.accessory.addService(Switch);
}

ChuangmiPlugV1.prototype.SetOn = function(value, callback) {
    var method_name = "set_power";
    var method_args = value ? ["on"] : ["off"];

    console.log("SetOn: " + value + " => " + method_name + ": " + method_args);
    mistat(this.device.sDid, this.device.routerMac, this.device.sModel, 'set', 'On', value);

    this.device.homekit_execute_method(method_name, method_args, callback);
}

ChuangmiPlugV1.prototype.GetOn = function(callback) {
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