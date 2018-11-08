const fs = require("fs");
const removeProtocol = require('./removeProtocol')

function startsWith(url, pattern) {
    return removeProtocol(url).startsWith(removeProtocol(pattern));
}

module.exports = startsWith