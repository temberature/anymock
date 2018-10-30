const fs = require("fs");

function getJSON(path) {
    return JSON.parse(fs.readFileSync(path, {
        encoding: "utf-8"
    }));
}

module.exports = getJSON