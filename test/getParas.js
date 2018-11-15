const removeProtocol = require('../lib/removeProtocol')
const URLS = {
    normal: 'https://api.github.com/repos/temberature/anymock/branches?protected=0',
    protected: 'https://api.github.com/repos/temberature/anymock/branches?protected=1'
}


module.exports = (type) => {
    const URLO = new URL(URLS[type]);
    const myURL = removeProtocol(URLO.href);
    const searchParams = URLO.searchParams;
    const callbackName = searchParams.get('callback');
    return [
        URLO,
        myURL,
        searchParams,
        callbackName
    ]
}