<h1 align="center">Anymock</h1>

<div align="center">

基于[Anyproxy](https://www.npmjs.com/package/anyproxy) 的mock 服务.

[![Build Status](https://travis-ci.org/temberature/anymock.svg?branch=master)](https://travis-ci.org/temberature/anymock)
[![Codecov](https://img.shields.io/codecov/c/github/temberature/anymock/master.svg?style=flat-square)](https://codecov.io/gh/temberature/anymock/branch/master)
[![Dependencies](https://img.shields.io/david/temberature/anymock.svg)](https://david-dm.org/temberature/anymock)
[![DevDependencies](https://img.shields.io/david/dev/temberature/anymock.svg)](https://david-dm.org/temberature/anymock?type=dev)

[![npm package](https://img.shields.io/npm/v/@tiandatong/anymock.svg?style=flat-square)](https://www.npmjs.org/package/@tiandatong/anymock)
[![NPM downloads](http://img.shields.io/npm/dm/@tiandatong/anymock.svg?style=flat-square)](http://npmjs.com/@tiandatong/anymock)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/temberature/anymock.svg)](http://isitmaintained.com/project/temberature/anymock "Percentage of issues still open")
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
</div>

[English](./README.md) | 简体中文

## 起步

### 安装

```bash
npm install @tiandatong/anymock -g
```

### 用法

```bash
λ anymock init
[AnyProxy Log][2018-11-15 12:35:52]: throttle :10000kb/s
[AnyProxy Log][2018-11-15 12:35:52]: clearing cache file...
[AnyProxy Log][2018-11-15 12:35:52]: ==>>> clearing cache
[AnyProxy Log][2018-11-15 12:35:52]: closing webserver...
[AnyProxy Log][2018-11-15 12:35:52]: Http proxy started on port 8001
[AnyProxy Log][2018-11-15 12:35:52]: Active rule is: a rule to hack response
```

* 自动创建一个名为mock 的目录， 其中包含*.config.json 和 mocks.json 配置模板
 (默认 api.config.json 和 file.config.json)

* 通过[Proxy SwitchyOmega](https://chrome.google.com/webstore/detail/proxy-switchyomega/padekgcemlokbadohgkifijomclgjgif)把Chrome 的代理配置为http://127.0.0.1:8001
* 然后分别访问
* https://api.github.com/repos/temberature/anymock/branches?protected=0 
* https://suggest.taobao.com/sug?code=utf-8&callback=KISSY.Suggest.callback&q=apple
* https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js
* 你就可以看到相应的mock 结果了。

```json
[{
    "name": "master1",
    "commit": {
        "sha": "51a0a39acfb1d029345e896cca6a6a2c3625816b",
        "url": "https://api.github.com/repos/temberature/anymock/commits/51a0a39acfb1d029345e896cca6a6a2c3625816b"
    }
}]
```

```json
KISSY.Suggest.callback(
{
    "result": [
        [
            "apple watch4",
            "14770"
        ],
        [
            "apple pencil",
            "12500"
        ]
    ],
    "shop": "apple",
    "tmall": "apple"
}
)
```

```js
//uncompressed jquery
```

## 测试

```bash
npm test
```

## 开发

```bash
git clone https://github.com/temberature/anymock.git
cd anymock
npm install
npm start
```

## 基础库

* [Anyproxy](https://www.npmjs.com/package/anyproxy)

## 贡献

Please read [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## 版本化

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

## 协议

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## 致谢

* Inspiration: [moco](https://github.com/dreamhead/moco),[wiremock](https://github.com/tomakehurst/wiremock)
