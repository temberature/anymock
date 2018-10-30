var fs = require("fs");
var path = require('path');

var contentTypeMap = {
  '.js': 'application/javascript',
  '.css': 'text/css'
}
module.exports = {
  summary: "a rule to hack response",
  * beforeSendRequest(requestDetail) {
    var url = removeProtocal(requestDetail.url);
    var query = url.split("?")[1] || "";

    var pars = parse_query_string(query);
    const callback =
      pars.callback ||
      parse_query_string(requestDetail.requestData.toString()).callback;
    let response;
    const RESTAPIS = getJSON("./mock/RESTAPI.json");
    const RESTAPISConfig = getJSON("./mock/RESTAPI.config.json");
    let match;
    if (RESTAPISConfig.disabled) {
      const matchConfig = RESTAPISConfig.configs.filter(config => {
        return url.startsWith(removeProtocal(config.URL));
      })[0];
      if (matchConfig && matchConfig.choices !== 0) {
        const matchURL = removeProtocal(matchConfig.URL);
        match = RESTAPIS.some(RESTAPI => {
          if (matchURL === removeProtocal(RESTAPI.url)) {
            // console.log(RESTAPI);
            if (matchConfig.OPTIONS) {
              const choice = matchConfig.choices.filter(choice => {
                console.log(matchURL, RESTAPI.options, choice);
                const option = RESTAPI.options[choice];
                return !option.needPars || pars[option.needPars];
              })[0];
              const option = RESTAPI.options[choice];
              // console.log(option);
              if (!option) {
                return;
              }
              if (!option.needPars || pars[option.needPars]) {
                response = createRes(callback, option);
                return true;
              }
            } else {
              if (!RESTAPI.needPars || pars[RESTAPI.needPars]) {
                response = createRes(callback, RESTAPI);
                return true;
              }
            }
          }
        });
      }
    }


    if (!match) {
      const filemap = new Map(Object.entries(getJSON("./mock/filemap.json")));
      if (filemap.disabled) {
        filemap.map.forEach((local, online) => {
          // console.log(online, url.startsWith(removeProtocal(online)));
          if (url.startsWith(removeProtocal(online))) {
            match = true;
            response = {
              statusCode: 200,
              header: {
                "Content-Type": contentTypeMap[path.extname(local)],
              },
              body: fs.readFileSync(local, {
                encoding: "utf-8"
              })
            };
            // console.log(response);
          }
        })
      }

    }
    // console.log(match);
    if (match) {
      return {
        response: response
      };
    }
  },
  * beforeSendResponse(requestDetail, responseDetail) {
    // console.log(requestDetail.requestOptions.headers["Origin"]);
    const newResponse = responseDetail.response;
    newResponse.header["Access-Control-Allow-Origin"] = requestDetail.requestOptions.headers["Origin"] || "*";
    return {
      response: newResponse
    };
  }
};

function createRes(callback, mockMap) {
  var body = mockMap.body,
    type = mockMap["Content-Type"];
  var rt, jsonp;
  if (callback && type !== "text/plain") {
    jsonp = callback + "(" + JSON.stringify(body) + ");";
    if (type === "text/html") {
      rt =
        '<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><script type="text/javascript">		document.domain="iqiyi.com";		window.parent.' +
        jsonp +
        "</script></head><body></body></html>";
    } else {
      rt = jsonp;
    }
  } else if (!type) {
    rt = JSON.stringify(body);
  } else {
    rt = body;
  }
  return {
    statusCode: 200,
    header: {
      "Content-Type": type || "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: rt
  };
}

function removeProtocal(url) {
  return url.split('//')[1];
}

function getJSON(path) {
  return JSON.parse(fs.readFileSync(path, {
    encoding: "utf-8"
  }));
}

function parse_query_string(query) {
  var vars = query.split("&");
  var query_string = {};
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    var key = decodeURIComponent(pair[0]);
    var value = decodeURIComponent(pair[1]);
    // If first entry with this name
    if (typeof query_string[key] === "undefined") {
      query_string[key] = decodeURIComponent(value);
      // If second entry with this name
    } else if (typeof query_string[key] === "string") {
      var arr = [query_string[key], decodeURIComponent(value)];
      query_string[key] = arr;
      // If third or later entry with this name
    } else {
      query_string[key].push(decodeURIComponent(value));
    }
  }
  return query_string;
}