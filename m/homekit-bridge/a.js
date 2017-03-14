var MiioDevice = require("./lib/MiioDevice.js").MiioDevice
var MiwifiFeature = require("./lib/MiwifiFeature.js").MiwifiFeature

var miio = require("./lib/miio.js");
var path = require("path");
var test = require("./UnitTest.js")

console.log(path);

test.testMiioProtoV1();

 function testMiioDevice() {    

    var dev = new MiioDevice({ displayName:"chuangmi-plug-m1_miio52760671", dhcpHostname: "chuangmi-plug-m1_miio52760671", ipAddr4: "192.168.1.175" });
    console.log("MiiDevice: "+ dev.isMiioDevice());
    console.log("sModel:"+dev.sModel);
    console.log("sDid:"+dev.sDid);
    dev.token ="3b5111461094f8d6ab375e077448b908";
    console.log("token："+ dev.token);
    //test.equal("1160213",dev.sDid);
    var msg = "{\"id\": " +  parseInt( Math.random()*100000 )  + ",\"method\":\"set_power\",\"params\":[\"on\"]}";
    console.log(msg);
    console.log(
    JSON.stringify({
        "id": parseInt( Math.random()*100000 ),
        "method": "get_prop",
        "params" : ["aqi"]
    }));
     dev.rpc(msg,function (code,res) {
        console.log(code);
        console.log(res);
    });
}
//console.log(miio.probe());

testMiioDevice();
    /*dev.homekit_SetOn(true,function () {

        test.done();
    });*/

    /*dev.homekit_GetOn(function (code,value) {
        console.log(value);

        test.done();
    })*/


