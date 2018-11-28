#!/usr/bin/env node
import * as AnyProxy from 'anyproxy';
const fs = require('fs-extra');
const glob = require('glob');
const loadJsonFile = require('load-json-file');
const validator = require('is-my-json-valid');
const exec = require('child_process').exec;

if (process.argv[2] === 'init') {
  fs.copy(__dirname + '/../mock', process.cwd() + '/mock');
  if (!AnyProxy.utils.certMgr.ifRootCAFileExists()) {
    AnyProxy.utils.certMgr.generateRootCA((error, keyPath) => {
      // let users to trust this CA before using proxy
      if (!error) {
        const certDir = require('path').dirname(keyPath);
        console.log('The cert is generated at', certDir);
        const isWin = /^win/.test(process.platform);
        if (isWin) {
          exec('start .', { cwd: certDir });
        } else {
          exec('open .', { cwd: certDir });
        }
      } else {
        console.error('error when generating rootCA', error);
      }
    });
  }
}

glob.sync('./mock/*.json').some(filePath => {
  const FILE_CONFIG = loadJsonFile.sync(filePath);
  if (!validator(FILE_CONFIG)) {
    throw new Error('invalid ' + filePath);
  }
});

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
const proxyServer = new AnyProxy.ProxyServer(options);

proxyServer.on('ready', () => {
  /* */
});
proxyServer.on('error', e => {
  /* */
});
proxyServer.start();

//when finished
proxyServer.close();
