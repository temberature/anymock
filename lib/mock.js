const createRes = require('./createRes')
const startsWith = require('./startsWith')
const is = require('is-type-of');
const path = require('path');
const fs = require("fs");
const glob = require("glob")
const loadJsonFile = require('load-json-file');
const normalizeUrl = require('./customNormalizeUrl');

const contentTypeMap = {
    '.js': 'application/javascript',
    '.css': 'text/css'
}

function mock(url, searchParams, callbackName) {
    let match, response;
    const mocks = glob.sync('./mock/*.config.json').reduce((mocks, filePath) => {
        const FILE_CONFIG = loadJsonFile.sync(filePath);
        if (!FILE_CONFIG.disabled) {
            return mocks.concat(FILE_CONFIG.mocks)
        } else {
            return mocks
        }
    }, [])

    if (mocks.length < 1) {
        return;
    }
    const matchMock = mocks.filter(mock => {
        return startsWith(url, mock.URL || mock.url);
    })[0];
    if (!matchMock || matchMock.enabled === 0 || matchMock.enabled === '') {
        return;
    }
    const matchURL = normalizeUrl(matchMock.URL || matchMock.url);
    let enabled = matchMock.enabled
    if (is.string(enabled)) {
        enabled = [enabled]
    } 
    if (is.string(enabled[0]) && enabled[0].includes('/')) {
        let body = enabled.reduce((a, local) => {
            if (fs.existsSync(local)) {
                return a +  fs.readFileSync(local, {
                    encoding: "utf-8"
                })  + '\n'
            } else {
                throw new Error('local file not exists ' + local)
            }
            
        }, '')
        if (body) {
            match = true;
            response = {
                statusCode: 200,
                header: {
                    "Content-Type": contentTypeMap[path.extname(enabled[0])] || 'text/plain',
                },
                body: body
            };
        }
    } else {
        const MOCKS = loadJsonFile.sync("./mock/mocks.json");
        match = MOCKS.some(MOCK => {
            if (matchURL === normalizeUrl(MOCK.url || MOCK.URL)) {
                // console.log(MOCK);
                if (Array.isArray(matchMock.enabled)) {
                    const choice = matchMock.enabled.filter(choice => isQueryMatch(MOCK[choice], searchParams))[0];
                    const option = MOCK[choice];
                    // console.log(option);
                    if (!option) {
                        return;
                    }
                    if (isQueryMatch(option, searchParams)) {
                        response = createRes(callbackName, option);
                        return true;
                    }
                    if (option.request) {
                        return false;
                    }

                } else {
                    const option = MOCK.default
                    if (option) {
                        response = createRes(callbackName, option)
                        return true
                    }
                }
            }
        });
    }

    return {
        match,
        response
    }
}

function isQueryMatch(option, searchParams) {
    return !option.request ||
        !option.request.queries ||
        Object.entries(option.request.queries).every(
            query => {
                const received = searchParams.get(query[0]);
                return query[1] === received || (query[1] === 1 && received) || (query[1] === 0 && !received)
            }
        )
}

module.exports = mock