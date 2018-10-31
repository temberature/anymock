const fs = require("fs");
const path = require('path');
const getJSON = require('./getJSON')
const startsWith = require('./startsWith')
const contentTypeMap = {
    '.js': 'application/javascript',
    '.css': 'text/css'
}

function objectToMap(o) {
    let m = new Map()
    for (let k of Object.keys(o)) {
        if (o[k] instanceof Object) {
            m.set(k, objectToMap(o[k]))
        } else {
            m.set(k, o[k])
        }
    }
    return m
}

function fileMock(myURL, searchParams, callback) {
    let match, response;
    const filemap = objectToMap(getJSON("./mock/filemap.json"));
    if (filemap.get('disabled')) {
        return
    }
    filemap.get('map').forEach((local, online) => {
        // console.log(online, url.startsWith(removeProtocal(online)));
        if (startsWith(myURL, online)) {
            if (fs.existsSync(local)) {
                match = true;
                response = {
                    statusCode: 200,
                    header: {
                        "Content-Type": contentTypeMap[path.extname(local)],
                    },
                    body: fs.readFileSync(local, {
                        encoding: "utf-8"
                    })
                };
            } else {
                throw new Error('local file not exists ' + local)
            }
        }
    })
    return {
        match,
        response
    }
}

module.exports = fileMock