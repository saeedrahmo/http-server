const dgram = require("dgram");
const udp = require("./packet");
const yargs = require("yargs");
var fs = require("fs");
const path = require("path");

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

function handleClient(pkt, rinfo) {
  const p = udp.decode(pkt);

  fs.appendFileSync(
    "./log/server-log.txt",
    `server got: ${udp.getKeyByValue(udp.typeDict, p.type)}\tseq:${
      p.sequenceNumber
    }\tpay:${p.payLoad}\texp${expectedSequenceNumber}\n`
  );

  switch (udp.getKeyByValue(udp.typeDict, p.type)) {
    case "Data":
      // Send data
      var data = "";
      p.type = udp.typeDict["Data"];

      //**
      var req = p.payLoad;
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
      //**

      p.payLoad = data;
      p.sequenceNumber = p.sequenceNumber + 1;
      // expectedSequenceNumber = p.sequenceNumber + 1;

      udp_pkt = udp.encode(p);
      server.send(udp_pkt, rinfo.port, (err) => {});
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
        // Ack belongs to data
      } else {
        p.type = udp.typeDict["NAK"]; //TODO:check?

        udp_pkt = udp.encode(p);
        server.send(udp_pkt, rinfo.port, (err) => {});
      }
      break;
    // Continues handshaking
    case "SYN":
      p.type = udp.typeDict["SYN_ACK"];
      p.payLoad = p.sequenceNumber + 1; // Ack x+1
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
