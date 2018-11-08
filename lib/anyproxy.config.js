const {
  URL,
  URLSearchParams
} = require('url');
const R = require('ramda');
const removeProtocol = require('./removeProtocol')
const RESTAPIMock = require('./RESTAPIMock');
const fileMock = require('./fileMock');

module.exports = function () {
  return {
    summary: "a rule to hack response",
    * beforeSendRequest(requestDetail) {

      const url = new URL(requestDetail.url);
      const myURL = removeProtocol(url.href);
      // console.log(url.searchParams);
      const searchParams = url.searchParams;
      const callback = searchParams.get('callback') || new URLSearchParams(requestDetail.requestData.toString()).get('callback');

      const chain = [RESTAPIMock, fileMock];

      let match = false,
        response;
      chain.some(Mock => {
        const rt = Mock(myURL, searchParams, callback)
        if (rt && rt.match) {
          match = true;
          response = rt.response;
          return true;
        }
      })
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
}