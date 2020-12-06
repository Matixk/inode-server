// Part of <http://miracle.systems/p/inode-server> licensed under <MIT>

'use strict';

const http = require('http');
const prepareMacAddress = require('h5.modbus.inode/lib/helpers').prepareMacAddress;
const util = require('./util');

module.exports = function setUpHttp(app, httpConfig) {
  if (!httpConfig || typeof httpConfig !== 'object') {
    util.warn('[http] Not configured.');
    return;
  }

  if (httpConfig.enabled === false) {
    util.warn('[http] Not enabled.');
    return;
  }

  util.log('[http] Setting up...');

  const requestCounter = {
    value: 0,
    next: function() { return (++this.value).toString(36).toUpperCase(); }
  };

  const httpServer = http.createServer();

  app.http = {
    config: httpConfig,
    server: httpServer
  };

  httpServer.listen(process.env.PORT || httpConfig.port || 80, httpConfig.host || '0.0.0.0');

  httpServer.on('listening', () => util.log('[http#listening]'));
  httpServer.on('close', () => util.warn('[http#close]'));
  httpServer.on('error', err => util.error(`[http#error] ${err.message}`));

  httpServer.on('request', function(req, res) {
    const startedAt = Date.now();
    const id = requestCounter.next();
    const dataBuffers = [];
    let dataLength = 0;

    util.log(`[http] [request#${id}] [${req.socket.remoteAddress}]:${req.socket.remotePort} ${req.method} ${req.url}`);

    req.on('error', err => util.error(`[http] [request#${id}#error] ${err.message}`));

    req.on('readable', function() {
      const data = req.read();

      if (data) {
        dataBuffers.push(data);
        dataLength += data.length;
      }
    });

    req.on('end', function() {
      util.log(`[http] [request#${id}#end] ${dataLength}B in ${Date.now() - startedAt}ms`);

      handleRequest(id, req, res, Buffer.concat(dataBuffers, dataLength));
    });
  });

  function handleRequest(id, req, res, body) {
    if (req.url.startsWith('/devices')) {
      getDevices(id, req, res, body);
    }

    handleNotFound(res);
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Request-Method': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers'
  };

  /**
   * @private
   * @param {string} id
   * @param {IncomingMessage} req
   * @param {ServerResponse} res
   * @param {Buffer} body
   * GET: /devices
   */
  function getDevices(id, req, res, body)
  {
    if (req.url === '/devices') {
      if (req.method !== 'GET') {
        handleWrongHeader(res)
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        ...headers
      });

      if (app.mockGateway) {
        res.end(JSON.stringify(app.mockGateway.devices, null, 2));
      } else {
        res.end(JSON.stringify(app.gateway.getDevices(), null, 2));
      }

      return;
    }

    let matches = req.url.match(/^\/devices\/([0-9]+|(?:[A-Fa-f0-9]{2}:?){5}:?[A-Fa-f0-9]{2})$/);

    if (matches) {
      const address = /^[0-9]+$/.test(matches[1]) ? +matches[1] : prepareMacAddress(matches[1]);

      getDevice(id, req, res, body, app.gateway.getDevice(address));
      return;
    }

    matches = req.url.match(/^\/devices\/(MOCK:MAC:[0-9]*)/);

    if (matches) {
      const mac = matches[1];

      getDevice(id, req, res, body, app.mockGateway.getDevice(mac));
      return;
    }

    res.writeHead(404, headers);
    res.end();
  }

  /**
   * @private
   * @param {string} id
   * @param {IncomingMessage} req
   * @param {ServerResponse} res
   * @param {Buffer} body
   * @param {?Device} device
   * GET: /devices/:mac
   */
  function getDevice(id, req, res, body, device) {
    if (!device) {
      handleNotFound(res)
      return;
    }

    if (req.method !== 'GET') {
      handleWrongHeader(res)
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      ...headers
    });

    res.end(JSON.stringify(device, null, 2));
  }

  function handleNotFound(res) {
    res.writeHead(404, headers);
    res.end();
  }

  function handleWrongHeader(res) {
    res.writeHead(405, headers);
    res.end();
  }
};
