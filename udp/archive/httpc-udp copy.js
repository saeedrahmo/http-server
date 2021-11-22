"use strict";

const dgram = require("dgram");
const udp = require("../packet");

var msg = Buffer.from("someString", "utf-8").toString();

const udp_pkt = udp.encode({
  type: 0,
  sequenceNumber: 1,
  peerAddress: "127.0.0.1",
  peerPort: 8090,
  payLoad: "I got your message!",
});

var arrByte = Uint8Array.from(udp_pkt);

console.log(udp.decode(udp_pkt));

// Buffer.from('someString', 'utf-8').toString();

// p = Packet(
//   (packet_type = 0),
//   (seq_num = 1),
//   (peer_ip_addr = "127.0.0.1"),
//   (peer_port = 8090),
//   (payload = msg.encode("utf-8"))
// );
// conn.sendto(p.to_bytes(), (router_addr, router_port));

// const net = require("net");
// const yargs = require("yargs");

const message = Buffer.from("Hello its me Saeed!");
const client = dgram.createSocket("udp4");

client.connect(3000, "127.0.0.1", (err) => {
  client.send(udp_pkt, (err) => {
    //client.close();
  });
});

client.on("message", (data, rinfo) => {
  // Remote address information
  const p = udp.decode(data);
  console.log(
    `type:${p.type}\tsequenceNumber:${p.sequenceNumber}\tpeerAddress:${p.peerAddress}\tpeerPort:${p.peerPort}\tpayLoad:${p.payLoad}`
  );
  // console.log(`client got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  client.close();
});

// const argv = yargs
//   .usage("node echoclient.js [--host host] [--port port]")
//   .default("host", "localhost")
//   .default("port", 8007);
// help("help").argv;

// const client = net.createConnection({ host: argv.host, port: argv.port });

// const requests = [];

// client.on("data", (buf) => {
//   if (requests.length == 0) {
//     client.end();
//     process.exit(-1);
//   }

//   const r = requests[0];
//   r.response = Buffer.concat([r.response, buf]);

//   if (r.response.byteLength >= r.sendLength) {
//     requests.shift();
//     console.log("Replied: " + r.response.toString("utf-8"));
//   }
// });

// client.on("connect", () => {
//   console.log("Type any thing then ENTER. Press Ctrl+C to terminate");

//   process.stdin.on("readable", () => {
//     const chunk = process.stdin.read();
//     if (chunk != null) {
//       requests.push({
//         sendLength: chunk.byteLength,
//         response: new Buffer(0),
//       });
//       client.write(chunk);
//     }
//   });
// });

// client.on("error", (err) => {
//   console.log("socket error %j", err);
//   process.exit(-1);
// });
