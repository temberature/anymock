"use strict";
const getConfig = require('../lib/anyproxy.config')
const RESTAPIMock = require("../lib/RESTAPIMock");
const getParas = require('./getParas')

describe("anyproxy.config", () => {
    it("beforeSendRequest diamondLoginMatched", () => {
        const config = getConfig();
        var result = config.beforeSendRequest({
            url: getParas('diamondLogin').splice(0, 1),
            requestData: {}
        }).next();
        const rt = RESTAPIMock(...getParas('diamondLogin').splice(1))
        expect(result.value).toEqual({
            response: rt.response
        });
    });
    it("beforeSendRequest goldNotLoginNotMatched", () => {
        const config = getConfig();
        var result = config.beforeSendRequest({
            url: getParas('goldNotLogin').splice(0, 1),
            requestData: {}
        }).next();
        expect(result.value).toBeUndefined();
    });
});