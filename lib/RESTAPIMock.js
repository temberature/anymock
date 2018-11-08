const getJSON = require('./getJSON')
const createRes = require('./createRes')
const startsWith = require('./startsWith')
const removeProtocol = require('./removeProtocol')

function RESTAPIMock(myURL, searchParams, callbackName) {
    let match, response;
    const RESTAPISConfig = getJSON("./mock/RESTAPI.config.json");
    if (RESTAPISConfig.disabled) {
        return;
    }
    const matchConfig = RESTAPISConfig.configs.filter(config => {
        return startsWith(myURL, config.URL);
    })[0];
    if (!matchConfig || matchConfig.choices === 0) {
        return;
    }
    const matchURL = removeProtocol(matchConfig.URL);
    const RESTAPIS = getJSON("./mock/RESTAPI.json");
    match = RESTAPIS.some(RESTAPI => {
        if (matchURL === removeProtocol(RESTAPI.url)) {
            // console.log(RESTAPI);
            if (matchConfig.OPTIONS) {
                const choice = matchConfig.choices.filter(choice => {
                    // console.log(matchURL, RESTAPI.options, choice);
                    const option = RESTAPI.options[choice];
                    return (!option.needPars || searchParams.get(option.needPars)) && isQueryMatch(option, searchParams);
                })[0];
                const option = RESTAPI.options[choice];
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
                if (!option.needPars || searchParams.get(option.needPars)) {
                    response = createRes(callbackName, option);
                    return true;
                }

            } else {
                if (!RESTAPI.needPars || searchParams.get(RESTAPI.needPars)) {
                    response = createRes(callbackName, RESTAPI);
                    return true;
                }
            }
        }
    });
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

module.exports = RESTAPIMock