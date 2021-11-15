exports.encode = function (packet) {
  var data = packet.data,
    len = data.length;
  var srcport = packet.sourcePort,
    dstport = packet.destinationPort;
  var buf = Buffer.alloc(len + 8);
  buf.writeUInt16BE(srcport, 0);
  buf.writeUInt16BE(dstport, 2);
  buf.writeUInt16BE(buf.length, 4);
  packet.data.copy(buf, 8);
  buf.writeUInt16BE(checksum(packet, buf), 6);
  return buf;
};

exports.decode = function (buf) {
  var len = buf.readUInt16BE(4);
  return {
    sourcePort: buf.readUInt16BE(0),
    destinationPort: buf.readUInt16BE(2),
    length: len,
    checksum: buf.readUInt16BE(6),
    data: buf.slice(8, len),
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
