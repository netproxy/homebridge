

var uuid = require('hap-nodejs').uuid;
var Bridge = require('hap-nodejs').Bridge;
var Accessory = require('hap-nodejs').Accessory;
var Service = require('hap-nodejs').Service;
var Characteristic = require('hap-nodejs').Characteristic;


module.exports = {

    makeHomekitAccessory : makeHomekitAccessory
};

var mappers = {
    /*"lumi-gateway-" : mapGateway*/
}


function mapOthers(swi,miioDev) {

    swi.addService(Service.Switch, miioDev.category )
        .getCharacteristic(Characteristic.On)
        .on('set', function(value, callback) {
            miioDev.homekit_SetOn(value,function (code) {
                callback();
            });

        }).on('get', function(callback) {
        miioDev.homekit_GetOn(function (code,value) {
            callback(code,value);
        });
    });

    return swi;
}

function  makeHomekitAccessory(miioDev) {

    var swi  =  new Accessory( miioDev.displayName , uuid.generate(miioDev.mac));
    swi.username = miioDev.mac;
    swi
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, miioDev.vendor)
        .setCharacteristic(Characteristic.Model, miioDev.sModel)
        .setCharacteristic(Characteristic.SerialNumber, miioDev.sDid);

    swi.on('identify', function(paired, callback) {
        callback(); // success
    });

    for(var key in mappers){
        if(miioDev.sModel.indexOf(key) > -1 ){
            return mappers[key].apply(swi,[swi,miioDev]);
        }
    }

    return mapOthers(swi,miioDev);

};