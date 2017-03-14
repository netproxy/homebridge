

var path = require("path");
var engine = require(path.join("..", "build", "Release", "miio"));

function doenc(sDid,ts,token,bufferMessage) {
    return engine.encrypt(0,parseInt(sDid),ts,token,bufferMessage); //TODO TODO fix uint64 issue
}


function dodec(token,bufferMessage) {
    console.log("here----------->:"+bufferMessage);
    var res = engine.decrypt(token,bufferMessage); //TODO fix uint64 issue
    console.log(res);
    res.sDid = res.didl + "";
    return res;
}

function henc(did,ts,token) {
    return engine.hencrypt(0,parseInt(did),ts,token);
}

function hdec(bufferMessage) {
    console.log("hdec what happen");
    var res =  engine.hdecrypt(bufferMessage);
    //res.sDid = res.didl + "";
    return res;
}

function  probe() {
    return engine.hencrypt(0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,"00000000000000000000000000000000");
}

module.exports = {
    encrypt : doenc,
    decrypt : dodec,
    hencrypt : henc,
    hdecrypt : hdec,
    probe : probe
}
