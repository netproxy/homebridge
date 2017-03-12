var http = require('http');
var querystring = require('querystring');



function req(did, macaddr, dt, action, property, value) {
    var query = {
        p: 'HOMEKIT',
        t: new Date().getTime(),
        did: did,
        uid: macaddr,
        deviceType: dt,
        action: action,
        property: property,
        value: value
    };

    // var url = `http://api.miwifi.com/res_stat/click.gif?${querystring.stringify(query)}`;
    var url = 'http://api.miwifi.com/res_stat/click.gif?' + querystring.stringify(query);
    // var url = 'http://192.168.31.170:8080/?' + querystring.stringify(query);
    console.info('stat url: ' + url);

    http.get(url, function (res) {
        console.info(res.statusCode);
        res.resume();
    }).on('error', function (e) {
        console.error(e);
    });

}

module.exports = req;
