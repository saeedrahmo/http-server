const udp = require("./packet");

console.log(udp.typeDict["NAK"]);
console.log(udp.getKeyByValue(udp.typeDict, udp.typeDict.Data));

switch (0) {
  case udp.typeDict.Data:
    console.log("hi");

    break;

  default:
    console.log("bye");
    break;
}

var dict = {}; // create an empty array

console.log(`DICT: ${Object.keys(dict).length}`);

dict["1"] = "testing 1";
dict["2"] = "testing 2";
dict["3"] = "testing 3";
dict["4"] = "testing 4";
// dict["4"] = "testing 4";
// dict["4"] = "testing 4";
console.log(dict);
// delete dict["4"];

console.log(dict["2"] !== undefined);

console.log(Object.keys(dict));

var list = Object.keys(dict);

console.log(list);
for (var i = 0; i < list.length; i++) {
  if (parseInt(list[i]) === 3) {
    console.log(true);
  }
}

const fruits = ["4", "4", "3", "2"];
console.log(fruits.sort());

console.log(parseInt(list.sort().slice(-1)[0]));

var enc = new TextEncoder("utf-8"); // always utf-8
console.log(enc.encode("hello pretty!"));

var a = 1014;
var b = 1013;
console.log(a % b);

console.log(Math.ceil(2027 / 1013));

function colorLog(message, color) {
  color = color || "black";

  switch (color) {
    case "success":
      color = "Green";
      break;
    case "info":
      color = "DodgerBlue";
      break;
    case "error":
      color = "Red";
      break;
    case "warning":
      color = "Orange";
      break;
    default:
      color = color;
  }

  console.log("%c" + message, "color:" + color);
}

// colorLog("hello", "info");

// console.log("\x1b[36m Hello \x1b[34m Colored \x1b[35m World!");
// console.log("\x1B[31mHello\x1B[34m World");
// console.log("\x1b[43mHighlighted");

const animals = ["ant", "bison", "camel", "duck", "elephant"];

console.log(animals.slice(0, 3).length);
