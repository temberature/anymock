"use strict";
const {
    URL,
    URLSearchParams
} = require('url');
const removeProtocal = require('../lib/removeProtocal')
const getConfig = require('../lib/anyproxy.config')
const RESTAPIMock = require("../lib/RESTAPIMock");
const URLO = new URL('http://i.vip.iqiyi.com/client/store/pc/checkout.action?platform=b6c13e26323c537d&pid=a0226bd958843452&fs=&fsSign=&fc=a03a512fefb9eaf7&fv=&qc005=ee3dc1362b22680c6bc6af43931650a8&vipType=1&aid=&P00001=50AIWkGubnxCHgI96u5jpLV7P2AqF2ZzY1JEbtrAjthkx0oxcQWNqm2grZwm3q5BZAVAf0&callback=jsonp_05611606862977503');
const myURL = removeProtocal(URLO.href);
const searchParams = URLO.searchParams;
const callbackName = searchParams.get('callback');
const config = getConfig();

describe("anyproxy.config", () => {
    it("beforeSendRequest", () => {
        var result = config.beforeSendRequest({
            url: 'http://i.vip.iqiyi.com/client/store/pc/checkout.action?platform=b6c13e26323c537d&pid=a0226bd958843452&fs=&fsSign=&fc=a03a512fefb9eaf7&fv=&qc005=ee3dc1362b22680c6bc6af43931650a8&vipType=1&aid=&P00001=50AIWkGubnxCHgI96u5jpLV7P2AqF2ZzY1JEbtrAjthkx0oxcQWNqm2grZwm3q5BZAVAf0&callback=jsonp_05611606862977503',
            requestData: {}
        }).next();
        const rt = RESTAPIMock(myURL, searchParams, callbackName)
        expect(result.value).toEqual({
            response: rt.response
        });
    });
});