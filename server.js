'use strict';

let BasicAuth = require('basic-auth');
let crypto = require('crypto');
let utils = require('./utils.js');
let wsServer = require('ws').Server;
let server = require('http').createServer();
let express = require('express');
let debug = require('debug')('server')
let app = express();

const PORT = process.env.PORT || process.env.npm_package_config_PORT || 8888;
const USERNAME = process.env.npm_package_config_USERNAME || process.env.USERNAME || null;
const PASSWORD = process.env.npm_package_config_PASSWORD || process.env.PASSWORD || null;

const TOKEN = crypto.createHash('sha256').update(USERNAME + PASSWORD, 'utf-8').digest('hex');

let OPCODES = {
  REPEAT: 0,
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

/*** mem storage utils ***/
var mem_files = {};

/*** file storage utils ***/

/*** ipfs storage utils ***/

/*** server ***/

app.use(function(request, response, next) {
  var user = BasicAuth(request);
  debug('request made (method:%s)(headers:%o)(path:%s)', request.method, request.headers, request.path);
  if (!user) {
    debug('invalid basic-auth header');
    // no basic-auth header or malformed
    response.set('WWW-Authenticate', 'Basic');
    return response.status(401).send();  
  }
  if (USERNAME === user.name && PASSWORD === user.pass) {
    next(); // all good
  } else {
    debug('error authenticating user: %s', user.name);
    response.set('WWW-Authenticate', 'Basic');
    return response.status(401).send('Unauthorized');      
  }
});

app.get('/getToken', (req, rsp) => {
  debug('handling getToken');
  return rsp.status(200).send(TOKEN);      
})

let wss = new wsServer({
  server: server
});

server.on('request', app);

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    var buf = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength)
    debug(`rcv: ${buf.byteLength} bytes`);

    var view = new DataView(buf);
    var opcode = view.getUint8(0);
    var index = view.getUint32(129);
    var token = utils.ab2str(buf.slice(1,129));
    var payload = buf.slice(143);
    debug(`rcv: opcode:${opcode}`);

    if (token !== TOKEN) {
      console.log('invalid token in WS message');
      return;
    }

    let result = new Uint8Array(buf.slice(0,143)); // truncate to header
    result.set(new Uint8Array(utils.str2ab('OK')),133); // shove OK in there

    switch(opcode) {

      case OPCODES.REPEAT:
        debug(`GOT repeat payload:${utils.buf2hex(payload)}`);       
        result = [...result,...new Uint8Array(buf.slice(143))]; // append message contents
        break;

      case OPCODES.MEMORY_CREATE:
        debug(`GOT MEMORY_CREATE`);
        mem_files[index] = payload;
        result.set(new Uint8Array(utils.str2ab('OK')),133); // shove OK in there
        break;

      case OPCODES.MEMORY_READ:
        debug(`GOT MEMORY_READ`);
        result.set(new Uint8Array(utils.str2ab('OK')),133); // shove OK in there
        result = [...result,...new Uint8Array(mem_files[index])]; // append file contents
        break;

      case OPCODES.MEMORY_UPDATE:
        debug(`GOT MEMORY_UPDATE`);
        mem_files[index] = payload;
        result.set(new Uint8Array(utils.str2ab('OK')),133); // shove OK in there
        break;

      case OPCODES.MEMORY_DELETE:
        debug(`GOT MEMORY_DELETE`);
        delete mem_files[index];
        result.set(new Uint8Array(utils.str2ab('OK')),133); // shove OK in there
        break;

      default:
        debug(`invalid message opcode ${opcode}`);
        result.set(new Uint8Array(utils.str2ab('NOTOK')),133); // shove NOTOK in there
      }

    ws.send(result, (err) => {
      debug(`ack: ${err ? err : ''}`);
    });

  });
});


server.listen(PORT, function() {
  debug(`listening: ${PORT}`);
});