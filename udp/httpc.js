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
let timer = null;

function isTimeout() {
  timer = setTimeout(() => {
    console.log("udp request timeout");
    client.close();
  }, 1000);
}

const initilizedSequenceNumber = 55; // random seq number
var expectedSequenceNumber = initilizedSequenceNumber + 1;

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
  // isTimeout();
});

client.on("message", (pkt, rinfo) => {
  // clearTimeout(timer);

  const p = udp.decode(pkt);

  fs.appendFileSync(
    "./log/client-log.txt",
    `client got: ${udp.getKeyByValue(udp.typeDict, p.type)}\tseq:${
      p.sequenceNumber
    }\tpay:${p.payLoad}\texp${expectedSequenceNumber}\n`
  );

  switch (udp.getKeyByValue(udp.typeDict, p.type)) {
    case "Data":
      console.log(p.payLoad);
      break;
    case "ACK":
      break;
    case "SYN":
      break;
    case "SYN_ACK":
      var ack = parseInt(p.payLoad); // x+1
      if (ack == expectedSequenceNumber) {
        // Send ack y+1
        p.type = udp.typeDict["ACK"]; // Complete handshaking
        p.payLoad = p.sequenceNumber + 1; // Ack belongs to handshaking not data
        p.sequenceNumber = p.sequenceNumber + 1; // y+1

        udp_pkt = udp.encode(p);
        client.send(udp_pkt, (err) => {});

        // Send data
        var data = "";
        p.type = udp.typeDict["Data"];

        if (argv._.length == 2) {
          var parsedUrl = url.parse(removeQuetes(argv._[1]));
          if (argv._[0] == "get") {
            var data = `GET ${parsedUrl.path} HTTP/1.0\r\nHost:${
              parsedUrl.hostname
            }\r\n${
              argv.h
                ? Array.isArray(argv.h)
                  ? argv.h
                  : argv.h.join("\r\n")
                : ""
            }\r\n`;
          }

          if (argv._[0] == "post") {
            data = `POST ${parsedUrl.path} HTTP/1.0\r\nHost:${
              parsedUrl.hostname
            }${
              argv.h
                ? Array.isArray(argv.h)
                  ? "\r\n" + argv.h.join("\r\n")
                  : "\r\n" + argv.h.trim()
                : ""
            }${
              argv.d
                ? "\r\n" +
                  "Content-Length:" +
                  argv.d.length +
                  "\r\n\r\n" +
                  argv.d
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

        p.payLoad = data;
        p.sequenceNumber = 1;
        expectedSequenceNumber = p.sequenceNumber + 1;

        udp_pkt = udp.encode(p);
        client.send(udp_pkt, (err) => {});
      } else {
        p.type = udp.typeDict["NAK"]; //TODO:check?

        udp_pkt = udp.encode(p);
        client.send(udp_pkt, (err) => {});
      }
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

function removeQuetes(str) {
  return str.replace(/['"]+/g, "");
}
