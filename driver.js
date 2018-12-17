const Benchmark = require('benchmark')
const WebSocket = require('isomorphic-ws')
const fetch = require('node-fetch');
const utils = require('./utils.js');

const URI = process.env.URI || process.env.npm_package_config_URI || 'ws://localhost';
const PORT = process.env.PORT || process.env.npm_package_config_PORT || 8888;
const USERNAME = process.env.npm_package_config_USERNAME || process.env.USERNAME || null;
const PASSWORD = process.env.npm_package_config_PASSWORD || process.env.PASSWORD || null;

const FILES_IN_BURST = 1;
const NUM_BYTES = 1024;

let CONTENTS_CREATED = [];
let CONTENTS_UPDATED = [];
for (var i = 0; i < FILES_IN_BURST; i++) {
  CONTENTS_CREATED[i] = utils.randomBytes(NUM_BYTES);
  CONTENTS_UPDATED[i] = utils.randomBytes(NUM_BYTES);
}

let OPCODES = {
  NOTIFY_DEFERRED: 0,
  MEMORY_CREATE: 1,
  MEMORY_READ: 2,
  MEMORY_UPDATE: 3,
  MEMORY_DELETE: 4,
  FILE_CREATE: 5,
  FILE_READ: 6,
  FILE_UPDATE: 7,
  FILE_DELETE: 8,
  IPFS_CREATE: 9,
  IPFS_READ: 10,
  IPFS_UPDATE: 11,
  IPFS_DELETE: 12
};

// defferal list:  benchmark suite's deferred promise is pushed on list at some index, index is sent to server.
// when index received with 'deferral' opcode, it's resolved
let deferrals = [];

/*** HELPERS ***/

var sendFn = null; // setup at end once 'ws' connected and enclosed

function doFiles(createOpcode, readOpcode, updateOpcode, deleteOpcode, deferred) {
  deferrals.push(deferred);

  for (var fileI = 0; fileI < FILES_IN_BURST; fileI++) {   
    sendFn(createOpcode, fileI, CONTENTS_CREATED[fileI]);
  }
  for (var fileI = 0; fileI < FILES_IN_BURST; fileI++) {
    sendFn(readOpcode, fileI, new Uint8Array());        
  }
  for (var fileI = 0; fileI < FILES_IN_BURST; fileI++) {
    sendFn(updateOpcode, fileI, CONTENTS_UPDATED[fileI]);    
  }
  for (var fileI = 0; fileI < FILES_IN_BURST; fileI++) {
    sendFn(deleteOpcode, fileI, new Uint8Array());            
  }

  // send final message to resovle deferred
  var message = new ArrayBuffer(4);
  var view = new DataView(message);
  view.setUint32(0,deferrals.length-1);
  message = new Uint8Array(message);
  sendFn(OPCODES.NOTIFY_DEFERRED, 0, message);
}

/*** BENCH SUITE ***/

const cb = function(cb){
  cb(null, true)
}
let suite = new Benchmark.Suite()

suite
.add('memory-only', {
  defer: true,
  fn: function(deferred) {
    doFiles(OPCODES.MEMORY_CREATE, OPCODES.MEMORY_READ, OPCODES.MEMORY_UPDATE, OPCODES.MEMORY_DELETE, deferred);
  }})

  // add listeners
  .on('cycle', event => {
    console.log("%s", event.target);
  })
  .on('complete',function() {
    console.log('fastest :: ' + this.filter('fastest').map('name'))
    process.exit(0);
  })
  .on('error', error => {
    console.error(`ERROR: ${error}`)
  });

/*** INITIALIZE AND RUN ***/

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
  var token = new Uint8Array(utils.str2ab(await response.text()));

  var ws = new WebSocket(`${URI}:${PORT}/`);

  ws.onopen = function open() {
    console.log('connected');  
    suite.run({ 
      async: true
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
    var result = utils.ab2str(buf.slice(133,143));

    if (result !== 'OK') {
      throw new Error('NOT OK from server');
    }

    if (opcode == 0) {
      let view = new DataView(buf.slice(143,147));
      deferrals[view.getUint32(0)].resolve();
    }
  };

  sendFn = (opcode, index, payload) => {
    var message = new ArrayBuffer(143 + payload.byteLength);
    var view = new DataView(message);
    view.setUint8(0,opcode);   // opcode: 1 byte
                               // token: 128 bytes
    view.setUint32(129,index); // index: 4 bytes
                               // reserved: 10 bytes
    message = new Uint8Array(message);
    message.set(token, 1);
    message.set(payload, 143);
    ws.send(message);
  }
  
})();
