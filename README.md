<h1 align="center">Anymock</h1>

<div align="center">

mock service base on [Anyproxy](https://www.npmjs.com/package/anyproxy).

[![Build Status](https://travis-ci.org/temberature/anymock.svg?branch=master)](https://travis-ci.org/temberature/anymock)
[![Codecov](https://img.shields.io/codecov/c/github/temberature/anymock/master.svg?style=flat-square)](https://codecov.io/gh/temberature/anymock/branch/master)
[![Dependencies](https://img.shields.io/david/temberature/anymock.svg)](https://david-dm.org/temberature/anymock)
[![DevDependencies](https://img.shields.io/david/dev/temberature/anymock.svg)](https://david-dm.org/temberature/anymock?type=dev)

[![npm package](https://img.shields.io/npm/v/@tiandatong/anymock.svg?style=flat-square)](https://www.npmjs.org/package/@tiandatong/anymock)
[![NPM downloads](http://img.shields.io/npm/dm/@tiandatong/anymock.svg?style=flat-square)](http://npmjs.com/@tiandatong/anymock)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/temberature/anymock.svg)](http://isitmaintained.com/project/temberature/anymock "Percentage of issues still open")
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
</div>

English | [简体中文](./docs/README-zh_CN.md)

## Features

* support https
* support jsonp and JSON API
* support resources replace(js\css etc.)

## Getting Started

### Installation

```bash
npm install @tiandatong/anymock -g
```

### Usage

run command below anywhere

```bash
λ anymock init
[AnyProxy Log][2018-11-15 12:35:52]: throttle :10000kb/s
[AnyProxy Log][2018-11-15 12:35:52]: clearing cache file...
[AnyProxy Log][2018-11-15 12:35:52]: ==>>> clearing cache
[AnyProxy Log][2018-11-15 12:35:52]: closing webserver...
[AnyProxy Log][2018-11-15 12:35:52]: Http proxy started on port 8001
[AnyProxy Log][2018-11-15 12:35:52]: Active rule is: a rule to hack response
```

* first run with 'init' will create a directory 'mock' contains *.config.json and mocks.json template(default api.config.json and file.config.json), and generate root cert
 
* trust the root cert
* configure chrome's proxy to http://127.0.0.1:8001 via [Proxy SwitchyOmega](https://chrome.google.com/webstore/detail/proxy-switchyomega/padekgcemlokbadohgkifijomclgjgif)
* then you can browse
* https://api.github.com/repos/temberature/anymock/branches?protected=0
* https://suggest.taobao.com/sug?code=utf-8&callback=KISSY.Suggest.callback&q=apple
* https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js
* and see the corresponding mock result

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

## Running the tests

Explain how to run the automated tests for this system

### Break down into end to end tests

Explain what these tests test and why

```bash
npm test
```

## Development

```bash
git clone https://github.com/temberature/anymock.git
cd anymock
npm install
npm start
```

## Built With

* [Anyproxy](https://www.npmjs.com/package/anyproxy)

## Contributing

Please read [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Inspiration: [moco](https://github.com/dreamhead/moco),[wiremock](https://github.com/tomakehurst/wiremock)
