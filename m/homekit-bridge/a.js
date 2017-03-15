

var buff = '{[{"a":1}],[{"b";2}]}';
var info = {}
info = JSON.parse(buff);
console.log(info.list.count);