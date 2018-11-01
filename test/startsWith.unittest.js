"use strict";

const startsWith = require("../lib/startsWith");

describe("startsWith", () => {
    it("matched", () => {
        expect(startsWith('http://www.abc.com/', 'http://www')).toBe(true);
    });
    it("no matched", () => {
        expect(startsWith('https://www.abc.com/def', 'http://subdomain.')).toBe(false);
    });
});