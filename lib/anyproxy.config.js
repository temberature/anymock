const {
  URL,
  URLSearchParams
} = require('url');
const mock = require('./mock');

module.exports = function () {
  return {
    summary: "a rule to hack response",
    * beforeSendRequest(requestDetail) {

      const url = new URL(requestDetail.url);
      const searchParams = url.searchParams;
      const callback = searchParams.get('callback') || new URLSearchParams(requestDetail.requestData.toString()).get('callback');

      let rt = mock(url.href, searchParams, callback)
      
      if (rt && rt.match) {
        rt.response.header["Access-Control-Allow-Origin"] = requestDetail.requestOptions.headers["Origin"] || "*"
        rt.response.header["Access-Control-Allow-Credentials"] = true
        rt.response.header["Access-Control-Allow-Headers"] = "platform"
        return {
          response: rt.response
        };
      }
    },
    * beforeSendResponse(requestDetail, responseDetail) {
      // console.log(requestDetail.requestOptions.headers["Origin"]);
      const newResponse = responseDetail.response;
      if (!newResponse.header["Access-Control-Allow-Origin"] && !newResponse.header["access-control-allow-origin"]) {
        newResponse.header["Access-Control-Allow-Origin"] = requestDetail.requestOptions.headers["Origin"] || "*";
      }
      return {
        response: newResponse
      };
    }
  };
}