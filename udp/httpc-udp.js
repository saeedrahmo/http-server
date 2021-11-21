"use strict";

const dgram = require("dgram");
const udp = require("./packet");
const yargs = require("yargs");
var fs = require("fs");

const argv = yargs
  .usage("Usage: $0 option [values]")
  .option("rp", {
    alias: "routerport",
    describe: "Specifies the router port.",
    type: "number",
    default: 3000,
  })
  .option("rh", {
    alias: "routerhost",
    describe: "Specifies the router host.",
    type: "string",
    default: "127.0.0.1",
  })
  .option("sp", {
    alias: "serverport",
    describe: "Specifies the server port.",
    type: "number",
    default: 8090,
  })
  .option("sh", {
    alias: "serverhost",
    describe: "Specifies the server host.",
    type: "string",
    default: "127.0.0.1",
  })
  .version(false)
  .help("help").argv;

const client = dgram.createSocket("udp4");

const initilizedSequenceNumber = 55;
var expectedSequenceNumber = initilizedSequenceNumber + 1;

var smp = fs.readFileSync("./sample.txt");

var udp_pkt = udp.encode({
  type: udp.typeDict["SYN"],
  sequenceNumber: initilizedSequenceNumber,
  peerAddress: argv.serverhost,
  peerPort: argv.serverport,
  payLoad: "",
});

client.connect(argv.routerport, argv.routerhost, (err) => {
  //client.close();
  client.send(udp_pkt, (err) => {});
});

var dataCache = "";
var enc = new TextEncoder("utf-8"); // always utf-8
var isConnected = false;

client.on("message", (data, rinfo) => {
  // Remote address information
  const p = udp.decode(data);
  // console.log(
  //   `type:${p.type}\tsequenceNumber:${p.sequenceNumber}\tpeerAddress:${p.peerAddress}\tpeerPort:${p.peerPort}\tpayLoad:${p.payLoad}`
  // );
  console.log(`client got: ${p.payLoad} from ${rinfo.address}:${rinfo.port}`);

  switch (udp.getKeyByValue(udp.typeDict, p.type)) {
    case "Data":
      console.log(
        `type:${p.type}\tsequenceNumber:${p.sequenceNumber}\tpeerAddress:${p.peerAddress}\tpeerPort:${p.peerPort}\tpayLoad:${p.payLoad}`
      );

      dataCache += p.payLoad;

      // Send ack
      p.type = udp.typeDict["ACK"];
      p.payLoad = enc.encode(p.sequenceNumber + 1);
      client.send(udp_pkt, (err) => {});

      // Send data
      var payLoad = enc.encode(smp);
      var dataSize = payLoad.length;

      p.payLoad =
        dataSize > udp.maxLen ? payLoad.slice(0, udp.maxLen) : p.payLoad;
      p.sequenceNumber = dataSize > udp.maxLen ? udp.maxLen : 0;
      expectedSequenceNumber = p.sequenceNumber + 1;
      udp_pkt = udp.encode(p);
      client.send(udp_pkt, (err) => {});
      break;
    case "ACK":
      break;
    case "SYN":
      break;
    case "SYN-ACK":
      var ack = parseInt(p.payLoad); // x+1
      if (ack == expectedSequenceNumber) {
        p.type = udp.typeDict["ACK"];
        p.sequenceNumber = p.sequenceNumber + 1; // y+1
        isConnected = true;
      } else {
        p.type = udp.typeDict["NAK"]; //TODO:check?
      }
      udp_pkt = udp.encode(p);
      client.send(udp_pkt, (err) => {});
      break;
    case "NAK":
      console.log("NAK CLIENT");
      // code block
      break;
    default:
    // code block
  }

  console.log(p);

  // client.send(udp_pkt, rinfo.port, (err) => {});
  // client.send(udp_pkt, (err) => {});

  // client.close();
});

client.on("error", (err) => {
  console.log(`server error:\n${err.stack}`);
  client.close();
});
