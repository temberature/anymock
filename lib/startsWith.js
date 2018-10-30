const fs = require("fs");
const removeProtocal = require('./removeProtocal')

function startsWith(url, pattern) {
    return removeProtocal(url).startsWith(removeProtocal(pattern));
}

module.exports = startsWith