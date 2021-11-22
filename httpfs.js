const net = require("net");
const yargs = require("yargs");
const path = require("path");
const fs = require("fs");

//TODO: close socket/server connection
//TODO: if .protected inside dir return 403
// HTTP/1.1 403 Forbidden
// Date: Wed, 21 Oct 2015 07:28:00 GMT
// TODO: post file write json
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
    default: 8080,
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

const server = net.createServer(handleClient).on("error", (err) => {
  throw err;
});

// TODO: family: "IPv4", address: "127.0.0.1"
server.listen({ port: argv.port }, () => {
  if (argv.v) {
    // console.log(argv);
    console.log("Echo server is listening at %j", server.address());
  }
});

// HTTP/1.1 200 OK
// Date: Fri, 22 Oct 2021 18:54:24 GMT
// Content-Type: application/json
// Content-Length: 284
// Connection: close
// Server: gunicorn/19.9.0
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Credentials: true

function readFiles(dir, processFile) {
  // read directory
  fs.readdir(dir, (error, fileNames) => {
    if (error) throw error;

    fileNames.forEach((filename) => {
      // get current file name
      const name = path.parse(filename).name;
      // get current file extension
      const ext = path.parse(filename).ext;
      // get current file path
      const filepath = path.resolve(dir, filename);

      // get information about the file
      fs.stat(filepath, function (error, stat) {
        if (error) throw error;

        // check if the current path is a file or a folder
        const isFile = stat.isFile();

        // exclude folders
        if (isFile) {
          // callback, do something with the file
          processFile(filepath, name, ext, stat);
        }
      });
    });
  });
}

/**
 * @description Read files synchronously from a folder, with natural sorting
 * @param {String} dir Absolute path to directory
 * @returns {Object[]} List of object, each object represent a file
 * structured like so: `{ filepath, name, ext, stat }`
 */
function readFilesSync(dir) {
  const files = [];

  fs.readdirSync(dir).forEach((filename) => {
    const name = path.parse(filename).name;
    const ext = path.parse(filename).ext;
    const filepath = path.resolve(dir, filename);
    const stat = fs.statSync(filepath);
    const isFile = stat.isFile();

    if (isFile) files.push(name);
    // files.push({ filepath, name, ext, stat });
  });

  // files.sort((a, b) => {
  //   // natural sort alphanumeric strings
  //   // https://stackoverflow.com/a/38641281
  //   return a.name.localeCompare(b.name, undefined, {
  //     numeric: true,
  //     sensitivity: "base",
  //   });
  // });

  return files;
}

function handleClient(socket) {
  console.log(argv);
  if (argv.v) console.log("New client from %j", socket.address());
  socket
    .on("data", (buf) => {
      var req = buf.toString("utf-8");
      var reqSplit = req.split("\r\n");
      var reqType = reqSplit[0].split(/\s+/)[0];
      var reqAddress = reqSplit[0].split(/\s+/)[1];
      var homeDir = "." + argv.d;

      // console.log(`reqSplit:${reqSplit}`);
      // console.log(`ADRESS:${reqAddress}`);

      var reqAddress2 = reqAddress.split("/");
      // console.log(`reqAddress2: ${reqAddress2.length}`);
      // console.log(`reqAddress2: ${reqAddress2[reqAddress2.length - 1]}`);
      // console.log(
      //   `slice: ${reqAddress2.slice(0, reqAddress2.length - 1).join("/")}`
      // );

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

          var response = `HTTP/1.1 ${httpCode}\nDate: ${serverDate}\nContent-Type: application/json\nContent-Length: ${contentLength}\nConnection: close\nServer: ${serverVersion}\n\n${jsonFiles}`;
          socket.write(response);
        } else {
          console.log("***ELSE***");
          var allFiles = fs.readdirSync(path.resolve(__dirname, homeDir));
          var reqFileName = reqAddress.substring(1);
          var reqAddress2 = reqAddress.split("/");
          console.log("***reqAddress2***");
          console.log(reqAddress2);
          if (reqAddress2.length != 2) {
            homeDir =
              homeDir + reqAddress2.slice(0, reqAddress2.length - 1).join("/");
            console.log(homeDir);
            allFiles = fs.readdirSync(path.resolve(__dirname, homeDir));
            reqFileName = reqAddress2[reqAddress2.length - 1];
          }
          console.log("***IF***");
          // console.log(`REQ: ${reqFileName}`);
          // console.log(`allFiles: ${allFiles}`);

          var isFileExisted = false;
          for (const item of allFiles) {
            if (allFiles.includes(".protected")) {
              console.log("***PROTECTED***");
              var response = `HTTP/1.1 403 Forbidden\r\n`;
              socket.write(response);
              isFileExisted = true;
              break;
            }

            const extname = path.extname(item);
            const filename = path.basename(item, extname);
            const absolutePath = path.resolve(homeDir, item);
            if (reqFileName == filename) {
              isFileExisted = true;
              //console.log(absolutePath);

              var fileContent = fs.readFileSync(absolutePath);

              const contentLength = fileContent.length;
              const httpCode = "200 OK";
              const serverDate = new Date().toString();
              const serverVersion = `Node.js/${process.version}`;
              const contentType = "application/json";

              var response = `HTTP/1.1 ${httpCode}\r\nDate: ${serverDate}\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\nConnection: close\r\nServer: ${serverVersion}\r\n\r\n${fileContent}`;
              socket.write(response);
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

            var response = `HTTP/1.1 ${httpCode}\r\nDate: ${serverDate}\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\nConnection: close\nServer: ${serverVersion}\r\n\r\n${htmlContent}`;
            socket.write(response);
          }
        }
      } else if (reqType.toLowerCase() == "post") {
        reqBody = req.split("\r\n\r\n")[1];

        // console.log(`reqBody: ${reqBody}`);

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
          var response = `HTTP/1.1 403 Forbidden\r\n`;
          socket.write(response);
          isProtectedDir = true;
        }

        if (isProtectedDir == false) {
          const filePath = path.resolve(
            __dirname,
            homeDir + "/" + reqFileName + ".json"
          );

          // console.log(`filePath: ${filePath}`);

          fs.writeFileSync(filePath, reqBody, function (err) {
            if (err) throw err;
            // console.log("It's saved!");
          });

          const contentLength = reqBody.length;
          // fs.readFileSync(filePath, {
          //   encoding: "utf8",
          //   flag: "r",
          // }).length;
          // console.log(`contentLength:${contentLength}`);
          const httpCode = "200 OK";
          const serverDate = new Date().toString();
          const serverVersion = `Node.js/${process.version}`;
          const contentType = "application/json";

          var response = `HTTP/1.1 ${httpCode}\r\nDate: ${serverDate}\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\nConnection: close\r\nServer: ${serverVersion}\r\n\r\n${reqBody}`;
          socket.write(response);
        }
      }

      // console.log(reqSplit[0].split(/\s+/)[2]);
      // console.log(reqSplit[1]);
      // console.log(reqSplit[2]);
      // console.log(reqSplit[3]);
      // console.log(buf.toString("utf-8"));

      //path.resolve(__dirname, folder)
      //var filesList = [];
      //var fname = "";
      // fs.readdir(__dirname, (err, files) => {
      //   if (err) throw err;

      //   for (let file of files) {
      //     const extname = path.extname(file);
      //     const filename = path.basename(file, extname);
      //     //const absolutePath = path.resolve(folder, file);
      //     filesList.push(filename);
      //     fname += filename;
      //     //console.log(filename);
      //   }
      // });

      // fs.readdir(__dirname, (err, files) => {
      //   files.forEach((file) => {
      //     const extname = path.extname(file);
      //     const filename = path.basename(file, extname);
      //     // console.log(filename);

      //     filesList.push(filename);
      //     fname += filename;
      //   });
      // });

      // use an absolute path to the folder where files are located
      // readFiles(__dirname, (filepath, name, ext, stat) => {
      //   // console.log("file path:", filepath);
      //   filesList.push(name);
      //   //console.log("file name:", name);
      //   //console.log("file extension:", ext);
      //   //console.log("file information:", stat);
      // });

      // return an array list of objects
      // each object represent a file

      //console.log(`FILESLIST: ${files}`);
      //console.log(`FNAME: ${fname}`);

      // console.log("Current directory:", __dirname);
      // console.log("Current directory:", path.dirname(__filename));

      // const event = new Date();
      // const options = { year: "numeric", month: "short", day: "short" };

      // console.log(event.toLocaleDateString("de-DE", options));
      // expected output: Donnerstag, 20. Dezember 2012
      // Date: Fri, 22 Oct 2021 18:38:24 GMT
      // console.log(event.toLocaleDateString("en-US", options));
      // console.log(new Date(new Date().toUTCString()));
      ///  console.log(new Date(new Date().toGMTString()));
      // US format

      //console.log(new Date().toISOString());

      // socket.write(
      //   "HTTP/1.1 ${}\n" +
      //     "Content-Type: text/html\n" +
      //     "\n" +
      //     "<html><body>Hello World</body></html>\n"
      // );
    })
    .on("error", (err) => {
      if (argv.v) console.log("socket error %j", err);
      socket.destroy();
    })
    .on("end", () => {
      socket.destroy();
    });
}
