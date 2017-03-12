/**
 * Created by miwifi on 6/28/16.
 */


var fs = require('fs');
var path = require('path');


const HAP = require('hap-nodejs');
var uuid = require('hap-nodejs').uuid;
var Bridge = require('hap-nodejs').Bridge;
var Accessory = require('hap-nodejs').Accessory;
var Service = require('hap-nodejs').Service;
var Characteristic = require('hap-nodejs').Characteristic;


var MiioDevice = require("./lib/MiioDevice.js").MiioDevice;
var MiwifiFeature = require("./lib/MiwifiFeature.js").MiwifiFeature;
var MappingFactory = require("./lib/MappingFactory.js");


console.log("Homekit Bridge starting...");

/*
MiwifiFeature.LOOP_DELAY = 3000;
MiwifiFeature.trafficCmd = "cat /media/xiaoqiang/out";
MiwifiFeature.macCmd = "ifconfig eth0";
MiwifiFeature.nameCmd = "echo miio_test";
MiwifiFeature.uuidCmd = "echo  4355d2ed-9cb6-4a53-b422-7a96614932b3 ";
*/

// Initialize our storage system
HAP.init("hap-mapping");

var DISPLAY_CONF = {
    "mac": "",
    "pin" : "000-00-000",
    "devCount" : 0
};

var targetPort = 51826;
var CONNECTED_DEVS = {
    // "mac" : Accessory
};

var lazyWrite = null;
function writeDisplayConf() {
    if(lazyWrite){
        clearTimeout(lazyWrite);
    }
    lazyWrite = setTimeout(function () {

        fs.writeFile("/var/run/info", JSON.stringify( DISPLAY_CONF ), function(err) {
            if(err) {
                return console.log(err);
            }
        });

    },3000);
};



var miwifi = new MiwifiFeature({ handleInit:function () {

    console.log("MiwifiFeature");
    DISPLAY_CONF.mac = miwifi.mac;

    var hashid = uuid.generate( miwifi.mac );
    DISPLAY_CONF.pin = hashid.charCodeAt(0) % 10 +  "" + hashid.charCodeAt(1) % 10 + "" +hashid.charCodeAt(2) % 10 +  "-" + hashid.charCodeAt(3) % 10 + "" + hashid.charCodeAt(4) % 10 + "-" + hashid.charCodeAt(5) % 10 +  "" + hashid.charCodeAt(6) % 10 + "" +hashid.charCodeAt(7) % 10


    /*bridge = new Bridge(miwifi.displayName, hashid ); //todo

    bridge.on('identify', function(paired, callback) {
        console.log("identify");
        //todo maybe send miwif push ?
        callback(); // success
    });

    bridge.publish({
        username: miwifi.mac, //todo miwif mac
        port: 51826,
        pincode: DISPLAY_CONF.pin, //todo gen from miwif uuid
        category: Accessory.Categories.BRIDGE
    });*/

    writeDisplayConf();
    miwifi.startReadLoop();
},//end handleInit
    handleOnline:function (miioDev) {

        DISPLAY_CONF.devCount = miwifi.userDeviceListLength;
        writeDisplayConf();
        //make correct homekit dev
        miioDev.routerMac = miwifi.mac;

        if(CONNECTED_DEVS[miioDev.mac]){
           return;
        }

        var swi;
        if(miioDev.sModel.indexOf("lumi-gateway-") > -1 ){
            swi = makeGateway(miioDev);
        }else{
            swi  = MappingFactory.makeHomekitAccessory(miioDev);
        }

        if (! swi) {
            console.log("Accessory undefined!");
            return;
        }

        console.log("Accessory add:" + swi.UUID);

        CONNECTED_DEVS[miioDev.mac] = swi;

        try {
            swi.publish({
                port: targetPort++,
                username: swi.username,
                pincode: DISPLAY_CONF.pin
            });
        }catch (e){
            console.log("Accessory Publish Error");
            console.log(e);
        }

    },
    handleOffline:function (miioDev) {
        DISPLAY_CONF.devCount = miwifi.userDeviceListLength;
        writeDisplayConf();

        /*
        var myuuid = uuid.generate(miioDev.mac);
        console.log("bridge remove:" + myuuid);
        
        for (var index in bridge.bridgedAccessories) {
            var existing = bridge.bridgedAccessories[index];
            if (existing.UUID === myuuid) {
                bridge.removeBridgedAccessory(existing);
                break;
            }
        }

        if(miioDev.sModel.indexOf("lumi-gateway-") > -1 ){
            for(var sid in miioDev.subDev){
                bridge.removeBridgedAccessory(miioDev.subDev[sid]);
                delete miioDev.subDev[sid];
            }
        }*/

    },

    handleLoop : function () {

    }
});
console.log("miwifi.init() start");
miwifi.init();
console.log("miwifi.init() end");


//blocking to run

function makeGateway(miioDev) {

    var swi  =  new Accessory( miioDev.displayName , uuid.generate(miioDev.mac));
    swi.username = miioDev.mac;
    swi
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, miioDev.vendor)
        .setCharacteristic(Characteristic.Model, miioDev.version)
        .setCharacteristic(Characteristic.SerialNumber, miioDev.sDid);

    swi.on('identify', function(paired, callback) {
        callback(); // success
    });

    swi.addService(Service.Lightbulb, miioDev.category ).getCharacteristic(Characteristic.On)
        .on('set', function(value, callback) {
            miioDev.homekit_gateway_SetOn(value,function (code) {
                callback();
            });

        }).on('get', function(callback) {
        miioDev.homekit_gateway_GetOn(function (code,value) {
            callback(code,value);


            //fetch subdev list on each refresh
            miioDev.jsonRpc({
                "method": "get_device_prop",
                "params" : ["lumi.0","device_list"]
            },function (code,res) {
                if(code == 0 && Array.isArray(res.result) ){

                    for(var i = 0 ; i < res.result.length;i += 5){
                        var sid1 = res.result[i];
                        var type1 = res.result[i+1];
                        if(type1 == 7 || type1 == 9){
                            (function (sid,type) {

                                if(!miioDev.subDev[sid]){

                                    var swi1  =  new Accessory( sid , uuid.generate(sid));
                                    swi1.username = miioDev.mac + sid;
                                    swi1
                                        .getService(Service.AccessoryInformation)
                                        .setCharacteristic(Characteristic.Manufacturer, miioDev.vendor)
                                        .setCharacteristic(Characteristic.Model, miioDev.version)
                                        .setCharacteristic(Characteristic.SerialNumber, sid);

                                    swi1.on('identify', function(paired, callback) {
                                        callback(); // success
                                    });


                                    miioDev.subDev[sid] = swi1;


                                    swi1.addService(Service.Switch, "ctrl_neutral" )
                                        .getCharacteristic(Characteristic.On).on('set',function (value, callback) {

                                        miioDev.jsonRpc({
                                            "sid" : sid,
                                            "method": "toggle_ctrl_neutral",
                                            "params" : ["neutral_0", value ? "on" : "off" ]
                                        },function (code,res) {
                                            callback(code);

                                            if(type == 7) {
                                                miioDev.jsonRpc({
                                                    "sid": sid,
                                                    "method": "toggle_ctrl_neutral",
                                                    "params": ["neutral_1", value ? "on" : "off"]
                                                }, function (code, res) {

                                                });
                                            }

                                        });



                                    }).on("get",function (callback) {

                                        miioDev.jsonRpc({
                                            "method": "get_device_prop_exp",
                                            "params" : [[ sid ,"neutral_0"]]
                                        },function (code,res) {

                                            if(code == 0 && Array.isArray(res.result) && Array.isArray(res.result[0]) ) {
                                                callback(code, res.result[0][0] == "on" ? true : false)
                                            }else {
                                                callback(code);
                                            }
                                        });

                                    });



                                    console.log("gateway bridge add:" + swi1.UUID);

                                    //bridge.addBridgedAccessory(swi1);

                                    swi1.publish({
                                        port: targetPort++,
                                        username: swi1.username,
                                        pincode: DISPLAY_CONF.pin
                                    });

                                }

                            })(sid1,type1);

                        }
                    }
                }
            });
        });
    });

    return swi;
}


