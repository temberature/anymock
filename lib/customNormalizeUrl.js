const normalizeUrl = require('normalize-url');

function customNormalizeUrl(url) {
    return normalizeUrl(url, {
        stripProtocol: true,
        stripWWW: false
    });
}

module.exports = customNormalizeUrl