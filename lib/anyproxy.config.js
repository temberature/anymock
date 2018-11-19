const {
  URL,
  URLSearchParams
} = require('url');
const R = require('ramda');
const removeProtocol = require('./removeProtocol')
const mock = require('./mock');

module.exports = function () {
  return {
    summary: "a rule to hack response",
    * beforeSendRequest(requestDetail) {

      const url = new URL(requestDetail.url);
      const searchParams = url.searchParams;
      const callback = searchParams.get('callback') || new URLSearchParams(requestDetail.requestData.toString()).get('callback');

      const rt = mock(removeProtocol(url.href), searchParams, callback)
      if (rt && rt.match) {
        return {
          response: rt.response
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