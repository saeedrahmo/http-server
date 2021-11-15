const ip = require("ip");
const ipToArray = require("ip-to-array");

const minLen = 11;
const maxLen = 11 + 1013;

function dot2num(dot) {
  var d = dot.split(".");
  return ((+d[0] * 256 + +d[1]) * 256 + +d[2]) * 256 + +d[3];
}

function num2dot(num) {
  var d = num % 256;
  for (var i = 3; i > 0; i--) {
    num = Math.floor(num / 256);
    d = (num % 256) + "." + d;
  }
  return d;
}

// const ip2int = (x) => x.split(".").reduce((a, v) => (a << 8) + +v, 0) >>> 0;

function ip2int(ip) {
  return (
    ip.split(".").reduce(function (ipInt, octet) {
      return (ipInt << 8) + parseInt(octet, 10);
    }, 0) >>> 0
  );
}

longToByteArray = function (/*long*/ long) {
  // we want to represent the input as a 8-bytes array
  var byteArray = [0, 0, 0, 0];

  for (var index = 0; index < byteArray.length; index++) {
    var byte = long & 0xff;
    byteArray[index] = byte;
    long = (long - byte) / 256;
  }

  return byteArray;
};

exports.encode = function (packet) {
  var enc = new TextEncoder("utf-8"); // always utf-8
  var payLoad = enc.encode(packet.payLoad);

  var peerPort = packet.peerPort,
    peerAddress = packet.peerAddress,
    type = packet.type,
    sequenceNumber = packet.sequenceNumber;

  var buf = Buffer.alloc(payLoad.length + minLen);

  buf.writeUInt8(type, 0);
  buf.writeUInt32BE(sequenceNumber, 1);
  //   buf.fill(Buffer.from("127.0.0.1"), 5);
  buf.writeUInt32LE(ip.toLong("1.0.0.126"), 5, 9);
  buf.writeUInt16BE(peerPort, 9);
  //buf.from(payLoad)z
  buf.fill(payLoad, 11);
  //   packet.payLoad.copy(buf, 11);
  //buf.writeUInt16BE(checksum(packet, buf), 6);
  return buf;
};

exports.decode = function (buf) {
  // var len = buf.readUInt16BE(4);
  var enc = new TextDecoder("utf-8");
  return {
    type: buf.readUInt8(0),
    sequenceNumber: buf.readUInt32BE(1),
    peerAddress: ip.fromLong(buf.readUInt32LE(5)),
    peerPort: buf.readUInt16BE(9),
    payLoad: enc.decode(buf.slice(11)),
  };
};

exports.checksum = checksum;
function checksum(packet, buf) {
  // pseudo header: srcip (16), dstip (16), 0 (8), proto (8), udp len (16)
  var len = buf.length;
  var srcip = packet.sourceIp;
  var dstip = packet.destinationIp;
  if (!srcip || !dstip) return 0xffff;
  var protocol = packet.protocol === undefined ? 0x11 : packet.protocol;
  var sum = 0xffff;
  // pseudo header: srcip (16), dstip (16), 0 (8), proto (8), udp len (16)
  if (srcip && dstip) {
    if (typeof srcip === "string") srcip = Buffer.from(srcip.split("."));
    if (typeof dstip === "string") dstip = Buffer.from(dstip.split("."));
    sum = 0;
    var pad = len % 2;
    for (var i = 0; i < len + pad; i += 2) {
      if (i === 6) continue; // ignore the currently written checksum
      sum += ((buf[i] << 8) & 0xff00) + (buf[i + 1] & 0xff);
    }
    for (var i = 0; i < 4; i += 2) {
      sum += ((srcip[i] << 8) & 0xff00) + (srcip[i + 1] & 0xff);
    }
    for (var i = 0; i < 4; i += 2) {
      sum += ((dstip[i] << 8) & 0xff00) + (dstip[i + 1] & 0xff);
    }
    sum += protocol + len;
    while (sum >> 16) {
      sum = (sum & 0xffff) + (sum >> 16);
    }
    sum = 0xffff ^ sum;
  }
  return sum;
}
