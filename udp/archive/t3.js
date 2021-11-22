var fs = require("fs");

var smp = fs.readFileSync("./s2.txt");

var enc = new TextEncoder("utf-8"); // always utf-8
console.log(enc.encode(smp).length);
