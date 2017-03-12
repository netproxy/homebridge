/**
 *
 * read /tmp/dhcp.leases and exec 'ubus call trafficd hw' to see online devices on Xiaoqiang
 * Created by miwifi on 6/28/16.
 */



var fs = require("fs");
var req = require("request");
var MiioDevice = require("./MiioDevice.js").MiioDevice;
var sysexec = require('child_process').exec;
'use strict';

module.exports = {
    MiwifiFeature: MiwifiFeature
}

function MiwifiFeature(config) {
    this.miioDeviceList = {};
    this.mac = "F0:00:00:00:00:00";
    this.sn = "default";
    this.displayName = "default";


    this.handleInit = config.handleInit;
    this.handleOnline = config.handleOnline;
    this.handleOffline = config.handleOffline;

}

MiwifiFeature.LOOP_DELAY = 300*1000;
MiwifiFeature.devlistUrl = "http://localhost:80/cgi-bin/luci/api/misystem/devicelist";
MiwifiFeature.hwInfoUrl = "http://localhost:80/cgi-bin/luci/api/misystem/status";
MiwifiFeature.nameUrl = "http://localhost:80/cgi-bin/luci/api/misystem/router_name";

MiwifiFeature.prototype.init = function () {
    var thiz = this;
    var i = 0;

    req(MiwifiFeature.hwInfoUrl , function (err ,resp, body) {
       if(!err && resp.statusCode  == 200){

           var info = JSON.parse(body);
           if(info.hardware && info.hardware.mac ){
               thiz.mac = info.hardware.mac.toUpperCase();
               thiz.sn = info.hardware.sn;
           }

           i++;
           if(i == 2){
               thiz.handleInit && thiz.handleInit.apply(thiz,[]);
           }
       }
    });


    req(MiwifiFeature.nameUrl , function (err ,resp, body) {
        if(!err && resp.statusCode  == 200){
            var info = JSON.parse(body);
            if( info  &&  info.name ){
                thiz.displayName = info.name
            }

            i++;
            if(i == 2){
                thiz.handleInit && thiz.handleInit.apply(thiz,[]);
            }
        }
    });



}

MiwifiFeature.prototype.startReadLoop = function () {
    var thiz = this;
    thiz._loop();//run once
    thiz._readLoopTimer = setInterval(function(){
        thiz._loop();
    },MiwifiFeature.LOOP_DELAY);
};


MiwifiFeature.prototype._handleNewMiioDevice = function (dev) {
    console.log("online: " + dev.mac + " " + dev.dhcpHostname ) ;
    this.handleOnline && this.handleOnline.apply(this,[dev]);
};

MiwifiFeature.prototype._handleRemoveMiioDevice = function (dev) {
    console.log("offline: " + dev.mac + " " + dev.dhcpHostname );
    this.handleOffline && this.handleOffline.apply(this,[dev]);
};


MiwifiFeature.prototype._loop = function () {
    var thiz = this;

    req(MiwifiFeature.devlistUrl,function (err,resp,body) {
        if(!err && resp.statusCode  == 200){
            var info = JSON.parse(body);
            var onlineDevs = {};
            if( info && info.list  ){
                var inlist = info.list;
                for(var i = 0; i <  inlist.length; i++){
                    var m = /(\w+\-\w+\-\w+)_miio(\d+)/gmi.exec(inlist[i].oname);

                    if(m && inlist[i].online == 1 && inlist[i].ip && inlist[i].ip[0]){

                        var dinfo = { displayName: inlist[i].name , mac: inlist[i].mac.toUpperCase() , dhcpHostname: inlist[i].oname , ipAddr4: inlist[i].ip[0].ip };

                        onlineDevs[dinfo.mac] = true;

                        var miioDev = thiz.miioDeviceList[dinfo.mac];


                        if(!miioDev){
                            var ndev = new MiioDevice(dinfo);
                            ndev.online = true;
                            thiz.miioDeviceList[dinfo.mac] = ndev;
                            thiz._handleNewMiioDevice(ndev);
                        }else{
                            miioDev.updateIP(dinfo);
                        }
                    }


                }

                for(var mac in thiz.miioDeviceList){
                     if(!onlineDevs[mac]){ //dev  not found
                         thiz._handleRemoveMiioDevice( thiz.miioDeviceList[mac] );
                        delete thiz.miioDeviceList[mac];
                     }
                }

            }
        }
    });
};

MiwifiFeature.prototype.stopReadLoop = function () {

    this._readLoopTimer && clearInterval(this._readLoopTimer);

};