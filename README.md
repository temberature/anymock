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

</div>

English | [简体中文](./docs/README-zh_CN.md)

## Getting Started

### Installing

```bash
npm install @tiandatong/anymock -g
```

### Usage

create a directory contains RESTAPI.config.json and RESTAPI.json

#### RESTAPI.config.json

```json
{
    "disabled": false,
    "configs": [{
        "URL": "//api.github.com/repos/temberature/anymock/branches",
        "OPTIONS": ["normal", "protected"],
        "choices": ["normal"]
    }]
}
```

#### RESTAPI.json

```json
[{
    "url": "//api.github.com/repos/temberature/anymock/branches",
    "options": {
        "normal": {
            "request": {
                "queries": {
                    "protected": "0"
                }
            },
            "body": [{
                "name": "master1",
                "commit": {
                    "sha": "51a0a39acfb1d029345e896cca6a6a2c3625816b",
                    "url": "https://api.github.com/repos/temberature/anymock/commits/51a0a39acfb1d029345e896cca6a6a2c3625816b"
                }
            }]
        },
        "protected": {
            "request": {
                "queries": {
                    "protected": "1"
                }
            },
            "body": {
                "message": "Not Found2",
                "documentation_url": "https://developer.github.com/v3/repos/branches/#list-branches"
            }
        }
    }
}]
```

run command below in the root dir

```bash
anymock
```

then you can request https://api.github.com/repos/temberature/anymock/branches?protected=0
and see the corresponding result

```json
[{
    "name": "master1",
    "commit": {
        "sha": "51a0a39acfb1d029345e896cca6a6a2c3625816b",
        "url": "https://api.github.com/repos/temberature/anymock/commits/51a0a39acfb1d029345e896cca6a6a2c3625816b"
    }
}]
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
