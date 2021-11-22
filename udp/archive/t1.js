const getKeyByValue = (obj, value) =>
  Object.keys(obj).find((key) => obj[key] === value);

const typeDict = {
  ACK: 0,
  SYN: 1,
  ACK_SYN: 2,
  NAK: 3,
  FIN: 4,
};

console.log(getKeyByValue(typeDict, 2));
console.log(typeDict["FIN"]);
