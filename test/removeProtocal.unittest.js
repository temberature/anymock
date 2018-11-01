"use strict";

const removeProtocal = require("../lib/removeProtocal");

describe("removeProtocal", () => {
    it("remove http url", () => {
        expect(removeProtocal('http://www.abc.com/')).toMatch("www.abc.com");
    });
    it("remove https url", () => {
        expect(removeProtocal('https://www.abc.com/def')).toMatch("www.abc.com/def");
    });
    it("remove removed url", () => {
        expect(removeProtocal('//www.abc.com/def?query=string')).toMatch("www.abc.com/def?query=string");
    });
    it("invalid url", () => {
        expect(removeProtocal('abc')).toMatch("");
    });
});