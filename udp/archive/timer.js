const dgram = require("dgram");
const client = dgram.createSocket("udp4");
let timer = null;

client.on("error", (err) => {
  console.log(`client err：\n${err.stack}`);
  client.close();
});

client.on("message", (msg) => {
  clearTimeout(timer);
  console.log("I got message on udp");
});

ping();

function isTimeout() {
  timer = setTimeout(() => {
    console.log("udp request timeout");
  }, 1000);
}

function ping() {
  client.send("hello", 8080, "localhost");
  isTimeout();
}
