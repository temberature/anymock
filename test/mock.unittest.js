"use strict";
const createRes = require('../lib/createRes')
const mock = require("../lib/mock");
const getParas = require('./getParas')
const normalMockMap = {
    "request": {
        "queries": {
            "protected": "0"
        }
    },
    "body": [{
        "name": "master1",
        "commit": {
            "sha": "51a0a39acfb1d029345e896cca6a6a2c3625816b",
            "url": "https://api.github.com/repos/temberature/anymock/commits/51a0a39acfb1d029345e896cca6a6a2c3625816b"
        }
    }]
}
describe("mock", () => {
    it("normal matched", () => {
        const [url, ...paras] = getParas('normal');
        expect(mock(...paras)).toEqual({
            match: true,
            response: createRes(paras[2], normalMockMap)
        });
    });
    it("protected notMatched", () => {
        expect(mock(...getParas('protected').splice(1))).toEqual({
            match: false,
            response: undefined
        });
    });
});