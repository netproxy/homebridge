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
    this.miioDeviceList = {};// mac : miioDev
    this.userDeviceList = {};// did : token
    this.mac = "F0:00:00:00:00:00";
    this.sn = "default";
    this.displayName = "default";

    this.handleInit = config.handleInit;
    this.handleOnline = config.handleOnline;
    this.handleOffline = config.handleOffline;
    this.handleLoop = config.handleLoop;
}

MiwifiFeature.LOOP_DELAY = 300*1000;
MiwifiFeature.devlistUrl = "http://localhost:80/cgi-bin/luci/api/misystem/devicelist";
MiwifiFeature.hwInfoUrl = "http://localhost:80/cgi-bin/luci/api/misystem/status";
MiwifiFeature.nameUrl = "http://localhost:80/cgi-bin/luci/api/misystem/router_name";
MiwifiFeature.getToken = "http://localhost:80/cgi-bin/luci/api/xqsmarthome/request_miiolist";

MiwifiFeature.prototype.init = function () {
    var thiz = this;
    var i = 0;



    req(MiwifiFeature.hwInfoUrl , function (err ,resp, body) {
       if(!err && resp.statusCode  == 200 && body){

           var info = {};
           try{
               info = JSON.parse(body);
           }catch(e) {
              console.log("error: hwInfoUrl" );
           }

           if(info.hardware && info.hardware.mac ){
               thiz.mac = info.hardware.mac.toUpperCase();
               thiz.sn = info.hardware.sn;

               console.log("Got router mac: " + thiz.mac);
           }



           i++;
           if(i == 2){
               thiz.handleInit && thiz.handleInit.apply(thiz,[]);
           }
       }
    });


    req(MiwifiFeature.nameUrl , function (err ,resp, body) {
        if(!err && resp.statusCode  == 200 && body){
            var info = {};
            try{
                info = JSON.parse(body);
            }catch(e) {
                console.log("error: nameUrl");
            }
            if( info  &&  info.name ){
                thiz.displayName = info.name
            }

            console.log("Got name : " + info.name);

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



MiwifiFeature.prototype._loopDevlist = function () {
    var thiz = this;
     console.log("it's here coming");
    req(MiwifiFeature.devlistUrl,function (err,resp,body) {
        if(!err && resp.statusCode  == 200){
            var info = {};
            try{
                info = JSON.parse(body);
            }catch(e){
                console.log("error devlistUrl: " + body);
            }
            var onlineDevs = {};
            if( info && info.list  ){
                var inlist = info.list;
                for(var i = 0; i <  inlist.length; i++){

                    var m = /(\w+)\-(\w+)\-(\w+)_miio(\d+)/gmi.exec(inlist[i].oname);

                    if(m && inlist[i].online == 1 && inlist[i].ip && inlist[i].ip[0]){

                        var dinfo = { displayName: m[2]+m[4] , mac: inlist[i].mac.toUpperCase() , dhcpHostname: inlist[i].oname , ipAddr4: inlist[i].ip[0].ip };

                        onlineDevs[dinfo.mac] = true;

                        var miioDev = thiz.miioDeviceList[dinfo.mac];


                        if (!miioDev) {
                            var ndev = new MiioDevice(dinfo);

                            var did = ndev.sDid;
                            var r_token = thiz.userDeviceList[did];
                            if(!r_token ){
                                console.log("may be not my dev: " + ndev.sDid )
                                continue;
                            }

                            ndev.token = r_token;


                            thiz.miioDeviceList[dinfo.mac] = ndev;
                            thiz._handleNewMiioDevice(ndev);

                        } else {

                            var did = miioDev.sDid;
                            var r_token = thiz.userDeviceList[did];
                            if(!r_token ){
                                console.log("may be not my dev: " + ndev.sDid )
                                continue;
                            }
                            miioDev.token = r_token;
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

MiwifiFeature.prototype._loop = function () {
    var thiz = this;

    req(MiwifiFeature.getToken,function (err,resp,body) {

        if(!err && resp.statusCode  == 200 && body){

            var info = {};
            try{
                info = JSON.parse(body);
            }catch(e){
                console.log("error getToken: " + body);
            }

            if(info && info.code == 0 && info.result){
                var newList = {};
                var count = 0;
                for(var objidx in info.result){
                    var obj = info.result[objidx];
                    newList[obj.did] = obj.r_token;
                    count++;
                    console.log("Got my dev: " + obj.did);
                }
                thiz.userDeviceList = newList;
                thiz.userDeviceListLength = count;

                thiz._loopDevlist();
            };

        }else{
            console.log("warn: doesn't find any dev")
        }
    });

    thiz.handleLoop();

};

MiwifiFeature.prototype.stopReadLoop = function () {

    this._readLoopTimer && clearInterval(this._readLoopTimer);

};



MiwifiFeature.prototype.manualsetDevice = function (body)
{
      console.log(body);
        var info = {};
            try{
                info = JSON.parse(body);
            }catch(e){
                console.log("error devlistUrl: " + body);
            }
            
            var onlineDevs = {};
            if( info && info.list  ){
                console.log('go here');
                var inlist = info.list;
                for(var i = 0; i <  inlist.length; i++){

                    var m = /(\w+)\-(\w+)\-(\w+)_miio(\d+)/gmi.exec(inlist[i].oname);

                    if(m && inlist[i].online == 1 && inlist[i].ip && inlist[i].ip[0]){

                        var dinfo = { displayName: m[2]+m[4] , mac: inlist[i].mac.toUpperCase() , dhcpHostname: inlist[i].oname , ipAddr4: inlist[i].ip[0].ip };

                        onlineDevs[dinfo.mac] = true;

                        var miioDev = thiz.miioDeviceList[dinfo.mac];


                        if (!miioDev) {
                            var ndev = new MiioDevice(dinfo);

                            var did = ndev.sDid;
                            var r_token = thiz.userDeviceList[did];
                            if(!r_token ){
                                console.log("may be not my dev: " + ndev.sDid )
                                continue;
                            }

                            ndev.token = r_token;


                            thiz.miioDeviceList[dinfo.mac] = ndev;
                            thiz._handleNewMiioDevice(ndev);

                        } else {

                            var did = miioDev.sDid;
                            var r_token = thiz.userDeviceList[did];
                            if(!r_token ){
                                console.log("may be not my dev: " + ndev.sDid )
                                continue;
                            }
                            miioDev.token = r_token;
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
