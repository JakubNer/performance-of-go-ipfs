const WebSocket = require('isomorphic-ws')
const fetch = require('node-fetch');
const utils = require('./utils.js');

const URI = process.env.URI || process.env.npm_package_config_URI || 'ws://localhost';
const PORT = process.env.PORT || process.env.npm_package_config_PORT || 8888;
const USERNAME = process.env.npm_package_config_USERNAME || process.env.USERNAME || null;
const PASSWORD = process.env.npm_package_config_PASSWORD || process.env.PASSWORD || null;

(async () => {
  let url = URI.replace(/^ws/g,'http') + ':' + PORT + '/getToken';
  var response = await fetch(url, {
    method: 'GET', headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': 'Basic ' + Buffer.from(USERNAME + ':' + PASSWORD).toString('base64')
    }
  })
  if (response.status != 200) {
    let text = await response.text();
    console.log(`GET %s error: %s`, url, text);
    throw new Error(text);
  }
  var TOKEN = new Uint8Array(utils.str2ab(await response.text()));

  const ws = new WebSocket(`${URI}:${PORT}/`);

  ws.onopen = function open() {
    console.log('connected');
  
    var payload = utils.str2ab('Hello World');
    var header = new ArrayBuffer(133);
    var view = new DataView(header);
    view.setUint8(0,0); // opcode: 0 -- repeat back
    view.setUint32(129,2); // index
    header = new Uint8Array(header);
    header.set(TOKEN, 1);
  
    ws.send([...header,...utils.randomBytes(10),...new Uint8Array(payload)], (err) => {
      console.log(`ack: ${err}`);
    });
  };
  
  ws.onclose = function close() {
    console.log('disconnected');
  };
  
  ws.onmessage = function incoming(data) {
    var buf = data.data.buffer.slice(data.data.byteOffset, data.data.byteOffset + data.data.byteLength)
  
    var view = new DataView(buf);
    var opcode = view.getUint8(0);
    var index = view.getUint32(129);
    var random = utils.buf2hex(buf.slice(133,143));
    var payload = utils.ab2str(buf.slice(143));
    console.log(`GOT: ${opcode} ${index} ${random} ${payload}`);
  };
})();
