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
    var token = utils.ab2str(buf.slice(1,129));

    if (token !== TOKEN) {
      console.log('invalid token in WS message');
      return;
    }
  
    switch(opcode) {
      case 0: // repeat back
        debug(`GOT repeat`);
        ws.send(new Uint8Array(buf), (err) => {
          debug(`ack: ${err}`);
        });
        break;
      default:
        debug(`invalid message opcode ${opcode}`);
    }
  });
});


server.listen(PORT, function() {
  debug(`listening: ${PORT}`);
});