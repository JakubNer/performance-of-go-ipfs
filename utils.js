// @returns {string} from ArrayBuffer (null terminator respected)
function ab2str(buf) {
  var charBuf = new Uint16Array(buf);
  var length = charBuf.length;
  for (var i = 0; i < length; i++) {
    if (charBuf[i] == 0) {
      length = i;
      break;
    }
  }
  return (String.fromCharCode.apply(null, charBuf)).slice(0,length);
}

// @param {string} str - string to convert to null terminated ArrayBuffer
// @returns {ArrayBuffer} that's null terminated: 0-character == end of string
function str2ab(str) {
  var buf = new ArrayBuffer((str.length + 1) * 2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  bufView[i] = 0;
  return buf;
}

// https://stackoverflow.com/a/40031979
function buf2hex(buffer) { // buffer is an ArrayBuffer
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

// @param {number} numBytes - number of random bytes in array, should be multiple of 2
// @return {Uint8Array}
function randomBytes(numBytes) {
  var result = new Uint8Array(numBytes);
  for (var i = 0; i < numBytes; i++) {
    result[i] = Math.floor(Math.random() * 256);
  }
  return result;
}

module.exports = {
  ab2str: ab2str,
  str2ab: str2ab,
  buf2hex: buf2hex,
  randomBytes: randomBytes
}