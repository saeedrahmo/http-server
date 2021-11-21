"use strict";

const dgram = require("dgram");
const udp = require("./packet");
const yargs = require("yargs");
const exp = require("constants");

const argv = yargs
  .usage("Usage: $0 option [values]")
  .option("v", {
    alias: "verbose",
    describe: "Prints debugging messages.",
    type: "boolean",
  })
  .option("p", {
    alias: "port",
    describe:
      "Specifies the port number that the server will listen and serve at.",
    type: "number",
    default: 8090,
  })
  .option("h", {
    alias: "host",
    describe: "Specifies the host ip that the server will listen and serve at.",
    type: "string",
    default: "localhost",
  })
  .option("d", {
    alias: "dir",
    describe:
      "Specifies the directory that the server will use to read/write requested files. Default is the current directory when launching the application.",
    type: "string",
    default: "/home",
  })
  .version(false)
  .help("help").argv;

// socket
const server = dgram.createSocket("udp4", handleClient).on("error", (err) => {
  throw err;
});

server.bind({
  address: argv.host,
  port: argv.port,
  exclusive: true,
});

server.on("listening", () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.on("error", (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

const initilizedSequenceNumber = 66;
var expectedSequenceNumber = initilizedSequenceNumber + 1;
var udp_pkt = "";

var dataCache = "";
var enc = new TextEncoder("utf-8"); // always utf-8

function handleClient(data, rinfo) {
  const p = udp.decode(data);

  // console.log(
  //   `type:${p.type}\tsequenceNumber:${p.sequenceNumber}\tpeerAddress:${p.peerAddress}\tpeerPort:${p.peerPort}\tpayLoad:${p.payLoad}`
  // );
  // console.log(`server got: ${p.payLoad} from ${rinfo.address}:${rinfo.port}`);
  // p.payLoad = "I got your message!";

  switch (udp.getKeyByValue(udp.typeDict, p.type)) {
    case "Data":
      break;
    case "ACK":
      var ack = parseInt(p.payLoad); // x+1
      if (ack == expectedSequenceNumber) {
        p.type = udp.typeDict["Data"];

        var payLoad = enc.encode("Handshaking was established successfully");
        var dataSize = payLoad.length;

        p.payLoad =
          dataSize > udp.maxLen ? payLoad.slice(0, udp.maxLen) : p.payLoad;
        p.sequenceNumber = dataSize > udp.maxLen ? udp.maxLen : 0;
        expectedSequenceNumber = p.sequenceNumber + 1;
      } else {
        p.type = udp.typeDict["NAK"]; //TODO:check?
      }
      break;
    case "SYN":
      p.type = udp.typeDict["SYN-ACK"];
      var a = udp.getPayloadLength();
      p.payLoad = enc.encode(p.sequenceNumber + 1); // Ack
      p.sequenceNumber = initilizedSequenceNumber;
      break;
    case "SYN-ACK":
      // code block
      break;
    case "NAK":
      console.log("NAK SERVER");
      // code block
      break;
    default:
    // code block
  }

  udp_pkt = udp.encode(p);

  server.send(udp_pkt, rinfo.port, (err) => {});
}
