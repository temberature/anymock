import * as MockMap from './MockMap';

interface Response {}

function createRes(callbackName: string, mockMap: MockMap): Response {
  var body = mockMap.body,
    type = mockMap['Content-Type'];
  var rt, jsonp;
  if (callbackName) {
    jsonp = callbackName + '(' + JSON.stringify(body) + ')';
    if (type === 'text/html') {
      rt = mockMap.fileHead + jsonp + mockMap.fileFooter;
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
      'Content-Type': type || 'text/plain',
      'Access-Control-Allow-Origin': '*'
    },
    body: rt
  };
}

export default createRes;
