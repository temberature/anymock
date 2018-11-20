const normalizeUrl = require('../lib/customNormalizeUrl');

const URLS = {
    normal: 'https://api.github.com/repos/temberature/anymock/branches?protected=0',
    protected: 'https://api.github.com/repos/temberature/anymock/branches?protected=1'
}


module.exports = (type) => {
    const URLObj = new URL(URLS[type]);
    const myURL = normalizeUrl(URLObj.href);
    const searchParams = URLObj.searchParams;
    const callbackName = searchParams.get('callback');
    return [
        URLObj,
        myURL,
        searchParams,
        callbackName
    ]
}