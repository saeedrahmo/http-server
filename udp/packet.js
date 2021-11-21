const ip = require("ip");

const minLen = 11;
const maxLen = 1013;

exports.maxLen = maxLen;

exports.getPayloadLength = function (payload) {
  var enc = new TextEncoder("utf-8"); // always utf-8
  return enc.encode(packet.payLoad).length;
};

exports.encode = function (packet) {
  // var enc = new TextEncoder("utf-8"); // always utf-8
  // var payLoad = enc.encode(packet.payLoad);

  var peerPort = packet.peerPort,
    peerAddress = packet.peerAddress,
    type = packet.type,
    sequenceNumber = packet.sequenceNumber,
    payLoad = packet.payLoad;

  // var payLoad_length = payLoad.length;
  // selected_payload =
  //   payLoad_length > maxLen ? payLoad.slice(0, maxLen) : payLoad;

  // console.log(`LENGTH: ${selected_payload.length}`);

  var buf = Buffer.alloc(payLoad.length + minLen);

  buf.writeUInt8(type, 0);
  buf.writeUInt32BE(sequenceNumber, 1);
  buf.writeUInt32BE(ip.toLong(peerAddress), 5);
  buf.writeUInt16BE(peerPort, 9);
  buf.fill(selected_payload, 11);

  return buf;
};

exports.decode = function (buf) {
  var enc = new TextDecoder("utf-8");
  return {
    type: buf.readUInt8(0),
    sequenceNumber: buf.readUInt32BE(1),
    peerAddress: ip.fromLong(buf.readUInt32BE(5)),
    peerPort: buf.readUInt16BE(9),
    payLoad: enc.decode(buf.slice(11)),
  };
};

exports.getKeyByValue = (obj, value) =>
  Object.keys(obj).find((key) => obj[key] === value);

// Packet types
exports.typeDict = {
  Data: 0,
  ACK: 1,
  SYN: 2,
  SYN_ACK: 3,
  NAK: 4,
};
