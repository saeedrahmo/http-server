"use strict";

const dgram = require("dgram");
const udp = require("../packet");
const yargs = require("yargs");
var fs = require("fs");
const { platform } = require("os");

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

const initilizedSequenceNumber = 66; // random seq number
var expectedSequenceNumber = initilizedSequenceNumber + 1;
var udp_pkt = "";

var dataCache = "";
var enc = new TextEncoder("utf-8"); // always utf-8
var isConnected = false;
var somethingToSend = false;
var packetNumber = 1;

function handleClient(pkt, rinfo) {
  const p = udp.decode(pkt);

  fs.appendFileSync(
    "./log/server-log.txt",
    `server got: ${udp.getKeyByValue(udp.typeDict, p.type)}\tseq:${
      p.sequenceNumber
    }\tlen:${p.payLoad.length}\texp${expectedSequenceNumber}\n`
  );

  var data = enc.encode("Handshaking was established successfully");
  var dataSize = data.length;

  switch (udp.getKeyByValue(udp.typeDict, p.type)) {
    case "Data":
      dataCache += p.payLoad; // TODO: Deliver data
      console.log(`server got data:\n${dataCache}`);
      dataCache = "";

      // Send ack
      p.type = udp.typeDict["ACK"];

      var firstClientData =
        (p.sequenceNumber == 0 && p.payLoad.length < udp.maxLen) ||
        p.sequenceNumber != 0;

      if (p.sequenceNumber == 0) {
        p.sequenceNumber =
          p.payLoad.length < udp.maxLen ? p.payLoad.length + 1 : udp.maxLen + 1;
      } else {
        p.sequenceNumber = p.payLoad.length + p.sequenceNumber + 1;
      }
      p.payLoad = "";

      udp_pkt = udp.encode(p);
      server.send(udp_pkt, rinfo.port, (err) => {});

      // Send data
      if (firstClientData) {
        p.type = udp.typeDict["Data"];

        p.payLoad = dataSize > udp.maxLen ? data.slice(0, udp.maxLen) : data;
        p.sequenceNumber = 0;
        expectedSequenceNumber =
          p.payLoad.length < udp.maxLen ? p.payLoad.length + 1 : udp.maxLen + 1;

        udp_pkt = udp.encode(p);
        server.send(udp_pkt, rinfo.port, (err) => {});
      }

      break;
    case "ACK":
      // y+1
      if (p.sequenceNumber == expectedSequenceNumber && p.payLoad.length != 0) {
        // Ack belongs to handshaking
        isConnected = true; // Handshaking is completed
      } else if (
        p.sequenceNumber == expectedSequenceNumber &&
        p.payLoad.length == 0
      ) {
        if (dataSize >= expectedSequenceNumber) {
          p.type = udp.typeDict["Data"];

          var sliceBegin = p.sequenceNumber - 1; // TODO:check! 1014-1=1013
          var sliceEnd =
            sliceBegin + 1013 < dataSize ? sliceBegin + 1013 : dataSize;
          p.payLoad = data.slice(sliceBegin, sliceEnd);
          p.sequenceNumber = sliceBegin;
          p.expectedSequenceNumber = p.payLoad.length + p.sequenceNumber + 1;

          udp_pkt = udp.encode(p);
          server.send(udp_pkt, rinfo.port, (err) => {});
        } else {
          // Data was sent entirely
        }
      } else {
        p.type = udp.typeDict["NAK"]; //TODO:check?

        udp_pkt = udp.encode(p);
        server.send(udp_pkt, rinfo.port, (err) => {});
      }
      break;
    // Continues handshaking
    case "SYN":
      p.type = udp.typeDict["SYN_ACK"];
      p.payLoad = enc.encode(p.sequenceNumber + 1); // Ack x+1
      p.sequenceNumber = initilizedSequenceNumber; // y

      udp_pkt = udp.encode(p);
      server.send(udp_pkt, rinfo.port, (err) => {});
      break;
    case "SYN_ACK":
      // code block
      break;
    case "NAK":
      console.log("NAK SERVER");
      // code block
      break;
    default:
    // code block
  }
}
