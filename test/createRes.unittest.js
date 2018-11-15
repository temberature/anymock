"use strict";

const createRes = require("../lib/createRes");
const getJSON = require("../lib/getJSON");

const sampleJSON = getJSON('./test/sample.json')
const sampleJSONStr = JSON.stringify(sampleJSON);
const fileHead = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><script type="text/javascript">		document.domain="iqiyi.com";		window.parent.';
const fileFooter = "</script></head><body></body></html>";

describe("createRes", () => {
    it("has callbackName, no Content-Type", () => {
        const Received = createRes('callbackName', {
            body: sampleJSON
        })
        const Expected = {
            statusCode: 200,
            header: {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin": "*"
            },
            body: "callbackName(" + sampleJSONStr + ")"
        }
        expect(Received).toEqual(Expected);
    });
    it("has callbackName, Content-Type = text/html", () => {
        expect(createRes('callbackName', {
            "Content-Type": "text/html",
            body: sampleJSON,
            "fileHead": fileHead,
            "fileFooter": fileFooter
        })).toEqual({
            statusCode: 200,
            header: {
                "Content-Type": "text/html",
                "Access-Control-Allow-Origin": "*"
            },
            body: fileHead + "callbackName(" + sampleJSONStr + ")" + fileFooter
        });
    });
    it("no callbackName, no Content-Type", () => {
        const Received = createRes(null, {
            body: sampleJSON
        })
        const Expected = {
            statusCode: 200,
            header: {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin": "*"
            },
            body: sampleJSONStr
        }
        expect(Received).toEqual(Expected);
    });
});