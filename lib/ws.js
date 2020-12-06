// Part of <http://miracle.systems/p/inode-server> licensed under <MIT>

'use strict';

const WebSocketServer = require('ws').Server;
const util = require('./util');

module.exports = function setUpSlave(app, wsConfig) {
  if (!wsConfig || typeof wsConfig !== 'object') {
    util.warn('[ws] Not configured.');
    return;
  }

  if (wsConfig.enabled === false) {
    util.warn('[ws] Not enabled.');
    return;
  }

  util.log('[ws] Setting up...');

  wsConfig.clientTracking = true;

  const httpEnabled = !!app.http;
  const portDefined = process.env.PORT || wsConfig.port >= 80;
  const bindMatched = app.http && wsConfig.host === app.http.config.host && wsConfig.port === app.http.config.port;

  if (httpEnabled && (!portDefined || bindMatched)) {
    wsConfig.server = app.http.server;
    delete wsConfig.port;
  }

  const wsServer = new WebSocketServer(wsConfig);

  wsServer.on('listening', () => util.log('[ws#listening]'));
  wsServer.on('error', err => util.log(`[ws#error] ${err.message}`));

  let socketCounter = 0;
  let pingTimer = null;

  wsServer.on('connection', function(socket) {
    const id = ++socketCounter;
    const remoteInfo = {
      address: socket.upgradeReq.socket.remoteAddress,
      port: socket.upgradeReq.socket.remotePort
    };

    util.log(`[ws] [socket#${id}] ${JSON.stringify(remoteInfo, null, 2)}`);

    const connectedAt = Date.now();

    socket.on('error', err => util.error(`[ws] [socket#${id}#error] ${err.message}`));
    socket.on('close', () => util.warn(`[ws] [socket#${id}#close] ${(Date.now() - connectedAt) / 1000}s`));
    socket.on('message', function incoming(data) {
      data = JSON.parse(data);
      const mac = data.device;
      const device = app.gateway.getDevice(mac) || app.mockGateway.getDevice(mac);
      if (device) {
        device.state = { ...device.state, ...data.changes };
      }
      broadcast('device:change', { device: mac, changes: data.changes });
    });

    socket.send(JSON.stringify({
      type: 'device:add',
      data: app.gateway.getDevices()
    }));
    if (app.mockGateway) {
      socket.send(JSON.stringify({
        type: 'device:add',
        data: app.mockGateway.devices
      }));
    }
  });

  schedulePing();

  if (app.mockGateway) {
    app.mockGateway.on('device:change', change => broadcast('device:change', change));
  } else {
    app.gateway.on('device:add', device => broadcast('devices:add', [device]));
    app.gateway.on('device:remove', device => broadcast('device:remove', {device: device.mac}));
    app.gateway.on('device:change', (device, changes) => broadcast('device:change', {device: device.mac, changes}));
  }

  function broadcast(type, data) {
    const json = JSON.stringify({type, data});
    wsServer.clients.forEach(client => client.send(json));
    schedulePing();
  }

  function schedulePing() {
    if (wsConfig.pingInterval <= 0) {
      return;
    }

    clearTimeout(pingTimer);
    pingTimer = setTimeout(ping, wsConfig.pingInterval || 30000);
  }

  function ping() {
    broadcast('ping', undefined);
  }
};
