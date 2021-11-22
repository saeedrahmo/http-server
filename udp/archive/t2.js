const udp = require("./packet");

var a = 1;
a++;
console.log(a);

const num1 = 2027;
const num2 = 1013;
var Quotient = (num1 - (num1 % num2)) / num2;
console.log(Quotient);

console.log(udp.maxLen);

console.log(parseInt(2027 / 1013));

console.log(2026 % 1013);
