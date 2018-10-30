function removeProtocal(url) {
    return url.replace(/(^\w+:|^)\/\//, '');
}

module.exports = removeProtocal