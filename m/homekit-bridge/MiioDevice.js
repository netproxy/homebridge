/**
 * Created by miwifi on 6/28/16.
 */

var dgram = require("dgram");

var miio = require("./miio.js");



'use strict';

module.exports = {
    MiioDevice: MiioDevice
}


function MiioDevice(info) {
    this.displayName = info.displayName;
    this.dhcpHostname = info.dhcpHostname;
    this.ipAddr4 = info.ipAddr4;
    this.mac = info.mac;
    this.online = false;

    this.ts = 0;
    this.token = "";
    this.sDid = "";
    this.sModel = "";
    this.vendor = "";
    this.category = "";
    this.version = "";
    this._parseDhcpHostName();
    this.rpcid = 1;

    this.subDev = {};
}



MiioDevice.CODE_ERRORJSON = 2;
MiioDevice.CODE_TIMEOUT = 1;
MiioDevice.CODE_OK = 0;

MiioDevice.RETRY = 3;
MiioDevice.TIMEOUT_MS = 1000;

MiioDevice.prototype.updateIP = function (info) {
    this.displayName = info.displayName;
    this.dhcpHostname = info.dhcpHostname;
    this.ipAddr4 = info.ipAddr4;
    this.mac = info.mac;
}

MiioDevice.prototype._parseDhcpHostName = function(){
    var m = /(\w+\-\w+\-\w+)_miio(\d+)/gmi.exec(this.dhcpHostname);
    if( m ){
        this.sModel = m[1];
        this.sDid = m[2];
        var splt = m[1].split("-");
        this.vendor = splt[0];
        this.category = splt[1];
        this.version = splt[2];
    }
}

MiioDevice.prototype.isMiioDevice = function(){
    return this.sDid !== undefined;
}

MiioDevice.prototype.updateInfo = function (res) {
    this.token = res.token;
    this.ts = res.ts;
    this.tsUpdate = parseInt(new Date().getTime()/1000);
    this.sDid = res.sDid;
}

MiioDevice.prototype.getRemoteTs = function () {
    if(this.ts){
        return this.ts  +  (parseInt(new Date().getTime()/1000) - this.tsUpdate)
    }else{
        return 0;
    }
}

MiioDevice.prototype.needProbe = function () {
    if(this.ts <  (parseInt(new Date().getTime()/1000) - 10)  ) {
        return true
    }else{
        return false;
    }
}

MiioDevice.prototype._sendProbe = function (client) {
    var p = miio.probe();
    client.send(p, 0, p.length, 54321, this.ipAddr4, function(err, bytes) {
        if (err){
            console.log("udp send error");
            return;
        }
    });
}

MiioDevice.prototype.probe = function (callback) {
    var thiz = this;
    var retry = MiioDevice.RETRY ,wait = MiioDevice.TIMEOUT_MS;
    var client = dgram.createSocket('udp4');

    var timeoutFunc = function () {
        if(retry == 0){
            callback(MiioDevice.CODE_TIMEOUT);
            client.close();
        }else{
            retry--;
            console.log("probe retry");
            thiz._sendProbe(client);
            timeout = setTimeout(timeoutFunc,wait)
        }
    };

    var timeout = setTimeout(timeoutFunc ,wait);
    thiz._sendProbe(client);

    client.on("message",function (bufferMessage,rinfo) {
        //console.log(rinfo); address
        var res = miio.hdecrypt(bufferMessage);

        thiz.updateInfo(res);

        clearTimeout(timeout);
        client.close();
        callback(MiioDevice.CODE_OK,res);
    });

}

MiioDevice.prototype._sendRpc = function (client,sDid,ts,token,json) {
    var req = miio.encrypt(sDid,ts,token,json);
    client.send(req, 0, req.length, 54321, this.ipAddr4, function(err, bytes) {
        if (err){
            console.log("udp send error");
            return;
        }
    });
};
MiioDevice.prototype.rpc = function (json,callback) {

    var thiz = this;

    var retry = MiioDevice.RETRY ,wait = MiioDevice.TIMEOUT_MS;
    var client = dgram.createSocket('udp4');

    var timeoutFunc = function () {
        if(retry == 0){
            callback(MiioDevice.CODE_TIMEOUT);
            client.close();
        }else{
            retry--;
            console.log("rpc retry");
            thiz._sendRpc(client,thiz.sDid,thiz.ts,thiz.token,json);
            timeout = setTimeout(timeoutFunc,wait)
        }
    };

    var timeout;

    if(thiz.needProbe()){

        thiz.probe(function (code,res) {
            if(code == 0){
                timeout =  setTimeout(timeoutFunc ,wait);
                thiz._sendRpc(client,thiz.sDid,thiz.ts,thiz.token,json);
            }else{
                clearTimeout(timeout);
                client.close();
                callback(MiioDevice.CODE_TIMEOUT);
            }
        });

    }else{
        timeout =  setTimeout(timeoutFunc ,wait);
        thiz._sendRpc(client,thiz.sDid,thiz.ts,thiz.token,json);
    }

    client.on("message",function (bufferMessage,rinfo) {
        clearTimeout(timeout);
        client.close();

        var res = miio.decrypt(thiz.token,bufferMessage);
        callback(MiioDevice.CODE_OK,res.message);
    });
};

MiioDevice.prototype.jsonRpc = function (json, callback) {
    json["id"] = this.nextId();
    this.rpc(JSON.stringify(json), function (code, res) {
        var resJson;
        try {
            resJson = JSON.parse(res);
        } catch (e) {

        }
        callback(resJson && resJson.result ? code : MiioDevice.CODE_ERRORJSON, resJson);
    });
};

/*mappers */

MiioDevice.prototype.nextId  = function () {
    this.rpcid++;
    if(this.rpcid > 10000){
       this.rpcid = 1;
    }
    return this.rpcid;
};

MiioDevice.prototype.homekit_SetOn = function (value,callback) {
    console.log("homekit_SetOn: " + this.mac + " " + this.sDid);
    var rpcid = this.nextId();
    this.rpc(JSON.stringify({
        "id": rpcid,
        "method": "set_power",
        "params" : [ value ? "on": "off"]
    }),function (code,res) {
        //console.log(res);
        callback(code)
    });
};

MiioDevice.prototype.homekit_GetOn = function (callback) {
    var rpcid = this.nextId();
    console.log("homekit_GetOn: " + this.mac + " " + this.sDid);
    this.rpc(JSON.stringify({
        "id": rpcid,
        "method": "get_prop",
        "params" : ["power"]
    }),function (code,res) {
        //console.log(res);
        if(code != MiioDevice.CODE_OK){
            callback(code,false);
            return;
        }
        var jres = JSON.parse(res);
        if(jres && jres.result && jres.result[0]){
            callback(MiioDevice.CODE_OK, jres.result[0] == "on" ? true :false)
        }else{
            callback(MiioDevice.CODE_ERRORJSON,false);
        }
    });
};


MiioDevice.prototype.homekit_gateway_SetOn = function (value,callback) {
    console.log("homekit_gateway_SetOn: " + this.mac + " " + this.sDid);
    var rpcid = this.nextId();
    this.rpc(JSON.stringify({
        "id": rpcid,
        "method": "toggle_light",
        "params" : [ value ? "on": "off"]
    }),function (code,res) {
        //console.log(res);
        callback(code)
    });
};

MiioDevice.prototype.homekit_gateway_GetOn = function (callback) {
    var rpcid = this.nextId();
    console.log("homekit_gateway_GetOn:" + this.mac + " " + this.sDid);
    this.rpc(JSON.stringify({
        "id": rpcid,
        "method": "get_prop",
        "params" : ["rgb"]
    }),function (code,res) {

        if(code != MiioDevice.CODE_OK){
            callback(code,false);
            return;
        }
        var jres = JSON.parse(res);
        if(jres && jres.result){
            callback(MiioDevice.CODE_OK, jres.result[0] != 0 ? true :false)
        }else{
            callback(MiioDevice.CODE_ERRORJSON,false);
        }
    });
};

