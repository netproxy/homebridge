

var uuid = require('hap-nodejs').uuid;
var Bridge = require('hap-nodejs').Bridge;
var Accessory = require('hap-nodejs').Accessory;
var Service = require('hap-nodejs').Service;
var Characteristic = require('hap-nodejs').Characteristic;
var fs = require('fs');
var path = require('path');

var mistat = require('../lib/mistat');

module.exports = {

    makeHomekitAccessory : makeHomekitAccessory
};


function makeHomekitAccessory(miioDev) {
    var theAccessory =  createAccessoryFromScript(miioDev);
    if (! theAccessory) {
        theAccessory = createAccessoryFromMappingFile(miioDev);
    }

    return theAccessory;
};

var hap_services =
{
    "AccessoryInfo": Service.AccessoryInfo,
    "AirQualitySensor": Service.AirQualitySensor,
    "BatteryService": Service.BatteryService,
    "CarbonDioxideSensor": Service.CarbonDioxideSensor,
    "CarbonMonoxideSensor": Service.CarbonMonoxideSensor,
    "ContactSensor": Service.ContactSensor,
    "Door": Service.Door,
    "Fan": Service.Fan,
    "GarageDoorOpener": Service.GarageDoorOpener,
    "HumiditySensor": Service.HumiditySensor,
    "LeakSensor": Service.LeakSensor,
    "Lightbulb": Service.Lightbulb,
    "LightSensor": Service.LightSensor,
    "LockManagement": Service.LockManagement,
    "LockMechanism": Service.LockMechanism,
    "MotionSensor": Service.MotionSensor,
    "OccupancySensor": Service.OccupancySensor,
    "Outlet": Service.Outlet,
    "SecuritySystem": Service.SecuritySystem,
    "SmokeSensor": Service.SmokeSensor,
    "StatefulProgrammableSwitch": Service.StatefulProgrammableSwitch,
    "StatelessProgrammableSwitch": Service.StatelessProgrammableSwitch,
    "Switch": Service.Switch,
    "TemperatureSensor": Service.TemperatureSensor,
    "Thermostat": Service.Thermostat,
    "Window": Service.Window,
    "WindowCovering": Service.WindowCovering
}

var hap_chars =
{
    "AdministratorOnlyAccess": Characteristic.AdministratorOnlyAccess,
    "AirParticulateDensity": Characteristic.AirParticulateDensity,
    "AirParticulateSize": Characteristic.AirParticulateSize,
    "AirQuality": Characteristic.AirQuality,
    "AudioFeedback": Characteristic.AudioFeedback,
    "BatteryLevel": Characteristic.BatteryLevel,
    "Brightness": Characteristic.Brightness,
    "CarbonDioxideDetected": Characteristic.CarbonDioxideDetected,
    "CarbonDioxideLevel": Characteristic.CarbonDioxideLevel,
    "CarbonDioxidePeakLevel": Characteristic.CarbonDioxidePeakLevel,
    "CarbonMonoxideDetected": Characteristic.CarbonMonoxideDetected,
    "CarbonMonoxideLevel": Characteristic.CarbonMonoxideLevel,
    "CarbonMonoxidePeakLevel": Characteristic.CarbonMonoxidePeakLevel,
    "ChargingState": Characteristic.ChargingState,
    "ContactSensorState": Characteristic.ContactSensorState,
    "CoolingThresholdTemperature": Characteristic.CoolingThresholdTemperature,
    "CurrentAmbientLightLevel": Characteristic.CurrentAmbientLightLevel,
    "CurrentDoorState": Characteristic.CurrentDoorState,
    "CurrentHeatingCoolingState": Characteristic.CurrentHeatingCoolingState,
    "CurrentHorizontalTiltAngle": Characteristic.CurrentHorizontalTiltAngle,
    "CurrentPosition": Characteristic.CurrentPosition,
    "CurrentRelativeHumidity": Characteristic.CurrentRelativeHumidity,
    "CurrentTemperature": Characteristic.CurrentTemperature,
    "CurrentVerticalTiltAngle": Characteristic.CurrentVerticalTiltAngle,
    "FirmwareRevision": Characteristic.FirmwareRevision,
    "HardwareRevision": Characteristic.HardwareRevision,
    "HeatingThresholdTemperature": Characteristic.HeatingThresholdTemperature,
    "HoldPosition": Characteristic.HoldPosition,
    "Hue": Characteristic.Hue,
    "Identify": Characteristic.Identify,
    "LeakDetected": Characteristic.LeakDetected,
    "LockControlPoint": Characteristic.LockControlPoint,
    "LockCurrentState": Characteristic.LockCurrentState,
    "LockLastKnownAction": Characteristic.LockLastKnownAction,
    "LockManagementAutoSecurityTimeout": Characteristic.LockManagementAutoSecurityTimeout,
    "LockTargetState": Characteristic.LockTargetState,
    "Logs": Characteristic.Logs,
    "Manufacturer": Characteristic.Manufacturer,
    "Model": Characteristic.Model,
    "MotionDetected": Characteristic.MotionDetected,
    "Name": Characteristic.Name,
    "ObstructionDetected": Characteristic.ObstructionDetected,
    "OccupancyDetected": Characteristic.OccupancyDetected,
    "On": Characteristic.On,
    "OutletInUse": Characteristic.OutletInUse,
    "PositionState": Characteristic.PositionState,
    "ProgrammableSwitchEvent": Characteristic.ProgrammableSwitchEvent,
    "ProgrammableSwitchOutputState": Characteristic.ProgrammableSwitchOutputState,
    "RotationDirection": Characteristic.RotationDirection,
    "RotationSpeed": Characteristic.RotationSpeed,
    "Saturation": Characteristic.Saturation,
    "SecuritySystemAlarmType": Characteristic.SecuritySystemAlarmType,
    "SecuritySystemCurrentState": Characteristic.SecuritySystemCurrentState,
    "SecuritySystemTargetState": Characteristic.SecuritySystemTargetState,
    "SerialNumber": Characteristic.SerialNumber,
    "SmokeDetected": Characteristic.SmokeDetected,
    "SoftwareRevision": Characteristic.SoftwareRevision,
    "StatusActive": Characteristic.StatusActive,
    "StatusFault": Characteristic.StatusFault,
    "StatusJammed": Characteristic.StatusJammed,
    "StatusLowBattery": Characteristic.StatusLowBattery,
    "StatusTampered": Characteristic.StatusTampered,
    "TargetDoorState": Characteristic.TargetDoorState,
    "TargetHeatingCoolingState": Characteristic.TargetHeatingCoolingState,
    "TargetHorizontalTiltAngle": Characteristic.TargetHorizontalTiltAngle,
    "TargetPosition": Characteristic.TargetPosition,
    "TargetRelativeHumidity": Characteristic.TargetRelativeHumidity,
    "TargetTemperature": Characteristic.TargetTemperature,
    "TargetVerticalTiltAngle": Characteristic.TargetVerticalTiltAngle,
    "TemperatureDisplayUnits": Characteristic.TemperatureDisplayUnits,
    "Version": Characteristic.Version
}

function createAccessoryFromMappingFile(miioDev)
{
    var model = miioDev.sModel;

    var hap_mapping_file = path.join("." , "homekit-bridge", "hap-mapping" , model.replace(/-/g,".") + '.hap.json');

    console.log("[ Create Accessory ] ", hap_mapping_file);

    var jsonStr = null;
    
    try {
        jsonStr = fs.readFileSync(hap_mapping_file, 'utf8');
    }catch(e){
        console.log(hap_mapping_file + " not found");
    }
    
    if (! jsonStr) {
        return null;
    }

    var accessory  =  new Accessory( miioDev.displayName , uuid.generate(miioDev.mac));
    accessory.username = miioDev.mac;

    var profile = JSON.parse(jsonStr);

    for (var serviceIndex in  profile.services) {
        var service = profile.services[serviceIndex];
        var name = service.name;
        var newService = accessory.addService(new hap_services[name](name));

        // console.error('Service: ' + newService.displayName +  " uuid: " + newService.UUID);
        //console.error('Service: ' + newService.displayName);

        for (var charIndex in service.characteristics) {
            var chars = service.characteristics[charIndex];
            var theChar = newService.getCharacteristic(hap_chars[chars.name]);

            // console.error('Characteristics: ' + theChar.displayName + " uuid: " + theChar.UUID);
            //console.error('Characteristics: ' + theChar.displayName);

            theChar.on("set", function (value, callback) {
                mistat(miioDev.sDid, miioDev.routerMac, miioDev.sModel, 'set', hap_chars[chars.name], value);

                console.log("Set" + chars.name + ": " + value);

                var method_name = chars.set.miot_method;
                var method_args = chars.set.miot_params;
                if (!method_name) {

                    var obj = getParamsValue(chars.set.values, value);
                    if (obj) {
                        method_name = obj.miot_method;
                        method_args = obj.miot_params;
                    } else {
                        console.error('value not found!');
                        return;
                    }
                }

                miioDev.homekit_execute_method(method_name, method_args, callback);
            });

            theChar.on("get", function (callback) {
                mistat(miioDev.sDid, miioDev.routerMac, miioDev.sModel, 'get', hap_chars[chars.name], 0);

                var method_name = chars.get.miot_method;
                var method_args = chars.get.miot_params;

                miioDev.homekit_execute_get(method_name, method_args, function (code,jres) {
                    if (jres && jres.result && jres.result[0]) {
                        console.log("Get" + chars.name + ":" + jres.result[0]);

                        var res = getParamsResult(chars.get.values, jres.result[0]);
                        if (res) {
                            callback(code, res);
                            return;
                        }
                    }

                    callback(code, false);
                });
            })
        }
    }

    return accessory;
}

function getParamsValue(arr, value) {
    for (var i in arr) {
        var o = arr[i];
        if (o.value === value) {
            return o;
        }
    }
    return null;
}

function getParamsResult(arr, result) {
    if (arr && arr instanceof Array) {
        for (var i in arr) {
            var o = arr[i];
            if (o.miot_result === result) {
                return o.value;
            }
        }
    }

    return null;
}

var accessory_creators =
{
    // "chuangmi.plug.m1" : require("../hap-mapping/chuangmi.plug.m1.hap"),
    // "chuangmi.plug.v1" : require("../hap-mapping/chuangmi.plug.v1.hap"),
    "philips.light.mono1" : require("../hap-mapping/philips.light.mono1.hap"),
    "yeelink.light.mono1" : require("../hap-mapping/yeelink.light.mono1.hap"),
    "yeelink.light.color1" : require("../hap-mapping/yeelink.light.color1.hap"),
    "zhimi.airpurifier.m1" : require("../hap-mapping/zhimi.airpurifier.m1.hap"),
    "zhimi.airpurifier.v1" : require("../hap-mapping/zhimi.airpurifier.v1.hap"),
    "zhimi.airpurifier.v2" : require("../hap-mapping/zhimi.airpurifier.v2.hap"),
    "zhimi.airpurifier.v3" : require("../hap-mapping/zhimi.airpurifier.v3.hap"),
    "zhimi.fan.v2" : require("../hap-mapping/zhimi.fan.v2.hap"),
}

function createAccessoryFromScript(miioDev)
{
    var model = miioDev.sModel.replace(/-/g, ".");

    console.log("[ Create Accessory ] " + model + ".js");

    var func = accessory_creators[model];
    if (func && typeof func === "function") {
        return func(miioDev);
    }

    return null;
}