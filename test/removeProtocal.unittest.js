"use strict";

const removeProtocol = require("../lib/removeProtocol");

describe("removeProtocol", () => {
    it("remove http url", () => {
        expect(removeProtocol('http://www.abc.com/')).toMatch("www.abc.com");
    });
    it("remove https url", () => {
        expect(removeProtocol('https://www.abc.com/def')).toMatch("www.abc.com/def");
    });
    it("remove removed url", () => {
        expect(removeProtocol('//www.abc.com/def?query=string')).toMatch("www.abc.com/def?query=string");
    });
    it("invalid url", () => {
        expect(removeProtocol('abc')).toMatch("");
    });
});