function createRes(callbackName, mockMap) {
    var body = mockMap.body,
        type = mockMap["Content-Type"];
    var rt, jsonp;
    if (callbackName) {
        jsonp = callbackName + "(" + JSON.stringify(body) + ");";
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
            "Content-Type": type || "text/plain",
            "Access-Control-Allow-Origin": "*"
        },
        body: rt
    };
}

module.exports = createRes