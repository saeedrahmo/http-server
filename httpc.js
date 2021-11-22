var net = require("net");
var yargs = require("yargs");
var url = require("url");
const fs = require("fs");

var client = new net.Socket();

var argv = yargs
  .usage("Usage: $0 command [arguments]")
  // examples based on https://httpbin.org/
  .example("node httpc get http://127.0.0.1:8082/ -v")
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
    handler: (argv) => {
      //console.log(argv);
      if (argv._.length == 2) {
        // if (isUrlValid(argv._[1])) {
        //console.log(argv);
        var parsedUrl = url.parse(removeQuetes(argv._[1]));
        client.connect(
          parsedUrl.port ? parsedUrl.port : 80,
          parsedUrl.hostname,
          function () {
            client.write(
              `POST ${parsedUrl.path} HTTP/1.0\r\nHost:${parsedUrl.hostname}${
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
              }`
            );
          }
        );
        //}
      }
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
    },
    function (argv) {
      console.log(argv);
      if (argv._.length == 2) {
        // console.log(isUrlValid(argv._[1]));
        //if (isUrlValid(argv._[1])) {
        var parsedUrl = url.parse(removeQuetes(argv._[1]));
        // console.log(`url: ${parsedUrl.hostname} port:${parsedUrl.port}`);
        client.connect(
          parsedUrl.port ? parsedUrl.port : 80,
          parsedUrl.hostname,
          function () {
            client.write(
              `GET ${parsedUrl.path} HTTP/1.0\r\nHost:${
                parsedUrl.hostname
              }\r\n${
                argv.h
                  ? Array.isArray(argv.h)
                    ? argv.h
                    : argv.h.join("\r\n")
                  : ""
              }\r\n`
            );
          }
        );
        // }
      }
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
//.wrap(null)
var client2 = new net.Socket();
//yargs.showHelp();

client.on("connect", function () {
  // console.log(`<=== Connection connected ===>`);
});

client.on("timeout", function (time) {
  console.log(`<=== Timeout: ${time} ===>`);
});

client.on("error", function (err) {
  console.log(`<=== Error: ${err} ===>`);
});

client.on("data", function (data) {
  var dt = argv.v
    ? data.toString("utf8")
    : data.toString("utf8").split("\r\n\r\n").pop();

  if (!argv.o) {
    console.log(dt);
  } else {
    fs.writeFile(argv.o, dt, function (err) {
      if (err) {
        return console.log(`<===Error: ${err}===>`);
      }
      console.log("<=== The file was saved ===>");
    });
  }

  if (argv.i) {
    var tx = data.toString("utf8").split("\r\n\r\n")[0];
    var he = "http/1.1";
    var redirect_url = "";
    var is_redirect =
      tx.substring(
        tx.toLowerCase().indexOf(he) + 9,
        tx.toLowerCase().indexOf(he) + 13
      ) == 301;

    if (is_redirect) {
      var lo = "location:";
      var ta = tx.split("\r\n");

      for (var i = 0; i < ta.length; i++) {
        if (ta[i].toLowerCase().indexOf(lo) > -1) {
          redirect_url = ta[i].substring(
            ta[i].toLowerCase().indexOf(lo) + 10,
            ta[i].length
          );
        }
      }
    }

    var parsedUrl = url.parse(redirect_url);
    var host_name = "";
    if (parsedUrl.hostname) {
      host_name = parsedUrl.hostname;
    } else {
      if (argv._.length == 2)
        if (isUrlValid(argv._[1]))
          host_name = url.parse(removeQuetes(argv._[1])).hostname;
    }

    redirect_func(host_name, redirect_url);
  }

  client.end();
});

var redirect_func = (host_name, redirect_url) => {
  client2.connect(80, host_name, function () {
    client2.write(`GET ${redirect_url} HTTP/1.0\r\nHost: ${host_name}\r\n\r\n`);
  });
};

client2.on("data", function (data) {
  var dt = argv.v
    ? data.toString("utf8")
    : data.toString("utf8").split("\r\n\r\n").pop();

  if (!argv.o) {
    console.log(dt);
  } else {
    fs.stat(argv.o, function (err, stat) {
      if (err == null) {
        //Exist
        fs.appendFile(argv.o, dt, function (err) {
          if (err) return console.log(`<===Error: ${err}===>`);
          console.log("<=== The file was saved ===>");
        });
      } else if (err.code == "ENOENT") {
        // NO exist
        fs.writeFile(argv.o, dt, function (err) {
          if (err) {
            return console.log(`<===Error: ${err}===>`);
          }
          console.log("<=== The file was saved ===>");
        });
      }
    });
  }
});

client2.on("close", function () {
  //console.log(`<=== Connection closed ===>`);
});

client.on("close", function () {
  //console.log(`<=== Connection closed ===>`);
});

function isUrlValid(userInput) {
  var res = userInput.match(
    /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
  );
  if (res == null) return false;
  else return true;
}

function removeQuetes(str) {
  return str.replace(/['"]+/g, "");
}
