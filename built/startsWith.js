const normalizeUrl = require('./customNormalizeUrl');
function startsWith(url, pattern) {
    return normalizeUrl(url).startsWith(normalizeUrl(pattern));
}
module.exports = startsWith;
