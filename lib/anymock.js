#!/usr/bin/env node
const AnyProxy = require('anyproxy');
const fs = require('fs-extra')
const options = {
  port: 8001,
  rule: require('./anyproxy.config')(),
  webInterface: {
    enable: true,
    webPort: 8002
  },
  throttle: 10000,
  forceProxyHttps: true,
  wsIntercept: false, // 不开启websocket代理
  silent: false
};
if (process.argv[2] === 'init') {
  fs.copy(__dirname + '/../mock', process.cwd() + '/mock')
}
const proxyServer = new AnyProxy.ProxyServer(options);

proxyServer.on('ready', () => { /* */ });
proxyServer.on('error', (e) => { /* */ });
proxyServer.start();

//when finished
proxyServer.close();