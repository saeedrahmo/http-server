"use strict";

const dgram = require("dgram");
// const net = require("net");
// const yargs = require("yargs");

// socket
// const server = dgram.createSocket("udp4");
const server = dgram.createSocket("udp4", handleClient).on("error", (err) => {
  throw err;
});
// const server = net.createServer(handleClient).on("error", (err) => {
//   throw err;
// });

// server.on("error", (err) => {
//   console.log(`server error:\n${err.stack}`);
//   server.close();
// });

// server.on("message", (msg, rinfo) => {
//   // Remote address information
//   console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
// });

server.on("listening", () => {
  const address = server.address();
  console.log(address);
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind({
  // address: "localhost",
  address: "0.0.0.0",
  port: 8090,
  exclusive: true,
});

// server.bind(41234);

// const argv = yargs
//   .usage("node echoserver.js [--port port]")
//   .default("port", 8007)
//   .help("help").argv;

// server.listen({ port: argv.port }, () => {
//   console.log("Echo server is listening at %j", server.address());
// });

function handleClient(msg, rinfo) {
  console.log(
    `server got: ${msg.toString("utf8")} from ${rinfo.address}:${rinfo.port}`
  );

  const message = Buffer.from("I got your message!");
  server.send(message, rinfo.port, (err) => {});

  // console.log("New client from %j", socket);
  // console.log("New client from %j", message);
  // console.log(socket.toString("utf8"));
  // socket.on("error", (err) => {
  //   console.log(`server error:\n${err.stack}`);
  //   socket.close();
  // });

  // socket.on("message", (msg, rinfo) => {
  //   // Remote address information
  //   console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  // });

  //   .on("error", (err) => {
  //     console.log("socket error %j", err);
  //     socket.destroy();
  //   })
  //   .on("end", () => {
  //     socket.destroy();
  //   });
}

// function handleClient(socket) {
//   console.log("New client from %j", socket.address());
//   socket
//     .on("data", (buf) => {
//       // just echo what received
//       socket.write(buf);
//     })
//     .on("error", (err) => {
//       console.log("socket error %j", err);
//       socket.destroy();
//     })
//     .on("end", () => {
//       socket.destroy();
//     });
// }
