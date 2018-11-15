"use strict";
const {
    URL,
    URLSearchParams
} = require('url');
const fs = require("fs");
const removeProtocol = require('../lib/removeProtocol')
const fileMock = require("../lib/fileMock");

describe("fileMock", () => {
    it("js file", () => {
        const URLO = new URL('https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js');
        const myURL = removeProtocol(URLO.href);
        const searchParams = URLO.searchParams;
        const callbackName = searchParams.get('callback');
        expect(fileMock(myURL, searchParams, callbackName)).toBeUndefined();
    });
    it("css file", () => {
        const URLO = new URL('https://cdn.bootcss.com/twitter-bootstrap/4.1.3/css/bootstrap.min.css');
        const myURL = removeProtocol(URLO.href);
        const searchParams = URLO.searchParams;
        const callbackName = searchParams.get('callback');
        expect(fileMock(myURL, searchParams, callbackName)).toBeUndefined();
    });
});