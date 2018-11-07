"use strict";
const {
    URL,
    URLSearchParams
} = require('url');
const fs = require("fs");
const removeProtocal = require('../lib/removeProtocal')
const fileMock = require("../lib/fileMock");

describe("fileMock", () => {
    it("js file", () => {
        const URLO = new URL('http://static.iqiyi.com/js/lib/sea1.2.js');
        const myURL = removeProtocal(URLO.href);
        const searchParams = URLO.searchParams;
        const callbackName = searchParams.get('callback');
        expect(fileMock(myURL, searchParams, callbackName)).toBeUndefined();
    });
    it("css file", () => {
        const URLO = new URL('http://static.qiyi.com/css/common/v3-vipCash/vip_cash1.0.css');
        const myURL = removeProtocal(URLO.href);
        const searchParams = URLO.searchParams;
        const callbackName = searchParams.get('callback');
        expect(fileMock(myURL, searchParams, callbackName)).toBeUndefined();
    });
});