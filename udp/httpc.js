const dgram = require("dgram");
const udp = require("./packet");
var yargs = require("yargs");
var url = require("url");
const fs = require("fs");

var argv = yargs
  .usage("Usage: $0 command [arguments]")
  // examples based on https://httpbin.org/
  .example("node httpc get http://127.0.0.1:8090/ -v")
  .example("node httpc get http://127.0.0.1:8090/foo3 -v")
  .example(
    "node httpc post -h Content-Type:application/json -d '{\"bar\":1}' http://127.0.0.1:8090/bar -v"
  )
  .example("node httpc get http://127.0.0.1:8090/sub/foo -v")
  .example("node httpc get http://127.0.0.1:8090/sub2/foo2 -v")
  .example(
    "node httpc post -h Content-Type:application/json -d '{\"bar\":1}' http://127.0.0.1:8091/bar -v"
  )
  .example("node httpc get http://127.0.0.1:8091/sub/hello -v")
  .example(
    'httpc get -v "http://httpbin.org/get?course=networking&assignment=1"'
  )
  .example(
    "httpc post -h Content-Type:application/json -d {\"Assignment\":1} 'http://httpbin.org/post'"
  )
  .example(
    'httpc post -h Content-Type:application/json -f "assignment.json" http://httpbin.org/post'
  )
  .example("httpc get http://httpbin.org/status/418")
  .example("httpc get -i -v http://httpbin.org/status/301")
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
  .command({
    command: "post",
    desc: "executes a HTTP POST request and prints the response.",
    builder: (yargs) => {
      yargs
        .usage(
          "usage: httpc post [-v] [-h key:value] [-d inline-data] [-f file] URL"
        )
        .option("v", {
          //alias: "verbose",
          describe:
            "Prints the detail of the response such as protocol, status, and headers.",
          type: "boolean",
        })
        .option("h", {
          //alias: "header",
          type: "string",
          describe:
            "Associates headers to HTTP Request with the format 'key:value'.",
        })
        .option("d", {
          //alias: "data",
          type: "string",
          describe: "Associates an inline data to the body HTTP POST request.",
        })
        .option("f", {
          //alias: "file",
          type: "string",
          describe:
            "Associates the content of a file to the body HTTP POST request.",
        })
        .option("o", {
          //alias: "filename",
          type: "string",
          describe:
            "Write the body of the response to the specified file instead of the console.",
        });
    },
  })
  .command(
    "get",
    "executes a HTTP GET request and prints the response.",
    function (yargs) {
      return yargs
        .usage("usage: httpc get [-v] [-h key:value] URL")
        .option("v", {
          //alias: "verbose",
          type: "boolean",
          describe:
            "Prints the detail of the response such as protocol, status, and headers.",
        })
        .option("h", {
          //alias: "header",
          type: "string",
          describe:
            "Associates headers to HTTP Request with the format 'key:value'.",
        })
        .option("o", {
          //alias: "filename",
          type: "string",
          describe:
            "Write the body of the response to the specified file instead of the console.",
        })
        .option("i", {
          //alias: "redirect",
          type: "bool",
          describe:
            "Redirect the request to the location header in case of statuse code 3xx.",
        });
    }
  )
  .option("t", {
    alias: "time",
    describe: "Specifies the time out.",
    type: "number",
    default: 1,
  })
  .updateStrings({
    "Commands:": "The commands are:",
    //"Options:": " ",
  })
  .version(false)
  //.alias("h", "help")
  .help("help")
  .describe(
    "help",
    'Use "httpc [command] help" for more information about a command.'
  ).argv;

const client = dgram.createSocket("udp4");

const initilizedSequenceNumber = 55; // random seq number
var expectedSequenceNumber = initilizedSequenceNumber + 1;

var pktSendBuff = {};
var pktRecvBuff = {};
let timer = null;
var isConnected = false;
var enc = new TextEncoder("utf-8"); // always utf-8
var fin = 100;

function isTimeout() {
  timer = setTimeout(() => {
    // console.log("resend");
    // console.log((expectedSequenceNumber - 1).toString());
    // console.log(pktSendBuff);
    // console.log(pktSendBuff[(expectedSequenceNumber - 1).toString()]);
    // console.log(
    //   `resend: pktSendBuff:${Object.keys(
    //     pktSendBuff
    //   )}\texpectedSequenceNumber:${expectedSequenceNumber}`
    // );
    var pkt = pktSendBuff[(expectedSequenceNumber - 1).toString()];

    //console.log(`pkt:${pkt.sequenceNumber}`);
    if (pkt !== undefined && pkt.sequenceNumber !== fin) packetSender(pkt);
  }, argv.time);
}

function packetSender(pkt) {
  expectedSequenceNumber = pkt.sequenceNumber + 1;
  var udp_pkt = udp.encode(pkt);
  client.send(udp_pkt, (err) => {});

  // add pkt to dict by sec
  //if (pkt.type === udp.typeDict.DATA)
  pktSendBuff[pkt.sequenceNumber.toString()] = pkt;
  // set timer
  isTimeout();

  console.log(
    `\x1b[35m client sent:${udp.getKeyByValue(udp.typeDict, pkt.type)}\tfrom:${
      pkt.peerPort
    }\tseq:${pkt.sequenceNumber}\texp:${expectedSequenceNumber}\tpay:\n`
  );
}

// Starts handshaking #1
var udp_pkt = {
  type: udp.typeDict.SYN,
  sequenceNumber: initilizedSequenceNumber, // x
  peerAddress: argv.serverhost,
  peerPort: argv.serverport,
  payLoad: enc.encode(""),
};

client.connect(argv.routerport, argv.routerhost, (err) => {
  packetSender(udp_pkt);
});

client.on("message", (pkt, rinfo) => {
  clearTimeout(timer);

  const p = udp.decode(pkt);

  // log
  // fs.appendFileSync(
  //   "./log/client-log.txt",
  //   `client got: ${udp.getKeyByValue(udp.typeDict, p.type)}\tseq:${
  //     p.sequenceNumber
  //   }\tpay:${p.payLoad}\texp${expectedSequenceNumber}\n`
  // );

  console.log(
    `\x1B[93m client got:${udp.getKeyByValue(udp.typeDict, p.type)}\tfrom:${
      rinfo.port
    }\tseq:${p.sequenceNumber}\texp:${expectedSequenceNumber}\tpay:${
      p.payLoad
    }\n`
  );

  switch (p.type) {
    case udp.typeDict.DATA:
      var list = Object.keys(pktRecvBuff);

      if (list.length === 0) {
        pktRecvBuff[p.sequenceNumber.toString()] = p.payLoad;

        p.type = udp.typeDict.ACK;
        p.payLoad = enc.encode("");
        packetSender(p);
      } else {
        var last = parseInt(list.sort().slice(-1)[0]);
        if (last + 1 === p.sequenceNumber) {
          pktRecvBuff[p.sequenceNumber.toString()] = p.payLoad;

          p.type = udp.typeDict.ACK;
          p.payLoad = enc.encode("");
          packetSender(p, rinfo.port);
        } else if (last === p.sequenceNumber) {
          // Discard redundant
          p.type = udp.typeDict.ACK;
          p.payLoad = enc.encode("");
          packetSender(p);
        } else {
          console.log(`NAK, ${Object.keys(pktRecvBuff)}, ${p}`);
          // Send NAK
          p.type = udp.typeDict.NAK;
          p.sequenceNumber = last + 1;
          p.payLoad = enc.encode("");
          packetSender(p);
        }
      }
      break;

    case udp.typeDict.ACK:
      if (isConnected == false) {
        break;
      }

      // Close con
      if (p.sequenceNumber === fin) {
        pktSendBuff = {};
        isConnected = false;
        break;
      } else {
        // remove from send buff
        delete pktSendBuff[p.sequenceNumber.toString()];

        // Send DATA
        p.type = udp.typeDict.DATA;
        p.sequenceNumber = p.sequenceNumber + 1;

        var data = httpManager();
        p.payLoad = getpktSendBuffPayload(data, p.sequenceNumber);

        if (p.payLoad !== null) packetSender(p);
        else {
          // Clear send and rec buffs
          pktSendBuff = {};

          // Send FIN
          p.type = udp.typeDict.FIN;
          p.sequenceNumber = fin;
          p.payLoad = enc.encode("");
          packetSender(p);

          // pktRecvBuff = {};
        }
      }

      break;

    case udp.typeDict.NAK:
      // Send DATA
      p.type = udp.typeDict.DATA;

      var data = httpManager();
      p.payLoad = getpktSendBuffPayload(data, p.sequenceNumber);

      if (p.payLoad !== null) packetSender(p);
      else {
        // Send FIN
        p.type = udp.typeDict.FIN;
        p.sequenceNumber = 100;
        p.payLoad = enc.encode("");
        packetSender(p);
      }

      break;

    case udp.typeDict.SYN:
      break;

    case udp.typeDict.FIN:
      //client.close();
      // console.log(`FIN ${Object.keys(pktRecvBuff).length}`);
      if (Object.keys(pktRecvBuff).length === 0) {
        // Send ACK for FIN
        p.type = udp.typeDict.ACK;
        p.payLoad = enc.encode("");
        packetSender(p);
        break;
      } else {
        var list = Object.keys(pktRecvBuff).sort();
        var deliver = "";
        for (var i = 0; i < list.length; i++) {
          deliver += pktRecvBuff[list[i]];
        }

        console.log(deliver);

        // Clear rec buff
        pktRecvBuff = {};

        // Send ACK for FIN
        p.type = udp.typeDict.ACK;
        p.payLoad = enc.encode("");
        packetSender(p);

        client.close();
        // Clear send buff
        //packetSender = {};
      }

      break;

    case udp.typeDict.SYN_ACK:
      var ack = parseInt(p.payLoad); // x+1
      if (ack == expectedSequenceNumber) {
        // remove from send buff
        delete pktSendBuff[(expectedSequenceNumber - 1).toString()];

        // Send ack y+1
        p.type = udp.typeDict.ACK; // Complete handshaking #3
        p.payLoad = enc.encode(p.sequenceNumber + 1); // Ack belongs to handshaking not data
        p.sequenceNumber = p.sequenceNumber + 1; // y+1

        packetSender(p);
        isConnected = true;

        // Send data
        p.type = udp.typeDict.DATA;
        p.sequenceNumber = 1;
        expectedSequenceNumber = p.sequenceNumber;

        var data = httpManager();
        p.payLoad = getpktSendBuffPayload(data, p.sequenceNumber);

        packetSender(p);
      }
      break;

    default:
      // code block
      break;
  }
});

client.on("error", (err) => {
  console.log(`server error:\n${err.stack}`);
  client.close();
});

function removeQuetes(str) {
  return str.replace(/['"]+/g, "");
}

function getpktSendBuffPayload(data, sec) {
  var arr = enc.encode(data);
  var len = arr.length;

  if (Math.ceil(len / 1013) < sec) return null;

  var bottom = (sec - 1) * 1013;
  var top = len < sec * 1013 ? len : sec * 1013;

  return arr.slice(bottom, top);
}

function httpManager() {
  var data = "";
  if (argv._.length == 2) {
    var parsedUrl = url.parse(removeQuetes(argv._[1]));
    if (argv._[0] == "get") {
      data = `GET ${parsedUrl.path} HTTP/1.0\r\nHost:${parsedUrl.hostname}\r\n${
        argv.h ? (Array.isArray(argv.h) ? argv.h : argv.h.join("\r\n")) : ""
      }\r\n`;
    }

    if (argv._[0] == "post") {
      data = `POST ${parsedUrl.path} HTTP/1.0\r\nHost:${parsedUrl.hostname}${
        argv.h
          ? Array.isArray(argv.h)
            ? "\r\n" + argv.h.join("\r\n")
            : "\r\n" + argv.h.trim()
          : ""
      }${
        argv.d
          ? "\r\n" + "Content-Length:" + argv.d.length + "\r\n\r\n" + argv.d
          : ""
      }${
        argv.f
          ? "\r\n" +
            "Content-Length:" +
            JSON.stringify(JSON.parse(fs.readFileSync(argv.f, "utf-8")))
              .length +
            "\r\n\r\n" +
            JSON.stringify(JSON.parse(fs.readFileSync(argv.f, "utf-8")))
          : ""
      }`;
    } // end post
  }
  return data;
}
