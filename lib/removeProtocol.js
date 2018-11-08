function removeProtocol(url) {
    return url.replace(/(^\w+:|^)\/\//, '');
}

module.exports = removeProtocol