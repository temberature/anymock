"use strict";
const getConfig = require('../lib/anyproxy.config')
const mock = require("../lib/mock");
const getParas = require('./getParas')

describe("anyproxy.config", () => {
    it("beforeSendRequest normalMatched", () => {
        const config = getConfig();
        var result = config.beforeSendRequest({
            url: getParas('normal').splice(0, 1),
            requestData: {},
            requestOptions: {
                headers: {}
            }
        }).next();
        const rt = mock(...getParas('normal').splice(1))
        rt.response.header["Access-Control-Allow-Origin"] = "*"
        rt.response.header["Access-Control-Allow-Credentials"] = true
        rt.response.header["Access-Control-Allow-Headers"] = "platform"
        expect(result.value).toEqual({
            response: rt.response
        });
    });
    it("beforeSendRequest protectedNotMatched", () => {
        const config = getConfig();
        var result = config.beforeSendRequest({
            url: getParas('protected').splice(0, 1),
            requestData: {}
        }).next();
        expect(result.value).toBeUndefined();
    });
});