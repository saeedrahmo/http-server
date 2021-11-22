"use strict";

const dgram = require("dgram");
const udp = require("../packet");
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

const initilizedSequenceNumber = 55; // random seq number
var expectedSequenceNumber = initilizedSequenceNumber + 1;

var smp = fs.readFileSync("./sample.txt");

// Starts handshaking
var udp_pkt = udp.encode({
  type: udp.typeDict["SYN"],
  sequenceNumber: initilizedSequenceNumber, // x
  peerAddress: argv.serverhost,
  peerPort: argv.serverport,
  payLoad: "",
});

client.connect(argv.routerport, argv.routerhost, (err) => {
  client.send(udp_pkt, (err) => {});
});

var dataCache = "";
var enc = new TextEncoder("utf-8"); // always utf-8
var isConnected = false;

var data = enc.encode(smp);
var dataSize = data.length;

client.on("message", (pkt, rinfo) => {
  const p = udp.decode(pkt);

  fs.appendFileSync(
    "./log/client-log.txt",
    `client got: ${udp.getKeyByValue(udp.typeDict, p.type)}\tseq:${
      p.sequenceNumber
    }\tlen:${p.payLoad.length}\texp${expectedSequenceNumber}\n`
  );

  switch (udp.getKeyByValue(udp.typeDict, p.type)) {
    case "Data":
      dataCache += p.payLoad; // TODO: Deliver data
      console.log(`server got data:\n${dataCache}`);
      dataCache = "";

      // Send ack
      p.type = udp.typeDict["ACK"];

      if (p.sequenceNumber == 0) {
        p.sequenceNumber = p.payLoad.length + 1;
      } else {
        p.sequenceNumber = p.payLoad.length + p.sequenceNumber + 1;
      }
      p.payLoad = "";

      udp_pkt = udp.encode(p);
      client.send(udp_pkt, (err) => {});
      break;
    case "ACK":
      if (p.sequenceNumber == expectedSequenceNumber && p.payLoad.length == 0) {
        if (dataSize > expectedSequenceNumber) {
          p.type = udp.typeDict["Data"];

          var sliceBegin = p.sequenceNumber - 1; // TODO:check! 1014-1=1013
          var sliceEnd =
            sliceBegin + 1013 < dataSize ? sliceBegin + 1013 : dataSize;
          p.payLoad = data.slice(sliceBegin, sliceEnd);
          p.sequenceNumber = sliceBegin;
          p.expectedSequenceNumber = p.payLoad.length + p.sequenceNumber + 1;

          udp_pkt = udp.encode(p);
          client.send(udp_pkt, (err) => {});
        }
      } else {
        p.type = udp.typeDict["NAK"]; //TODO:check?
        udp_pkt = udp.encode(p);
        client.send(udp_pkt, (err) => {});
      }
      break;
    case "SYN":
      break;
    case "SYN_ACK":
      var ack = parseInt(p.payLoad); // x+1
      if (ack == expectedSequenceNumber) {
        // Send ack y+1
        p.type = udp.typeDict["ACK"]; // Complete handshaking
        p.payLoad = enc.encode(p.sequenceNumber + 1); // Ack belongs to handshaking not data
        p.sequenceNumber = p.sequenceNumber + 1; // y+1

        udp_pkt = udp.encode(p);
        client.send(udp_pkt, (err) => {});

        isConnected = true;

        // Send data
        p.type = udp.typeDict["Data"];

        p.payLoad = dataSize > udp.maxLen ? data.slice(0, udp.maxLen) : data;
        p.sequenceNumber = 0;
        expectedSequenceNumber =
          p.payLoad.length < udp.maxLen ? p.payLoad.length + 1 : udp.maxLen + 1;

        udp_pkt = udp.encode(p);
        client.send(udp_pkt, (err) => {});
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
});

client.on("error", (err) => {
  console.log(`server error:\n${err.stack}`);
  client.close();
});
