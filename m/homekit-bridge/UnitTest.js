/**
 * Created by miwif on 6/28/16.
 */

var MiioDevice = require("./lib/MiioDevice.js").MiioDevice
var MiwifiFeature = require("./lib/MiwifiFeature.js").MiwifiFeature

var miio = require("./lib/miio.js");

exports.testSomething = function(test) {
    
    console.log("hello,world");
};


exports.testMiioProtoV1 = function (test) {



    var did  = 1234;
    var ts = 10;
    var token = "3b5111461094f8d6ab375e077448b908";
    var msg = "{\"id\": " + parseInt( Math.random()*100000 )  + ",\"method\":\"miIO.info\",\"params\":[]}";
     
    var a = miio.encrypt(did,ts,token,msg);
    var b = miio.decrypt(token,a);

    console.log("a :====> " + a);
    console.log("b :====> " + b);
    if (a[0] == 0x21) {console.log("successed");}
/*    test.equal(a[0],0x21);
    test.equal(msg,b.message);
    test.equal(ts,b.ts);
    test.equal(did,b.didl);
    test.equal(did+"",b.sDid);
    test.equal(0,b.didh);

    test.equal(msg.length,b.messageLength);
    test.equal(a.length,b.length);
*/

    var c  = miio.hencrypt(did,ts,token);
    var d = miio.hdecrypt(c);

    console.log("c :====> " + c);
    console.log("d :====> " + d);


/*    test.equal(ts,d.ts);
    test.equal(did,d.didl);
    test.equal(token,d.token);
    test.equal(c.length,d.length);

    test.done();
*/
};


exports.testMiioDevice = function () {    

    var dev = new MiioDevice({ displayName:"ZhimiAirpurifierM1", dhcpHostname: "zhimi-airpurifier-m1_miio471204", ipAddr4: "192.168.124.2" });
    console.log(dev.isMiioDevice());
    console.log(dev.sModel);
    //test.equal("1160213",dev.sDid);
    console.log(dev.sDid);
    var msg = "{\"id\": " +  parseInt( Math.random()*100000 )  + ",\"method\":\"miIO.info\",\"params\":[]}";
    console.log(msg);
    dev.rpc(msg,function (code,res) {
        console.log(code);
        console.log(res);
     //   test.done();
    });

    /*dev.homekit_SetOn(true,function () {

        test.done();
    });*/

    /*dev.homekit_GetOn(function (code,value) {
        console.log(value);

        test.done();
    })*/


};

exports.testMiwifiFeature = function () {

    var miwifi = new MiwifiFeature( { handleInit: function () {


        
        this.startReadLoop();


    }});
        console.log(miwifi);
    var s = 5 / 0;
    MiwifiFeature.LOOP_DELAY = 3000;
    MiwifiFeature.devlistUrl = "http://192.168.1.1/cgi-bin/luci/;stok=948e47419aa74bbb1e39955cc0e72b56/api/misystem/devicelist";
    MiwifiFeature.hwInfoUrl = "http://192.168.1.1/cgi-bin/luci/;stok=948e47419aa74bbb1e39955cc0e72b56/api/misystem/status"
    MiwifiFeature.nameUrl = "http://192.168.1.1/cgi-bin/luci/;stok=948e47419aa74bbb1e39955cc0e72b56/api/misystem/router_name"
    miwifi.init();


    setTimeout(function () {
        miwifi.stopReadLoop();
        //test.done();
    },100000000)

};

