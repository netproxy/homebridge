var net = require("net");
var dgram = require('dgram');

var PORT = 1983;
var MCAST_ADDR = '239.255.255.250';
var discMsg = new Buffer('M-SEARCH * HTTP/1.1\r\nMAN: \"ssdp:discover\"\r\nST: wifi_bulb\r\n');

PlugDevice = function (did, loc, model, power, cb) {
    this.did = did;
    var tmp = loc.split(":");
    var host = tmp[0];
    var port = tmp[1];
    this.host = host;
    this.port = parseInt(port, 10);
    this.model = model;
    if (power == 'on')
        this.power = 1;
    else
        this.power = 0;

    this.connected = false;
    this.sock = null;
    this.ctx = null;
    this.retry_tmr = null;
    this.retry_cnt = 0;
    this.propChangeCb = cb;

    this.update = function (loc, power) {
        var tmp = loc.split(":");
        var host = tmp[0];
        var port = tmp[1];
        this.host = host;
        this.port = parseInt(port, 10);
        if (power == 'on')
            this.power = 1;
        else
            this.power = 0;

    }.bind(this);

    this.connect = function (callback) {
        var that = this;

        if (this.connected == true) {
            callback(0);
            return;
        }

        this.connCallback = callback;

        this.sock = new net.Socket();
        this.sock.connect(this.port,
            this.host,
            function () {
                that.connected = true;
                that.retry_cnt = 0;
                clearTimeout(that.retry_tmr);
                callback(0);
            });

        this.sock.on("data", function (data) {
            var msg = data.toString();
            var rsps = msg.split("\r\n");

            rsps.forEach(function (json, idex, array) {
                try {
                    JSON.parse(json,
                        function (k, v) {
                            if (k == 'power') {
                                if (v == 'on')
                                    that.power = 1;
                                else
                                    that.power = 0;
                                that.propChangeCb(that, 'power', that.power);
                            }
                        });
                } catch (e) {
                    //console.log(e);
                }
            });
        });

        this.sock.on("end", function () {
            console.log("peer closed the socket");
            that.connected = false;
            that.sock = null;
            that.connCallback(-1);
            that.retry_tmr = setTimeout(that.handleDiscon, 3000);
        });

        this.sock.on("error", function () {
            console.log("socket error");
            that.connected = false;
            that.sock = null;
            that.connCallback(-1);
            that.retry_tmr = setTimeout(that.handleDiscon, 3000);
        });

    }.bind(this);

    this.handleDiscon = function () {
        console.log("retry connect (" + this.retry_cnt + ") ...: " + this.did);
        this.retry_cnt = this.retry_cnt + 1;
        if (this.retry_cnt > 9)
            return;
        this.connect(this.connCallback);
    }.bind(this);

    this.setPower = function (is_on) {
        this.power = is_on;
        var on_off = "on";
        if (!is_on)
            on_off = "off";
        var req = { id: 1, method: 'set_power', params: [on_off, "smooth", 500] };
        this.sendCmd(req);
    }.bind(this);

    this.sendCmd = function (cmd) {
        if (this.sock == null || this.connected == false) {
            console.log("connection broken" + this.connected + "\n" + this.sock);
            return;
        }
        var msg = JSON.stringify(cmd);

        console.log(msg);

        this.sock.write(msg + "\r\n");
    }.bind(this);
};

exports.PlugAgent = function (ip, handler) {
    this.ip = ip;
    this.discSock = dgram.createSocket('udp4');
    this.scanSock = dgram.createSocket('udp4');
    this.devices = {};
    this.handler = handler;

    this.getDevice = function (did) {
        if (did in this.devices)
            return this.devices[did];
        else
            return null;
    }.bind(this);

    this.delDevice = function (did) {
        delete this.devices[did];
    }.bind(this);

    this.discSock.bind(PORT, function () {
        console.log("add to multicast group");
        this.discSock.setBroadcast(true);
        this.discSock.setMulticastTTL(128);
        this.discSock.addMembership(MCAST_ADDR);
    }.bind(this));

    this.discSock.on('listening', function () {
        var address = this.discSock.address();
        console.log('listen on ' + address.address);
    }.bind(this));

    this.handleDiscoverMsg = function (message, from) {
        var that = this;
        did = "";
        loc = "";
        power = "";
        bright = "";
        model = "";
        hue = "";
        sat = "";

        headers = message.toString().split("\r\n");

        for (i = 0; i < headers.length; i++) {
            if (headers[i].indexOf("id:") >= 0)
                did = headers[i].slice(4);
            if (headers[i].indexOf("Location:") >= 0)
                loc = headers[i].slice(10);
            if (headers[i].indexOf("power:") >= 0)
                power = headers[i].slice(7);
            if (headers[i].indexOf("model:") >= 0)
                model = headers[i].slice(7);

        }
        if (did == "" || loc == "" || model == ""
            || power == "" || bright == "") {
            console.log("no did or loc found!");
            return;
        }
        loc = loc.split("//")[1];
        if (loc == "") {
            console.log("location format error!");
            return;
        }

        if (did in this.devices) {
            console.log("already in device list!");
            this.devices[did].update(loc,
                power);
        } else {
            this.devices[did] = new PlugDevice(did,
                loc,
                model,
                power,
                this.devPropChange
            );
            this.handler.onDevFound(this.devices[did]);
        }

        if (this.devices[did].connected == false &&
            this.devices[did].sock == null) {

            var dev = this.devices[did];

            dev.connect(function (ret) {
                if (ret < 0) {
                    console.log("failed to connect!");
                    that.handler.onDevDisconnected(dev);
                } else {
                    console.log("connect ok!");
                    that.handler.onDevConnected(dev);
                }
            });
        }
    }.bind(this);

    this.devPropChange = function (dev, prop, val) {
        console.log(dev.did + " property change: " + prop + " value: " + val);
        this.handler.onDevPropChange(dev, prop, val);
    }.bind(this);

    this.scanSock.on('message', this.handleDiscoverMsg);
    this.discSock.on('message', this.handleDiscoverMsg);

    this.startDisc = function () {
        this.scanSock.send(discMsg,
            0,
            discMsg.length,
            PORT,
            MCAST_ADDR);
    }.bind(this);
};

