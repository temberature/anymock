const removeProtocol = require('../lib/removeProtocol')
const URLS = {
    goldNotLogin: 'http://i.vip.iqiyi.com/client/store/pc/checkout.action?platform=b6c13e26323c537d&pid=a0226bd958843452&fs=&fsSign=&fc=a03a512fefb9eaf7&fv=&qc005=f1c1ee7ebee4b600f12d153351a38e48&vipType=1&aid=&P00001=&callback=window.jsonp_07077807149559778',
    goldLogin: 'http://i.vip.iqiyi.com/client/store/pc/checkout.action?platform=b6c13e26323c537d&pid=a0226bd958843452&fs=&fsSign=&fc=a03a512fefb9eaf7&fv=&qc005=f1c1ee7ebee4b600f12d153351a38e48&vipType=1&aid=&P00001=1el6tTVC2n4q6CVz3zbaLTBr7l0fnDm10IjRLWyNOQGSIT89QqcC1tbYnNlqeXlb5m2gd9&callback=window.jsonp_06267915858114745',
    diamondNotLogin: 'http://i.vip.iqiyi.com/client/store/pc/checkout.action?platform=b6c13e26323c537d&pid=adb3376b039b970b&fs=&fsSign=&fc=a03a512fefb9eaf7&fv=&qc005=1fdc266662b4dc9cc0a117f6d9a745ec&vipType=4&aid=&P00001=&callback=window.jsonp_04902291049807801',
    diamondLogin: 'http://i.vip.iqiyi.com/client/store/pc/checkout.action?platform=b6c13e26323c537d&pid=adb3376b039b970b&fs=&fsSign=&fc=a03a512fefb9eaf7&fv=&qc005=f1c1ee7ebee4b600f12d153351a38e48&vipType=4&aid=&P00001=1el6tTVC2n4q6CVz3zbaLTBr7l0fnDm10IjRLWyNOQGSIT89QqcC1tbYnNlqeXlb5m2gd9&callback=window.jsonp_020797424733475012'
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