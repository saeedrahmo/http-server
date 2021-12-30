const dgram = require("dgram");
const udp = require("./packet");
const yargs = require("yargs");
var fs = require("fs");
const path = require("path");

//./router --port=3000 --drop-rate=0.2 --max-delay=10ms --seed=1
const argv = yargs
  .usage("node echoserver.js [--port port]")
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
    default: "/pub",
  })
  .option("t", {
    alias: "time",
    describe: "Specifies the time out.",
    type: "number",
    default: 1,
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

function readFilesSync(dir) {
  const files = [];

  fs.readdirSync(dir).forEach((filename) => {
    const name = path.parse(filename).name;
    const ext = path.parse(filename).ext;
    const filepath = path.resolve(dir, filename);
    const stat = fs.statSync(filepath);
    const isFile = stat.isFile();

    if (isFile) files.push(name);
  });
  return files;
}

var pktSendBuff = {};
var pktRecvBuff = {};
var port = 3000;
let timer = null;
var isConnected = false;
var enc = new TextEncoder("utf-8"); // always utf-8
var fin = 100;
var fileData = "";

function isTimeout() {
  timer = setTimeout(() => {
    var pkt = pktSendBuff[(expectedSequenceNumber - 1).toString()];
    if (pkt !== undefined && pkt.sequenceNumber !== fin)
      packetSender(pkt, port);
  }, argv.time);
}

function packetSender(pkt, port) {
  expectedSequenceNumber = pkt.sequenceNumber + 1;
  var udp_pkt = udp.encode(pkt);
  server.send(udp_pkt, port, (err) => {});

  // add pkt to dict by sec
  //if (pkt.type === udp.typeDict.DATA)
  pktSendBuff[pkt.sequenceNumber.toString()] = pkt;
  // set timer
  isTimeout();

  console.log(
    `\x1b[34m server sent:${udp.getKeyByValue(udp.typeDict, pkt.type)}\tfrom:${
      pkt.peerPort
    }\tseq:${pkt.sequenceNumber}\texp:${expectedSequenceNumber}\tpay:\n`
  );
}

function handleClient(pkt, rinfo) {
  clearTimeout(timer);

  const p = udp.decode(pkt);

  // log
  // fs.appendFileSync(
  //   "./log/server-log.txt",
  //   `server got:${udp.getKeyByValue(udp.typeDict, p.type)}\tseq:${
  //     p.sequenceNumber
  //   }\texp:${expectedSequenceNumber}\tpay:${p.payLoad}\n`
  // );

  console.log(
    `\x1b[36m server got:${udp.getKeyByValue(udp.typeDict, p.type)}\tfrom:${
      rinfo.port
    }\tseq:${p.sequenceNumber}\texp:${expectedSequenceNumber}\tpay:${
      p.payLoad
    }\n`
  );

  switch (p.type) {
    case udp.typeDict.DATA:
      // not conn
      // if (isConnected == false) p.type = udp.typeDict.NAK;
      // p.sequenceNumber = initilizedSequenceNumber;

      var list = Object.keys(pktRecvBuff);

      if (list.length === 0) {
        pktRecvBuff[p.sequenceNumber.toString()] = p.payLoad;

        p.type = udp.typeDict.ACK;
        p.payLoad = enc.encode("");
        packetSender(p, rinfo.port);
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
          packetSender(p, rinfo.port);
        } else {
          // console.log(`NAK, ${Object.keys(pktRecvBuff)}, ${p}`);
          // Send NAK
          p.type = udp.typeDict.NAK;
          p.sequenceNumber = last + 1;
          p.payLoad = enc.encode("");
          packetSender(p, rinfo.port);
        }
      }

      break;

    case udp.typeDict.FIN:
      if (Object.keys(pktRecvBuff).length === 0) {
        if (fileData.length === 0) {
          // Send ACK for FIN
          p.type = udp.typeDict.ACK;
          p.payLoad = enc.encode("");
          packetSender(p, rinfo.port);
        } else {
          // Send data
          p.type = udp.typeDict.DATA;
          p.sequenceNumber = 1;
          expectedSequenceNumber = p.sequenceNumber;

          p.payLoad = getpktSendBuffPayload(fileData, p.sequenceNumber);

          packetSender(p, rinfo.port);
          // var list = Object.keys(pktSendBuff);

          // for (var i = 0; i < list.length; i++) {
          //   console.log(list[i]);
          //   // Send DATA
          //   p.type = udp.typeDict.DATA;
          //   p.sequenceNumber = parseInt(list[i]);
          //   p.payLoad = getpktSendBuffPayload(fileData, p.sequenceNumber);

          //   packetSender(p, rinfo.port);
          // }
        }
      } else {
        var list = Object.keys(pktRecvBuff).sort();
        var deliver = "";
        for (var i = 0; i < list.length; i++) {
          deliver += pktRecvBuff[list[i]];
        }
        console.log(deliver);

        // Clear rec buff
        pktRecvBuff = {};

        // Send data
        p.type = udp.typeDict.DATA;
        p.sequenceNumber = 1;
        expectedSequenceNumber = p.sequenceNumber;

        fileData = fileManager(deliver);
        p.payLoad = getpktSendBuffPayload(fileData, p.sequenceNumber);

        packetSender(p, rinfo.port);

        // Clear rec buff
        pktRecvBuff = {};

        // Send ACK for FIN
        p.type = udp.typeDict.ACK;
        p.payLoad = enc.encode("");
        packetSender(p, rinfo.port);
      }

      break;

    case udp.typeDict.ACK:
      // if (isConnected == false) {
      //   break;
      // }

      // Close con
      if (p.sequenceNumber === fin) {
        pktSendBuff = {};
        isConnected = false;
        //  server.close();
      } else {
        // y+1
        if (
          p.sequenceNumber == expectedSequenceNumber &&
          p.payLoad.length !== 0
        ) {
          // Ack belongs to handshaking
          isConnected = true; // Handshaking is completed #3
          // remove from send buff
          delete pktSendBuff[(expectedSequenceNumber - 1).toString()];
        } else {
          // Ack belongs to data

          // remove from send buff
          delete pktSendBuff[p.sequenceNumber.toString()];

          // Send DATA
          p.type = udp.typeDict.DATA;
          p.sequenceNumber = p.sequenceNumber + 1;
          p.payLoad = getpktSendBuffPayload(fileData, p.sequenceNumber);

          if (p.payLoad !== null) packetSender(p, rinfo.port);
          else {
            // Clear send and rec buffs
            pktSendBuff = {};

            // Send FIN
            p.type = udp.typeDict.FIN;
            p.sequenceNumber = 100;
            p.payLoad = enc.encode("");
            packetSender(p, rinfo.port);
          }
        }
      }

      break;

    case udp.typeDict.SYN: // Continues handshaking #2
      p.type = udp.typeDict.SYN_ACK;
      p.payLoad = enc.encode(p.sequenceNumber + 1); // Ack x+1
      p.sequenceNumber = initilizedSequenceNumber; // y

      packetSender(p, rinfo.port);

      break;

    case udp.typeDict.SYN_ACK:
      // code block
      break;

    case udp.typeDict.NAK:
      // Send DATA
      p.type = udp.typeDict.DATA;
      p.payLoad = getpktSendBuffPayload(fileData, p.sequenceNumber);

      if (p.payLoad !== null) packetSender(p, rinfo.port);
      else {
        p.type = udp.typeDict.FIN;
        p.sequenceNumber = 100;
        p.payLoad = enc.encode("");
        packetSender(p, rinfo.port);
      }

      break;

    default:
      // code block
      break;
  }
}

function getpktSendBuffPayload(data, sec) {
  var arr = enc.encode(data);
  var len = arr.length;

  if (Math.ceil(len / 1013) < sec) return null;

  var bottom = (sec - 1) * 1013;
  var top = len < sec * 1013 ? len : sec * 1013;
  // console.log(
  //   `bottom:${bottom},top:${top},len:${len},arr:${
  //     arr.slice(bottom, top).length
  //   }`
  // );
  return arr.slice(bottom, top);
}

function fileManager(req) {
  // console.log(`FILE: ${req}`);
  var data = "";

  var reqSplit = req.split("\r\n");
  var reqType = reqSplit[0].split(/\s+/)[0];
  var reqAddress = reqSplit[0].split(/\s+/)[1];
  var homeDir = "." + argv.d;

  var reqAddress2 = reqAddress.split("/");

  if (reqType.toLowerCase() == "get") {
    if (reqAddress == "/") {
      const filesList = readFilesSync(path.resolve(__dirname, homeDir));
      filesObj = new Object();
      filesObj["files_list"] = filesList;
      const jsonFiles = JSON.stringify(filesObj);

      const contentLength = jsonFiles.length;
      const httpCode = "200 OK";
      const serverDate = new Date().toString();
      const serverVersion = `Node.js/${process.version}`;

      data = `HTTP/1.1 ${httpCode}\nDate: ${serverDate}\nContent-Type: application/json\nContent-Length: ${contentLength}\nConnection: close\nServer: ${serverVersion}\n\n${jsonFiles}`;
    } else {
      var allFiles = fs.readdirSync(path.resolve(__dirname, homeDir));
      var reqFileName = reqAddress.substring(1);
      var reqAddress2 = reqAddress.split("/");

      if (reqAddress2.length != 2) {
        homeDir =
          homeDir + reqAddress2.slice(0, reqAddress2.length - 1).join("/");
        console.log(homeDir);
        allFiles = fs.readdirSync(path.resolve(__dirname, homeDir));
        reqFileName = reqAddress2[reqAddress2.length - 1];
      }

      var isFileExisted = false;
      for (const item of allFiles) {
        if (allFiles.includes(".protected")) {
          data = `HTTP/1.1 403 Forbidden\r\n`;
          isFileExisted = true;
          break;
        }

        const extname = path.extname(item);
        const filename = path.basename(item, extname);
        const absolutePath = path.resolve(homeDir, item);
        if (reqFileName == filename) {
          isFileExisted = true;

          var fileContent = fs.readFileSync(absolutePath);

          const contentLength = fileContent.length;
          const httpCode = "200 OK";
          const serverDate = new Date().toString();
          const serverVersion = `Node.js/${process.version}`;
          const contentType = "application/json";

          data = `HTTP/1.1 ${httpCode}\r\nDate: ${serverDate}\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\nConnection: close\r\nServer: ${serverVersion}\r\n\r\n${fileContent}`;
          break;
        }
      }

      if (isFileExisted == false) {
        const htmlContent = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">\r\n<title>404 Not Found</title>\r\n<h1>Not Found</h1>\r\n<p>The requested URL was not found on the server.  If you entered the URL manually please check your spelling and try again.</p>`;
        const contentLength = htmlContent.length;
        const httpCode = "404 NOT FOUND";
        const serverDate = new Date().toString();
        const serverVersion = `Node.js/${process.version}`;
        const contentType = "text/html";

        data = `HTTP/1.1 ${httpCode}\r\nDate: ${serverDate}\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\nConnection: close\nServer: ${serverVersion}\r\n\r\n${htmlContent}`;
      }
    }
  } else if (reqType.toLowerCase() == "post") {
    reqBody = req.split("\r\n\r\n")[1];

    var allFiles = fs.readdirSync(path.resolve(__dirname, homeDir));
    var reqFileName = reqAddress.substring(1);
    var reqAddress2 = reqAddress.split("/");
    if (reqAddress2.length != 2) {
      homeDir =
        homeDir + reqAddress2.slice(0, reqAddress2.length - 1).join("/");
      allFiles = fs.readdirSync(path.resolve(__dirname, homeDir));
      reqFileName = reqAddress2[reqAddress2.length - 1];
    }

    var isProtectedDir = false;
    if (allFiles.includes(".protected")) {
      data = `HTTP/1.1 403 Forbidden\r\n`;
      isProtectedDir = true;
    }

    if (isProtectedDir == false) {
      const filePath = path.resolve(
        __dirname,
        homeDir + "/" + reqFileName + ".json"
      );

      fs.writeFileSync(filePath, reqBody, function (err) {
        if (err) throw err;
      });

      const contentLength = reqBody.length;

      const httpCode = "200 OK";
      const serverDate = new Date().toString();
      const serverVersion = `Node.js/${process.version}`;
      const contentType = "application/json";

      data = `HTTP/1.1 ${httpCode}\r\nDate: ${serverDate}\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\nConnection: close\r\nServer: ${serverVersion}\r\n\r\n${reqBody}`;
    }
  }

  return data;
}
