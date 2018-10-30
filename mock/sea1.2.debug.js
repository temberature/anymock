//seaJs重复引用检测
if(!window.seajs){


 /**
 * Sea.js 2.2.1 | seajs.org/LICENSE.md
 */
(function(global, undefined) {

    // Avoid conflicting when `sea.js` is loaded multiple times
    if (global.seajs) {
        return ;
    }
    
    var seajs = global.seajs = {
        // The current version of Sea.js being used
        version: "2.2.1"
    };
    
    var data = seajs.data = {};


    /**
 * util-lang.js - The minimal language enhancement
 */
    
    function isType(type) {
        return function(obj) {
            return {}.toString.call(obj) == "[object " + type + "]";
        };
    }
    
    var isObject = isType("Object");
    var isString = isType("String");
    var isArray = Array.isArray || isType("Array");
    var isFunction = isType("Function");
    
    var _cid = 0;
    function cid() {
        return _cid++;
    }
    
    var firstModuleInPackage;
    var firstCache;
    if (document.attachEvent) {
        firstModuleInPackage = [];
        firstCache = {};
    }
    /**
 * util-events.js - The minimal events support
 */
    
    var events = data.events = {};

    // Bind event
    seajs.on = function(name, callback) {
        var list = events[name] || (events[name] = []);
        list.push(callback);
        return seajs;
    };

    // Remove event. If `callback` is undefined, remove all callbacks for the
    // event. If `event` and `callback` are both undefined, remove all callbacks
    // for all events
    seajs.off = function(name, callback) {
        // Remove *all* events
        if (!(name || callback)) {
            events = data.events = {};
            return seajs;
        }
        
        var list = events[name];
        if (list) {
            if (callback) {
                for (var i = list.length - 1; i >= 0; i--) {
                    if (list[i] === callback) {
                        list.splice(i, 1);
                    }
                }
            } else {
                delete events[name];
            }
        }
        
        return seajs;
    };

    // Emit event, firing all bound callbacks. Callbacks receive the same
    // arguments as `emit` does, apart from the event name
    var emit = seajs.emit = function(name, data) {
        var list = events[name], fn;
        
        if (list) {
            // Copy callback lists to prevent modification
            list = list.slice();

            // Execute event callbacks
            while ((fn = list.shift())) {
                fn(data);
            }
        }
        
        return seajs;
    };


    /**
 * util-path.js - The utilities for operating path such as id, uri
 */
    
    var DIRNAME_RE = /[^?#]*\//;
    
    var DOT_RE = /\/\.\//g;
    var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//;
    var DOUBLE_SLASH_RE = /([^:/])\/\//g;

    // Extract the directory portion of a path
    // dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
    // ref: http://jsperf.com/regex-vs-split/2
    function dirname(path) {
        return path.match(DIRNAME_RE)[0];
    }

    // Canonicalize a path
    // realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
    function realpath(path) {
        // /a/b/./c/./d ==> /a/b/c/d
        path = path.replace(DOT_RE, "/");

        // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
        while (path.match(DOUBLE_DOT_RE)) {
            path = path.replace(DOUBLE_DOT_RE, "/");
        }

        // a//b/c  ==>  a/b/c
        path = path.replace(DOUBLE_SLASH_RE, "$1/");
        
        return path;
    }

    // Normalize an id
    // normalize("path/to/a") ==> "path/to/a.js"
    // NOTICE: substring is faster than negative slice and RegExp
    function normalize(path) {
        var last = path.length - 1;
        var lastC = path.charAt(last);

        // If the uri ends with `#`, just return it without '#'
        if (lastC === "#") {
            return path.substring(0, last);
        }
        
        return (path.substring(last - 2) === ".js" ||
        path.indexOf("?") > 0 ||
        path.substring(last - 3) === ".css" ||
        lastC === "/") ? path : path + ".js";
    }
    
    
    var PATHS_RE = /^([^/:]+)(\/.+)$/;
    var VARS_RE = /{([^{]+)}/g;
    
    function parseAlias(id) {
        var alias = data.alias;
        return alias && isString(alias[id]) ? alias[id] : id;
    }
    
    function parsePaths(id) {
        var paths = data.paths;
        var m;
        
        if (paths && (m = id.match(PATHS_RE)) && isString(paths[m[1]])) {
            id = paths[m[1]] + m[2];
        }
        
        return id;
    }
    
    function parseVars(id) {
        var vars = data.vars;
        
        if (vars && id.indexOf("{") > -1) {
            id = id.replace(VARS_RE, function(m, key) {
                return isString(vars[key]) ? vars[key] : m;
            });
        }
        
        return id;
    }
    
    function parseMap(uri) {
        var map = data.map;
        var ret = uri;
        
        if (map) {
            for (var i = 0, len = map.length; i < len; i++) {
                var rule = map[i];
                
                ret = isFunction(rule) ?
                (rule(uri) || uri) :
                uri.replace(rule[0], rule[1]);

                // Only apply the first matched rule
                if (ret !== uri) {
                    break;
                }
            }
        }
        
        return ret;
    }
    
    
    var ABSOLUTE_RE = /^\/\/.|:\//;
    var ROOT_DIR_RE = /^.*?\/\/.*?\//;
    
    function addBase(id, refUri) {
        var ret;
        var first = id.charAt(0);

        // Absolute
        if (ABSOLUTE_RE.test(id)) {
            ret = id;
        }
        // Relative
        else if (first === ".") {
            ret = realpath((refUri ? dirname(refUri) : data.cwd) + id);
        }
        // Root
        else if (first === "/") {
            var m = data.cwd.match(ROOT_DIR_RE);
            ret = m ? m[0] + id.substring(1) : id;
        }
        // Top-level
        else {
            ret = data.base + id;
        }

        // Add default protocol when uri begins with "//"
        if (ret.indexOf("//") === 0) {
            ret = location.protocol + ret;
        }
        
        return ret;
    }
    
    function id2Uri(id, refUri) {
        if (!id) {
            return "";
        }

        id = parseAlias(id);
        id = parsePaths(id);
        id = parseVars(id);
        id = normalize(id);
        
        var uri = addBase(id, refUri);
        uri = parseMap(uri);
        
        return uri;
    }
    
    
    var doc = document;
    var cwd = dirname(doc.URL);
    var scripts = doc.scripts;

    // Recommend to add `seajsnode` id for the `sea.js` script element
    var loaderScript = doc.getElementById("seajsnode") ||
    scripts[scripts.length - 1];
    
    function getScriptAbsoluteSrc(node) {
        return node.hasAttribute ?  // non-IE6/7
        node.src :
        // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
        node.getAttribute("src", 4);
    }

    // When `sea.js` is inline, set loaderDir to current working directory
    var loaderDir = dirname(getScriptAbsoluteSrc(loaderScript) || cwd);

    // For Developers
    seajs.resolve = id2Uri;


    /**
 * util-request.js - The utilities for requesting script and style files
 * ref: tests/research/load-js-css/test.html
 */
    
    var head = doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement;
    var baseElement = head.getElementsByTagName("base")[0];
    
    var IS_CSS_RE = /\.css(?:\?|$)/i;
    var currentlyAddingScript;
    var interactiveScript;

    // `onload` event is not supported in WebKit < 535.23 and Firefox < 9.0
    // ref:
    //  - https://bugs.webkit.org/show_activity.cgi?id=38995
    //  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
    //  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
    var isOldWebKit = +navigator.userAgent
    .replace(/.*(?:AppleWebKit|AndroidWebKit)\/(\d+).*/, "$1") < 536;
    
    
    function request(url, callback, charset) {
        var isCSS = IS_CSS_RE.test(url);
        var node = doc.createElement(isCSS ? "link" : "script");
        
        if (charset) {
            var cs = isFunction(charset) ? charset(url) : charset;
            if (cs) {
                node.charset = cs;
            }
        }
        
        addOnload(node, callback, isCSS, url);
        
        if (isCSS) {
            node.rel = "stylesheet";
            node.href = url;
        }
        else {
            node.async = true;
            node.src = url;
        }

        // For some cache cases in IE 6-8, the script executes IMMEDIATELY after
        // the end of the insert execution, so use `currentlyAddingScript` to
        // hold current node, for deriving url in `define` call
        currentlyAddingScript = node;

        // ref: #185 & http://dev.jquery.com/ticket/2709
        if (baseElement) {
            head.insertBefore(node, baseElement);
        } else {
            head.appendChild(node);
        }

        currentlyAddingScript = null;
    }
    
    function addOnload(node, callback, isCSS, url) {
        var supportOnload = "onload" in node;

        function onload() {
            // Ensure only run once and handle memory leak in IE
            node.onload = node.onerror = node.onreadystatechange = null;

            // Remove the script to reduce memory leak
            if (!isCSS && !data.debug) {
                head.removeChild(node);
            }

            // Dereference the node
            node = null;
            
            callback();
        }

        // for Old WebKit and Old Firefox
        if (isCSS && (isOldWebKit || !supportOnload)) {
            setTimeout(function() {
                pollCss(node, callback);
            }, 1); // Begin after node insertion
            return;
        }
        
        if (supportOnload) {
            node.onload = onload;
            node.onerror = function() {
                emit("error", {uri: url,node: node});
                onload();
            };
        } else {
            node.onreadystatechange = function() {
                if (/loaded|complete/.test(node.readyState)) {
                    onload();
                }
            };
        }
    }
    
    function pollCss(node, callback) {
        var sheet = node.sheet;
        var isLoaded;

        // for WebKit < 536
        if (isOldWebKit) {
            if (sheet) {
                isLoaded = true;
            }
        }
        // for Firefox < 9.0
        else if (sheet) {
            try {
                if (sheet.cssRules) {
                    isLoaded = true;
                }
            } catch (ex) {
                // The value of `ex.name` is changed from "NS_ERROR_DOM_SECURITY_ERR"
                // to "SecurityError" since Firefox 13.0. But Firefox is less than 9.0
                // in here, So it is ok to just rely on "NS_ERROR_DOM_SECURITY_ERR"
                if (ex.name === "NS_ERROR_DOM_SECURITY_ERR") {
                    isLoaded = true;
                }
            }
        }
        
        setTimeout(function() {
            if (isLoaded) {
                // Place callback here to give time for style rendering
                callback();
            } else {
                pollCss(node, callback);
            }
        }, 20);
    }
    
    function getCurrentScript() {
        if (currentlyAddingScript) {
            return currentlyAddingScript;
        }

        // For IE6-9 browsers, the script onload event may not fire right
        // after the script is evaluated. Kris Zyp found that it
        // could query the script nodes and the one that is in "interactive"
        // mode indicates the current script
        // ref: http://goo.gl/JHfFW
        if (interactiveScript && interactiveScript.readyState === "interactive") {
            return interactiveScript;
        }
        
        var scripts = head.getElementsByTagName("script");
        
        for (var i = scripts.length - 1; i >= 0; i--) {
            var script = scripts[i];
            if (script.readyState === "interactive") {
                interactiveScript = script;
                return interactiveScript;
            }
        }
    }


    // For Developers
    seajs.request = request;


    /**
 * util-deps.js - The parser for dependencies
 * ref: tests/research/parse-dependencies/test.html
 */
    
    var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g;
    var SLASH_RE = /\\\\/g;
    
    function parseDependencies(code) {
        var ret = [];
        
        code.replace(SLASH_RE, "")
        .replace(REQUIRE_RE, function(m, m1, m2) {
            if (m2) {
                ret.push(m2);
            }
        });
        
        return ret;
    }


    /**
 * module.js - The core of module loader
 */
    function Module(uri, deps) {
        this.uri = uri;
        this.dependencies = deps || [];
        this.exports = null;
        this.status = 0;

        // Who depends on me
        this._waitings = {};

        // The number of unloaded dependencies
        this._remain = 0;
    }
    
    var cachedMods = seajs.cache = {};
    var anonymousMeta;
    
    var fetchingList = {};
    var fetchedList = {};
    var callbackList = {};
    
    var STATUS = Module.STATUS = {
        // 1 - The `module.uri` is being fetched
        FETCHING: 1,
        // 2 - The meta data has been saved to cachedMods
        SAVED: 2,
        // 3 - The `module.dependencies` are being loaded
        LOADING: 3,
        // 4 - The module are ready to execute
        LOADED: 4,
        // 5 - The module is being executed
        EXECUTING: 5,
        // 6 - The `module.exports` is available
        EXECUTED: 6
    };

    // Resolve module.dependencies
    Module.prototype.resolve = function() {
        var mod = this;
        var ids = mod.dependencies;
        var uris = [];
        
        for (var i = 0, len = ids.length; i < len; i++) {
            uris[i] = Module.resolve(ids[i], mod.uri);
        }
        return uris;
    };

    // Load module.dependencies and fire onload when all done
    Module.prototype.load = function() {
        var mod = this;

        // If the module is being loaded, just wait it onload call
        if (mod.status >= STATUS.LOADING) {
            return ;
        }
        
        mod.status = STATUS.LOADING;

        // Emit `load` event for plugins such as combo plugin
        var uris = mod.resolve();
        emit("load", uris);
        
        var len = mod._remain = uris.length;
        var m;

        // Initialize modules and register waitings
        for (var i = 0; i < len; i++) {
            m = Module.get(uris[i]);
            
            if (m.status < STATUS.LOADED) {
                // Maybe duplicate: When module has dupliate dependency, it should be it's count, not 1
                m._waitings[mod.uri] = (m._waitings[mod.uri] || 0) + 1;
            } else {
                mod._remain--;
            }
        }
        
        if (mod._remain === 0) {
            mod.onload();
            return ;
        }

        // Begin parallel loading
        var requestCache = {};
        
        for (i = 0; i < len; i++) {
            m = cachedMods[uris[i]];
            
            if (m.status < STATUS.FETCHING) {
                m.fetch(requestCache);
            } else if (m.status === STATUS.SAVED) {
                m.load();
            }
        }

        // Send all requests at last to avoid cache bug in IE6-9. Issues#808
        for (var requestUri in requestCache) {
            if (requestCache.hasOwnProperty(requestUri)) {
                requestCache[requestUri]();
            }
        }
    };

    // Call this method when module is loaded
    Module.prototype.onload = function() {
        var mod = this;
        mod.status = STATUS.LOADED;
        if ((mod.callback === undefined) && (mod.factory === undefined)) {
            if (doc.attachEvent) {
                for (var i = 0, j = firstModuleInPackage.length; i < j; i++) {
                    if (mod.uri == firstModuleInPackage[i].origin) {
                        mod.referrer = firstModuleInPackage[i].uri;
                        break;
                    }
                }
            } else if (firstModuleInPackage) {
                mod.referrer = firstModuleInPackage.uri;
                firstModuleInPackage = null;
            }
        }
        if (mod.callback) {
            mod.callback();
        }

        // Notify waiting modules to fire onload
        var waitings = mod._waitings;
        var uri, m;
        
        for (uri in waitings) {
            if (waitings.hasOwnProperty(uri)) {
                m = cachedMods[uri];
                m._remain -= waitings[uri];
                if (m._remain === 0) {
                    m.onload();
                }
            }
        }

        // Reduce memory taken
        delete mod._waitings;
        delete mod._remain;
    };

    // Fetch a module
    Module.prototype.fetch = function(requestCache) {
        var mod = this;
        var uri = mod.uri;

        function sendRequest() {
            seajs.request(emitData.requestUri, emitData.onRequest, emitData.charset);
        }
        
        function onRequest() {
            delete fetchingList[requestUri];
            fetchedList[requestUri] = true;

            // Save meta data of anonymous module
            if (anonymousMeta) {
                Module.save(uri, anonymousMeta);
                anonymousMeta = null;
            }

            // Call callbacks
            var m, mods = callbackList[requestUri];
            delete callbackList[requestUri];
            while ((m = mods.shift())) {
                m.load();
            }
        }
        
        mod.status = STATUS.FETCHING;

        // Emit `fetch` event for plugins such as combo plugin
        var emitData = {uri: uri};
        emit("fetch", emitData);
        var requestUri = emitData.requestUri || uri;

        // Empty uri or a non-CMD module
        if (!requestUri || fetchedList[requestUri]) {
            mod.load();
            return ;
        }
        
        if (fetchingList[requestUri]) {
            callbackList[requestUri].push(mod);
            return ;
        }
        
        fetchingList[requestUri] = true;
        callbackList[requestUri] = [mod];

        // Emit `request` event for plugins such as text plugin
        emit("request", emitData = {
            uri: uri,
            requestUri: requestUri,
            onRequest: onRequest,
            charset: data.charset
        });
        
        if (!emitData.requested) {
            if (requestCache) {
                requestCache[emitData.requestUri] = sendRequest;
            } else {
                requestCache[emitData.requestUri] = sendRequest();
            }
        }
    };

    // Execute a module
    Module.prototype.exec = function() {
        var mod = this;

        // When module is executed, DO NOT execute it again. When module
        // is being executed, just return `module.exports` too, for avoiding
        // circularly calling
        if (mod.status >= STATUS.EXECUTING) {
            return mod.exports;
        }
        
        mod.status = STATUS.EXECUTING;

        // Create require
        var uri = mod.uri;
        
        function require(id) {
            return Module.get(require.resolve(id)).exec();
        }
        
        require.resolve = function(id) {
            return Module.resolve(id, uri);
        };
        
        require.async = function(ids, callback) {
            Module.use(ids, callback, uri + "_async_" + cid());
            return require;
        };

        // Exec factory
        var factory = mod.factory;
        
        var exports = isFunction(factory) ?
        factory(require, mod.exports = {}, mod) :
        factory;
        
        if (exports === undefined) {
            exports = mod.exports;
        }

        // Reduce memory leak
        delete mod.factory;
        
        mod.exports = exports;
        mod.status = STATUS.EXECUTED;

        // Emit `exec` event
        emit("exec", mod);
        
        return exports;
    };

    // Resolve id to uri
    Module.resolve = function(id, refUri) {
        // Emit `resolve` event for plugins such as text plugin
        var emitData = {id: id,refUri: refUri};
        emit("resolve", emitData);
        
        return emitData.uri || seajs.resolve(emitData.id, refUri);
    };

    // Define a module
    Module.define = function(id, deps, factory) {
        var argsLen = arguments.length;

        // define(factory)
        if (argsLen === 1) {
            factory = id;
            id = undefined;
        } else if (argsLen === 2) {
            factory = deps;

            // define(deps, factory)
            if (isArray(id)) {
                deps = id;
                id = undefined;
            }
            // define(id, factory)
            else {
                deps = undefined;
            }
        }

        // Parse dependencies according to the module factory code
        if (!isArray(deps) && isFunction(factory)) {
            deps = parseDependencies(factory.toString());
        }
        
        var meta = {
            id: id,
            uri: Module.resolve(id),
            deps: deps,
            factory: factory
        };

        // Try to derive uri in IE6-9 for anonymous modules
        if (!meta.uri && doc.attachEvent) {
            var script = getCurrentScript();
            
            if (script) {
                meta.uri = script.src;
            }

        // NOTE: If the id-deriving methods above is failed, then falls back
        // to use onload event to get the uri
        }

        // Emit `define` event, used in nocache plugin, seajs node version etc
        emit("define", meta);

        // meta.uri ? Module.save(meta.uri, meta) :
        //     // Save information for "saving" work in the script onload event
        //     anonymousMeta = meta
        var module;
        var origin;
        if (meta.uri) {
            module = Module.save(meta.uri, meta);
            // fixed qiyi ie get module bug
            if (doc.attachEvent) {
                origin = getCurrentScript();
                if (origin && !firstCache[origin.src]) {
                    firstCache[origin.src] = true;
                    module.origin = origin.src;
                    firstModuleInPackage.push(module);
                }
            } else if (!firstModuleInPackage) {
                firstModuleInPackage = module;
            }
        } else {
            anonymousMeta = meta;
        }
    };

    // Save meta data to cachedMods
    Module.save = function(uri, meta) {
        var mod = Module.get(uri);

        // Do NOT override already saved modules
        if (mod.status < STATUS.SAVED) {
            mod.id = meta.id || uri;
            mod.dependencies = meta.deps || [];
            mod.factory = meta.factory;
            mod.status = STATUS.SAVED;
        }
        return mod;
    };

    // Get an existed module or create a new one
    Module.get = function(uri, deps) {
        return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps));
    };

    // Use function is equal to load a anonymous module
    Module.use = function(ids, callback, uri) {
        var mod = Module.get(uri, isArray(ids) ? ids : [ids]);
        
        mod.callback = function() {
            var exports = [];
            var uris = mod.resolve();
            
            for (var i = 0, len = uris.length; i < len; i++) {
                exports[i] = cachedMods[uris[i]].exec() || (cachedMods[cachedMods[uris[i]].referrer] && cachedMods[cachedMods[uris[i]].referrer].exec());
            }
            if (callback) {
                callback.apply(global, exports);
            }
            delete mod.callback;
            // del fix cache
            // if (isArray(firstModuleInPackage)) {
            //     firstModuleInPackage = [];
            // }
            // firstCache = {};
        };
        
        mod.load();
    };

    // Load preload modules before all other modules
    Module.preload = function(callback) {
        var preloadMods = data.preload;
        var len = preloadMods.length;
        
        if (len) {
            Module.use(preloadMods, function() {
                // Remove the loaded preload modules
                preloadMods.splice(0, len);

                // Allow preload modules to add new preload modules
                Module.preload(callback);
            }, data.cwd + "_preload_" + cid());
        } else {
            callback();
        }
    };


    // Public API
    
    seajs.use = function(ids, callback) {
        // fix cache mix
        if (!isArray(firstModuleInPackage)) {
            firstModuleInPackage = null;
        }
        Module.preload(function() {
            Module.use(ids, callback, data.cwd + "_use_" + cid());
        });
        return seajs;
    };
    
    Module.define.cmd = {};
    global.define = Module.define;


    // For Developers
    
    seajs.Module = Module;
    data.fetchedList = fetchedList;
    data.cid = cid;
    
    seajs.require = function(id) {
        var mod = Module.get(Module.resolve(id));
        if (mod.status < STATUS.EXECUTING) {
            mod.onload();
            mod.exec();
        }
        return mod.exports;
    };


    /**
 * config.js - The configuration for the loader
 */
    
    var BASE_RE = /^(.+?\/)(\?\?)?(seajs\/)+/;

    // The root path to use for id2uri parsing
    // If loaderUri is `http://test.com/libs/seajs/[??][seajs/1.2.3/]sea.js`, the
    // baseUri should be `http://test.com/libs/`
    data.base = (loaderDir.match(BASE_RE) || ["", loaderDir])[1];

    // The loader directory
    data.dir = loaderDir;

    // The current working directory
    data.cwd = cwd;

    // The charset for requesting files
    data.charset = "utf-8";

    // Modules that are needed to load before all other modules
    data.preload = (function() {
        var plugins = [];

        // Convert `seajs-xxx` to `seajs-xxx=1`
        // NOTE: use `seajs-xxx=1` flag in uri or cookie to preload `seajs-xxx`
        var str = location.search.replace(/(seajs-\w+)(&|$)/g, "$1=1$2");

        // Add cookie string
        str += " " + doc.cookie;

        // Exclude seajs-xxx=0
        str.replace(/(seajs-\w+)=1/g, function(m, name) {
            plugins.push(name);
        });
        
        return plugins;
    })();

    // data.alias - An object containing shorthands of module id
    // data.paths - An object containing path shorthands in module id
    // data.vars - The {xxx} variables in module id
    // data.map - An array containing rules to map module uri
    // data.debug - Debug mode. The default value is false
    
    seajs.config = function(configData) {
        
        for (var key in configData) {
            var curr = configData[key];
            var prev = data[key];

            // Merge object config such as alias, vars
            if (prev && isObject(prev)) {
                for (var k in curr) {
                    prev[k] = curr[k];
                }
            } else {
                // Concat array config such as map, preload
                if (isArray(prev)) {
                    curr = prev.concat(curr);
                }
                // Make sure that `data.base` is an absolute path
                else if (key === "base") {
                    // Make sure end with "/"
                    if (curr.slice(-1) !== "/") {
                        curr += "/";
                    }
                    curr = addBase(curr);
                }

                // Set config
                data[key] = curr;
            }
        }
        
        emit("config", configData);
        return seajs;
    };

})(this);

window._M_ = window._M_ || {};

_M_["lib"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                global.Qiyi = global.Qiyi || __mod__["jquery/cmd/jquery"]();
                var lib = global.Qiyi;
                lib.string = lib.string || {};
                lib.array = lib.array || {};
                lib.element = lib.element || {};
                lib.event = lib.event || {};
                lib.fn = lib.fn || {};
                lib.json = lib.json || {};
                lib.lang = lib.lang || {};
                lib.object = lib.object || {};
                lib.selector = lib.selector || {};
                lib.url = lib.url || {};
                lib.http = lib.http || {};
                lib.crypto = lib.crypto || {};
                lib.date = lib.date || {};
                lib.number = lib.number || {};
                lib.cookie = lib.cookie || {};
                lib.plugins = lib.plugins || {};
                lib.flash = lib.flash || {};
                lib.page = lib.page || {};
                lib.anim = lib.anim || {};
                lib.log = lib.log || {};
                lib.browser = lib.browser || {};
                lib.path = lib.path || {};
                lib.ic = lib.ic || {};
                lib.external = lib.external || {};
                lib.__callbacks__ = __mod__["platform/__callbacks__"]();
                __mod__["platform/prototype/array/every"]();
                __mod__["platform/prototype/array/filter"]();
                __mod__["platform/prototype/array/forEach"]();
                __mod__["platform/prototype/array/indexOf"]();
                __mod__["platform/prototype/array/lastIndexOf"]();
                __mod__["platform/prototype/array/map"]();
                __mod__["platform/prototype/array/reduce"]();
                __mod__["platform/prototype/array/some"]();
                __mod__["platform/prototype/function/bind"]();
                __mod__["platform/prototype/json/parse"]();
                __mod__["platform/prototype/json/stringify"]();
                __mod__["platform/prototype/string/trim"]();
                lib.string.encodeHtml = __mod__["platform/string/encodeHtml"]();
                lib.string.decodeHtml = __mod__["platform/string/decodeHtml"]();
                lib.string.pad = __mod__["platform/string/pad"]();
                lib.string.getLength = __mod__["platform/string/getLength"]();
                lib.string.truncate = __mod__["platform/string/truncate"]();
                lib.string.divideNumber = __mod__["platform/string/divideNumber"]();
                lib.string.formatJSON = __mod__["platform/string/formatJSON"]();
                lib.string.format = __mod__["platform/string/format"]();
                lib.array.getLen = __mod__["platform/array/getLen"]();
                lib.array.isArray = __mod__["platform/array/isArray"]();
                lib.element.Element = __mod__["platform/element/element"]();
                lib.element.ready = __mod__["platform/element/ready"]();
                lib.page.getViewWidth = __mod__["platform/page/getViewWidth"]();
                lib.page.getViewHeight = __mod__["platform/page/getViewHeight"]();
                lib.page.getScrollLeft = __mod__["platform/page/getScrollLeft"]();
                lib.page.getScrollTop = __mod__["platform/page/getScrollTop"]();
                lib.page.getWidth = __mod__["platform/page/getWidth"]();
                lib.page.getHeight = __mod__["platform/page/getHeight"]();
                lib.event.lists = __mod__["platform/event/lists"]();
                lib.event.on = __mod__["platform/event/on"]();
                lib.event.un = __mod__["platform/event/un"]();
                lib.event.customEvent = __mod__["platform/event/customEvent"]();
                lib.event.preventDefault = __mod__["platform/event/preventDefault"]();
                lib.event.stopPropagation = __mod__["platform/event/stopPropagation"]();
                lib.event.stop = __mod__["platform/event/stop"]();
                lib.event.get = __mod__["platform/event/get"]();
                lib.fn.abstractMethod = __mod__["platform/fn/abstractMethod"]();
                lib.fn.emptyMethod = __mod__["platform/fn/emptyMethod"]();
                lib.lang.isSameDomain = __mod__["platform/lang/isSameDomain"]();
                lib.object.extend = __mod__["platform/object/extend"]();
                lib.object.isObject = __mod__["platform/object/isObject"]();
                lib.object.isEmpty = __mod__["platform/object/isEmpty"]();
                lib.object.forEach = __mod__["platform/object/forEach"]();
                lib.object.like = __mod__["platform/object/like"]();
                lib.selector.sizzle = __mod__["jquery/cmd/sizzle"]();
                lib.url.parse = __mod__["platform/url/parse"]();
                lib.url.escapeSymbol = __mod__["platform/url/escapeSymbol"]();
                lib.url.getQueryValue = __mod__["platform/url/getQueryValue"]();
                lib.url.jsonToQuery = __mod__["platform/url/jsonToQuery"]();
                lib.url.queryToJson = __mod__["platform/url/queryToJson"]();
                lib.url.isUrl = __mod__["platform/url/isUrl"]();
                lib.url.deleteProtocol = __mod__["platform/url/deleteProtocol"]();
                lib.http.request = __mod__["platform/http/request"]();
                lib.http.json = __mod__["platform/http/json"]();
                lib.http.text = __mod__["platform/http/text"]();
                lib.http.req = __mod__["platform/http/req"]();
                lib.http.json2 = __mod__["platform/http/json2"]();
                lib.http.text2 = __mod__["platform/http/text2"]();
                lib.crypto.base64 = __mod__["platform/crypto/base64"]();
                lib.crypto.md5 = __mod__["platform/crypto/md5"]();
                lib.crypto.rsa = __mod__["platform/crypto/rsa"]();
                lib.date.format = __mod__["platform/date/format"]();
                lib.date.formatSeconds = __mod__["platform/date/formatSeconds"]();
                lib.number.pad = __mod__["platform/number/pad"]();
                __mod__["platform/setQC005"]();
                lib.plugins.Template = __mod__["platform/plugins/template"]();
                lib.plugins.Mustache = __mod__["platform/plugins/mustache"]();
                lib.plugins.ArtTemplate = __mod__["platform/plugins/artTemplate"]();
                lib.plugins.clearSwf = __mod__["platform/plugins/clearSwf"]();
                __mod__["platform/plugins/adCompatible"]();
                __mod__["platform/plugins/pingbackCompatible"]();
                __mod__["platform/plugins/clearSwfCompatible"]();
                lib.flash.getVer = __mod__["platform/flash/getVer"]();
                lib.flash.html = __mod__["platform/flash/html"]();
                lib.flash.insert = __mod__["platform/flash/insert"]();
                lib.flash.remove = __mod__["platform/flash/remove"]();
                lib.flash.write = __mod__["platform/flash/write"]();
                lib.flash.create = __mod__["platform/flash/create"]();
                lib.cookie.get = __mod__["platform/cookie/get"]();
                lib.cookie.set = __mod__["platform/cookie/set"]();
                lib.cookie.remove = __mod__["platform/cookie/remove"]();
                lib.log.server = __mod__["platform/log/server"]();
                lib.log.log = __mod__["platform/log/log"]();
                lib.anim = __mod__["platform/anim/create"]();
                lib.anim.create = __mod__["platform/anim/create"]();
                lib.anim.tween = __mod__["platform/anim/tween"]();
                lib.browser = __mod__["platform/browser/ua"]();
                lib.browser.supportFixed = __mod__["platform/browser/supportFixed"]();
                lib.browser.getOS = __mod__["platform/browser/getOS"]();
                lib.ic.InfoCenter = __mod__["platform/ic/infoCenter"]();
                lib.Class = __mod__["platform/class"]();
                lib["$"] = __mod__["platform/dollar"]();
                __mod__[__id__] = lib;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("lib", (_M_["lib"] = {}) && _M_);

_M_["driver/global"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = window;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/global", (_M_["driver/global"] = {}) && _M_);

_M_["jquery/cmd/jquery"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/selector"]();
                __mod__["jquery/cmd/traversing"]();
                __mod__["jquery/cmd/callbacks"]();
                __mod__["jquery/cmd/deferred"]();
                __mod__["jquery/cmd/core/ready"]();
                __mod__["jquery/cmd/support"]();
                __mod__["jquery/cmd/data"]();
                __mod__["jquery/cmd/queue"]();
                __mod__["jquery/cmd/queue/delay"]();
                __mod__["jquery/cmd/attributes"]();
                __mod__["jquery/cmd/event"]();
                __mod__["jquery/cmd/event/alias"]();
                __mod__["jquery/cmd/manipulation"]();
                __mod__["jquery/cmd/manipulation/_evalUrl"]();
                __mod__["jquery/cmd/wrap"]();
                __mod__["jquery/cmd/css"]();
                __mod__["jquery/cmd/css/hiddenVisibleSelectors"]();
                __mod__["jquery/cmd/serialize"]();
                __mod__["jquery/cmd/ajax"]();
                __mod__["jquery/cmd/ajax/xhr"]();
                __mod__["jquery/cmd/ajax/script"]();
                __mod__["jquery/cmd/ajax/jsonp"]();
                __mod__["jquery/cmd/ajax/load"]();
                __mod__["jquery/cmd/event/ajax"]();
                __mod__["jquery/cmd/effects"]();
                __mod__["jquery/cmd/effects/animatedSelector"]();
                __mod__["jquery/cmd/offset"]();
                __mod__["jquery/cmd/dimensions"]();
                __mod__["jquery/cmd/deprecated"]();
                __mod__["jquery/cmd/exports/amd"]();
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/jquery", (_M_["jquery/cmd/jquery"] = {}) && _M_);

_M_["jquery/cmd/core"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var deletedIds = __mod__["jquery/cmd/var/deletedIds"]();
                var slice = __mod__["jquery/cmd/var/slice"]();
                var concat = __mod__["jquery/cmd/var/concat"]();
                var push = __mod__["jquery/cmd/var/push"]();
                var indexOf = __mod__["jquery/cmd/var/indexOf"]();
                var class2type = __mod__["jquery/cmd/var/class2type"]();
                var toString = __mod__["jquery/cmd/var/toString"]();
                var hasOwn = __mod__["jquery/cmd/var/hasOwn"]();
                var support = __mod__["jquery/cmd/var/support"]();
                var version = "@VERSION", jQuery = function(selector, context) {
                    return new jQuery.fn.init(selector, context);
                }, rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, rmsPrefix = /^-ms-/, rdashAlpha = /-([\da-z])/gi, fcamelCase = function(all, letter) {
                    return letter.toUpperCase();
                };
                jQuery.fn = jQuery.prototype = {
                    jquery: version,
                    constructor: jQuery,
                    selector: "",
                    length: 0,
                    toArray: function() {
                        return slice.call(this);
                    },
                    get: function(num) {
                        return num != null ? num < 0 ? this[num + this.length] : this[num] : slice.call(this);
                    },
                    pushStack: function(elems) {
                        var ret = jQuery.merge(this.constructor(), elems);
                        ret.prevObject = this;
                        ret.context = this.context;
                        return ret;
                    },
                    each: function(callback, args) {
                        return jQuery.each(this, callback, args);
                    },
                    map: function(callback) {
                        return this.pushStack(jQuery.map(this, function(elem, i) {
                            return callback.call(elem, i, elem);
                        }));
                    },
                    slice: function() {
                        return this.pushStack(slice.apply(this, arguments));
                    },
                    first: function() {
                        return this.eq(0);
                    },
                    last: function() {
                        return this.eq(-1);
                    },
                    eq: function(i) {
                        var len = this.length, j = +i + (i < 0 ? len : 0);
                        return this.pushStack(j >= 0 && j < len ? [ this[j] ] : []);
                    },
                    end: function() {
                        return this.prevObject || this.constructor(null);
                    },
                    push: push,
                    sort: deletedIds.sort,
                    splice: deletedIds.splice
                };
                jQuery.extend = jQuery.fn.extend = function() {
                    var src, copyIsArray, copy, name, options, clone, target = arguments[0] || {}, i = 1, length = arguments.length, deep = false;
                    if (typeof target === "boolean") {
                        deep = target;
                        target = arguments[i] || {};
                        i++;
                    }
                    if (typeof target !== "object" && !jQuery.isFunction(target)) {
                        target = {};
                    }
                    if (i === length) {
                        target = this;
                        i--;
                    }
                    for (;i < length; i++) {
                        if ((options = arguments[i]) != null) {
                            for (name in options) {
                                src = target[name];
                                copy = options[name];
                                if (target === copy) {
                                    continue;
                                }
                                if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
                                    if (copyIsArray) {
                                        copyIsArray = false;
                                        clone = src && jQuery.isArray(src) ? src : [];
                                    } else {
                                        clone = src && jQuery.isPlainObject(src) ? src : {};
                                    }
                                    target[name] = jQuery.extend(deep, clone, copy);
                                } else if (copy !== undefined) {
                                    target[name] = copy;
                                }
                            }
                        }
                    }
                    return target;
                };
                jQuery.extend({
                    expando: "jQuery" + (version + Math.random()).replace(/\D/g, ""),
                    isReady: true,
                    error: function(msg) {
                        throw new Error(msg);
                    },
                    noop: function() {},
                    isFunction: function(obj) {
                        return jQuery.type(obj) === "function";
                    },
                    isArray: Array.isArray || function(obj) {
                        return jQuery.type(obj) === "array";
                    },
                    isWindow: function(obj) {
                        return obj != null && obj == obj.window;
                    },
                    isNumeric: function(obj) {
                        return !jQuery.isArray(obj) && obj - parseFloat(obj) + 1 >= 0;
                    },
                    isEmptyObject: function(obj) {
                        var name;
                        for (name in obj) {
                            return false;
                        }
                        return true;
                    },
                    isPlainObject: function(obj) {
                        var key;
                        if (!obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow(obj)) {
                            return false;
                        }
                        try {
                            if (obj.constructor && !hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
                                return false;
                            }
                        } catch (e) {
                            return false;
                        }
                        if (support.ownLast) {
                            for (key in obj) {
                                return hasOwn.call(obj, key);
                            }
                        }
                        for (key in obj) {}
                        return key === undefined || hasOwn.call(obj, key);
                    },
                    type: function(obj) {
                        if (obj == null) {
                            return obj + "";
                        }
                        return typeof obj === "object" || typeof obj === "function" ? class2type[toString.call(obj)] || "object" : typeof obj;
                    },
                    globalEval: function(data) {
                        if (data && jQuery.trim(data)) {
                            (window.execScript || function(data) {
                                window["eval"].call(window, data);
                            })(data);
                        }
                    },
                    camelCase: function(string) {
                        return string.replace(rmsPrefix, "ms-").replace(rdashAlpha, fcamelCase);
                    },
                    nodeName: function(elem, name) {
                        return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
                    },
                    each: function(obj, callback, args) {
                        var value, i = 0, length = obj.length, isArray = isArraylike(obj);
                        if (args) {
                            if (isArray) {
                                for (;i < length; i++) {
                                    value = callback.apply(obj[i], args);
                                    if (value === false) {
                                        break;
                                    }
                                }
                            } else {
                                for (i in obj) {
                                    value = callback.apply(obj[i], args);
                                    if (value === false) {
                                        break;
                                    }
                                }
                            }
                        } else {
                            if (isArray) {
                                for (;i < length; i++) {
                                    value = callback.call(obj[i], i, obj[i]);
                                    if (value === false) {
                                        break;
                                    }
                                }
                            } else {
                                for (i in obj) {
                                    value = callback.call(obj[i], i, obj[i]);
                                    if (value === false) {
                                        break;
                                    }
                                }
                            }
                        }
                        return obj;
                    },
                    trim: function(text) {
                        return text == null ? "" : (text + "").replace(rtrim, "");
                    },
                    makeArray: function(arr, results) {
                        var ret = results || [];
                        if (arr != null) {
                            if (isArraylike(Object(arr))) {
                                jQuery.merge(ret, typeof arr === "string" ? [ arr ] : arr);
                            } else {
                                push.call(ret, arr);
                            }
                        }
                        return ret;
                    },
                    inArray: function(elem, arr, i) {
                        var len;
                        if (arr) {
                            if (indexOf) {
                                return indexOf.call(arr, elem, i);
                            }
                            len = arr.length;
                            i = i ? i < 0 ? Math.max(0, len + i) : i : 0;
                            for (;i < len; i++) {
                                if (i in arr && arr[i] === elem) {
                                    return i;
                                }
                            }
                        }
                        return -1;
                    },
                    merge: function(first, second) {
                        var len = +second.length, j = 0, i = first.length;
                        while (j < len) {
                            first[i++] = second[j++];
                        }
                        if (len !== len) {
                            while (second[j] !== undefined) {
                                first[i++] = second[j++];
                            }
                        }
                        first.length = i;
                        return first;
                    },
                    grep: function(elems, callback, invert) {
                        var callbackInverse, matches = [], i = 0, length = elems.length, callbackExpect = !invert;
                        for (;i < length; i++) {
                            callbackInverse = !callback(elems[i], i);
                            if (callbackInverse !== callbackExpect) {
                                matches.push(elems[i]);
                            }
                        }
                        return matches;
                    },
                    map: function(elems, callback, arg) {
                        var value, i = 0, length = elems.length, isArray = isArraylike(elems), ret = [];
                        if (isArray) {
                            for (;i < length; i++) {
                                value = callback(elems[i], i, arg);
                                if (value != null) {
                                    ret.push(value);
                                }
                            }
                        } else {
                            for (i in elems) {
                                value = callback(elems[i], i, arg);
                                if (value != null) {
                                    ret.push(value);
                                }
                            }
                        }
                        return concat.apply([], ret);
                    },
                    guid: 1,
                    proxy: function(fn, context) {
                        var args, proxy, tmp;
                        if (typeof context === "string") {
                            tmp = fn[context];
                            context = fn;
                            fn = tmp;
                        }
                        if (!jQuery.isFunction(fn)) {
                            return undefined;
                        }
                        args = slice.call(arguments, 2);
                        proxy = function() {
                            return fn.apply(context || this, args.concat(slice.call(arguments)));
                        };
                        proxy.guid = fn.guid = fn.guid || jQuery.guid++;
                        return proxy;
                    },
                    now: function() {
                        return +new Date();
                    },
                    support: support
                });
                jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
                    class2type["[object " + name + "]"] = name.toLowerCase();
                });
                function isArraylike(obj) {
                    var length = obj.length, type = jQuery.type(obj);
                    if (type === "function" || jQuery.isWindow(obj)) {
                        return false;
                    }
                    if (obj.nodeType === 1 && length) {
                        return true;
                    }
                    return type === "array" || length === 0 || typeof length === "number" && length > 0 && length - 1 in obj;
                }
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/core", (_M_["jquery/cmd/core"] = {}) && _M_);

_M_["jquery/cmd/var/deletedIds"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = [];
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/deletedIds", (_M_["jquery/cmd/var/deletedIds"] = {}) && _M_);

_M_["jquery/cmd/var/slice"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var deletedIds = __mod__["jquery/cmd/var/deletedIds"]();
                __mod__[__id__] = deletedIds.slice;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/slice", (_M_["jquery/cmd/var/slice"] = {}) && _M_);

_M_["jquery/cmd/var/concat"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var deletedIds = __mod__["jquery/cmd/var/deletedIds"]();
                __mod__[__id__] = deletedIds.concat;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/concat", (_M_["jquery/cmd/var/concat"] = {}) && _M_);

_M_["jquery/cmd/var/push"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var deletedIds = __mod__["jquery/cmd/var/deletedIds"]();
                __mod__[__id__] = deletedIds.push;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/push", (_M_["jquery/cmd/var/push"] = {}) && _M_);

_M_["jquery/cmd/var/indexOf"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var deletedIds = __mod__["jquery/cmd/var/deletedIds"]();
                __mod__[__id__] = deletedIds.indexOf;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/indexOf", (_M_["jquery/cmd/var/indexOf"] = {}) && _M_);

_M_["jquery/cmd/var/class2type"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = {};
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/class2type", (_M_["jquery/cmd/var/class2type"] = {}) && _M_);

_M_["jquery/cmd/var/toString"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var class2type = __mod__["jquery/cmd/var/class2type"]();
                __mod__[__id__] = class2type.toString;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/toString", (_M_["jquery/cmd/var/toString"] = {}) && _M_);

_M_["jquery/cmd/var/hasOwn"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var class2type = __mod__["jquery/cmd/var/class2type"]();
                __mod__[__id__] = class2type.hasOwnProperty;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/hasOwn", (_M_["jquery/cmd/var/hasOwn"] = {}) && _M_);

_M_["jquery/cmd/var/support"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = {};
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/support", (_M_["jquery/cmd/var/support"] = {}) && _M_);

_M_["jquery/cmd/selector"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__["jquery/cmd/selector-sizzle"]();
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/selector", (_M_["jquery/cmd/selector"] = {}) && _M_);

_M_["jquery/cmd/selector-sizzle"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var Sizzle = __mod__["jquery/cmd/sizzle"]();
                jQuery.find = Sizzle;
                jQuery.expr = Sizzle.selectors;
                jQuery.expr[":"] = jQuery.expr.pseudos;
                jQuery.unique = Sizzle.uniqueSort;
                jQuery.text = Sizzle.getText;
                jQuery.isXMLDoc = Sizzle.isXML;
                jQuery.contains = Sizzle.contains;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/selector-sizzle", (_M_["jquery/cmd/selector-sizzle"] = {}) && _M_);

(function(window) {
    var i, support, Expr, getText, isXML, tokenize, compile, select, outermostContext, sortInput, hasDuplicate, setDocument, document, docElem, documentIsHTML, rbuggyQSA, rbuggyMatches, matches, contains, expando = "sizzle" + 1 * new Date(), preferredDoc = window.document, dirruns = 0, done = 0, classCache = createCache(), tokenCache = createCache(), compilerCache = createCache(), sortOrder = function(a, b) {
        if (a === b) {
            hasDuplicate = true;
        }
        return 0;
    }, MAX_NEGATIVE = 1 << 31, hasOwn = {}.hasOwnProperty, arr = [], pop = arr.pop, push_native = arr.push, push = arr.push, slice = arr.slice, indexOf = function(list, elem) {
        var i = 0, len = list.length;
        for (;i < len; i++) {
            if (list[i] === elem) {
                return i;
            }
        }
        return -1;
    }, booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped", whitespace = "[\\x20\\t\\r\\n\\f]", characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+", identifier = characterEncoding.replace("w", "w#"), attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace + "*([*^$|!~]?=)" + whitespace + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace + "*\\]", pseudos = ":(" + characterEncoding + ")(?:\\((" + "('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" + "((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" + ".*" + ")\\)|)", rwhitespace = new RegExp(whitespace + "+", "g"), rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g"), rcomma = new RegExp("^" + whitespace + "*," + whitespace + "*"), rcombinators = new RegExp("^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*"), rattributeQuotes = new RegExp("=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g"), rpseudo = new RegExp(pseudos), ridentifier = new RegExp("^" + identifier + "$"), matchExpr = {
        ID: new RegExp("^#(" + characterEncoding + ")"),
        CLASS: new RegExp("^\\.(" + characterEncoding + ")"),
        TAG: new RegExp("^(" + characterEncoding.replace("w", "w*") + ")"),
        ATTR: new RegExp("^" + attributes),
        PSEUDO: new RegExp("^" + pseudos),
        CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i"),
        bool: new RegExp("^(?:" + booleans + ")$", "i"),
        needsContext: new RegExp("^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i")
    }, rinputs = /^(?:input|select|textarea|button)$/i, rheader = /^h\d$/i, rnative = /^[^{]+\{\s*\[native \w/, rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/, rsibling = /[+~]/, rescape = /'|\\/g, runescape = new RegExp("\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig"), funescape = function(_, escaped, escapedWhitespace) {
        var high = "0x" + escaped - 65536;
        return high !== high || escapedWhitespace ? escaped : high < 0 ? String.fromCharCode(high + 65536) : String.fromCharCode(high >> 10 | 55296, high & 1023 | 56320);
    }, unloadHandler = function() {
        setDocument();
    };
    try {
        push.apply(arr = slice.call(preferredDoc.childNodes), preferredDoc.childNodes);
        arr[preferredDoc.childNodes.length].nodeType;
    } catch (e) {
        push = {
            apply: arr.length ? function(target, els) {
                push_native.apply(target, slice.call(els));
            } : function(target, els) {
                var j = target.length, i = 0;
                while (target[j++] = els[i++]) {}
                target.length = j - 1;
            }
        };
    }
    function Sizzle(selector, context, results, seed) {
        var match, elem, m, nodeType, i, groups, old, nid, newContext, newSelector;
        if ((context ? context.ownerDocument || context : preferredDoc) !== document) {
            setDocument(context);
        }
        context = context || document;
        results = results || [];
        nodeType = context.nodeType;
        if (typeof selector !== "string" || !selector || nodeType !== 1 && nodeType !== 9 && nodeType !== 11) {
            return results;
        }
        if (!seed && documentIsHTML) {
            if (nodeType !== 11 && (match = rquickExpr.exec(selector))) {
                if (m = match[1]) {
                    if (nodeType === 9) {
                        elem = context.getElementById(m);
                        if (elem && elem.parentNode) {
                            if (elem.id === m) {
                                results.push(elem);
                                return results;
                            }
                        } else {
                            return results;
                        }
                    } else {
                        if (context.ownerDocument && (elem = context.ownerDocument.getElementById(m)) && contains(context, elem) && elem.id === m) {
                            results.push(elem);
                            return results;
                        }
                    }
                } else if (match[2]) {
                    push.apply(results, context.getElementsByTagName(selector));
                    return results;
                } else if ((m = match[3]) && support.getElementsByClassName) {
                    push.apply(results, context.getElementsByClassName(m));
                    return results;
                }
            }
            if (support.qsa && (!rbuggyQSA || !rbuggyQSA.test(selector))) {
                nid = old = expando;
                newContext = context;
                newSelector = nodeType !== 1 && selector;
                if (nodeType === 1 && context.nodeName.toLowerCase() !== "object") {
                    groups = tokenize(selector);
                    if (old = context.getAttribute("id")) {
                        nid = old.replace(rescape, "\\$&");
                    } else {
                        context.setAttribute("id", nid);
                    }
                    nid = "[id='" + nid + "'] ";
                    i = groups.length;
                    while (i--) {
                        groups[i] = nid + toSelector(groups[i]);
                    }
                    newContext = rsibling.test(selector) && testContext(context.parentNode) || context;
                    newSelector = groups.join(",");
                }
                if (newSelector) {
                    try {
                        push.apply(results, newContext.querySelectorAll(newSelector));
                        return results;
                    } catch (qsaError) {} finally {
                        if (!old) {
                            context.removeAttribute("id");
                        }
                    }
                }
            }
        }
        return select(selector.replace(rtrim, "$1"), context, results, seed);
    }
    function createCache() {
        var keys = [];
        function cache(key, value) {
            if (keys.push(key + " ") > Expr.cacheLength) {
                delete cache[keys.shift()];
            }
            return cache[key + " "] = value;
        }
        return cache;
    }
    function markFunction(fn) {
        fn[expando] = true;
        return fn;
    }
    function assert(fn) {
        var div = document.createElement("div");
        try {
            return !!fn(div);
        } catch (e) {
            return false;
        } finally {
            if (div.parentNode) {
                div.parentNode.removeChild(div);
            }
            div = null;
        }
    }
    function addHandle(attrs, handler) {
        var arr = attrs.split("|"), i = attrs.length;
        while (i--) {
            Expr.attrHandle[arr[i]] = handler;
        }
    }
    function siblingCheck(a, b) {
        var cur = b && a, diff = cur && a.nodeType === 1 && b.nodeType === 1 && (~b.sourceIndex || MAX_NEGATIVE) - (~a.sourceIndex || MAX_NEGATIVE);
        if (diff) {
            return diff;
        }
        if (cur) {
            while (cur = cur.nextSibling) {
                if (cur === b) {
                    return -1;
                }
            }
        }
        return a ? 1 : -1;
    }
    function createInputPseudo(type) {
        return function(elem) {
            var name = elem.nodeName.toLowerCase();
            return name === "input" && elem.type === type;
        };
    }
    function createButtonPseudo(type) {
        return function(elem) {
            var name = elem.nodeName.toLowerCase();
            return (name === "input" || name === "button") && elem.type === type;
        };
    }
    function createPositionalPseudo(fn) {
        return markFunction(function(argument) {
            argument = +argument;
            return markFunction(function(seed, matches) {
                var j, matchIndexes = fn([], seed.length, argument), i = matchIndexes.length;
                while (i--) {
                    if (seed[j = matchIndexes[i]]) {
                        seed[j] = !(matches[j] = seed[j]);
                    }
                }
            });
        });
    }
    function testContext(context) {
        return context && typeof context.getElementsByTagName !== "undefined" && context;
    }
    support = Sizzle.support = {};
    isXML = Sizzle.isXML = function(elem) {
        var documentElement = elem && (elem.ownerDocument || elem).documentElement;
        return documentElement ? documentElement.nodeName !== "HTML" : false;
    };
    setDocument = Sizzle.setDocument = function(node) {
        var hasCompare, parent, doc = node ? node.ownerDocument || node : preferredDoc;
        if (doc === document || doc.nodeType !== 9 || !doc.documentElement) {
            return document;
        }
        document = doc;
        docElem = doc.documentElement;
        parent = doc.defaultView;
        if (parent && parent !== parent.top) {
            if (parent.addEventListener) {
                parent.addEventListener("unload", unloadHandler, false);
            } else if (parent.attachEvent) {
                parent.attachEvent("onunload", unloadHandler);
            }
        }
        documentIsHTML = !isXML(doc);
        support.attributes = assert(function(div) {
            div.className = "i";
            return !div.getAttribute("className");
        });
        support.getElementsByTagName = assert(function(div) {
            div.appendChild(doc.createComment(""));
            return !div.getElementsByTagName("*").length;
        });
        support.getElementsByClassName = rnative.test(doc.getElementsByClassName);
        support.getById = assert(function(div) {
            docElem.appendChild(div).id = expando;
            return !doc.getElementsByName || !doc.getElementsByName(expando).length;
        });
        if (support.getById) {
            Expr.find["ID"] = function(id, context) {
                if (typeof context.getElementById !== "undefined" && documentIsHTML) {
                    var m = context.getElementById(id);
                    return m && m.parentNode ? [ m ] : [];
                }
            };
            Expr.filter["ID"] = function(id) {
                var attrId = id.replace(runescape, funescape);
                return function(elem) {
                    return elem.getAttribute("id") === attrId;
                };
            };
        } else {
            delete Expr.find["ID"];
            Expr.filter["ID"] = function(id) {
                var attrId = id.replace(runescape, funescape);
                return function(elem) {
                    var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
                    return node && node.value === attrId;
                };
            };
        }
        Expr.find["TAG"] = support.getElementsByTagName ? function(tag, context) {
            if (typeof context.getElementsByTagName !== "undefined") {
                return context.getElementsByTagName(tag);
            } else if (support.qsa) {
                return context.querySelectorAll(tag);
            }
        } : function(tag, context) {
            var elem, tmp = [], i = 0, results = context.getElementsByTagName(tag);
            if (tag === "*") {
                while (elem = results[i++]) {
                    if (elem.nodeType === 1) {
                        tmp.push(elem);
                    }
                }
                return tmp;
            }
            return results;
        };
        Expr.find["CLASS"] = support.getElementsByClassName && function(className, context) {
            if (documentIsHTML) {
                return context.getElementsByClassName(className);
            }
        };
        rbuggyMatches = [];
        rbuggyQSA = [];
        if (support.qsa = rnative.test(doc.querySelectorAll)) {
            assert(function(div) {
                docElem.appendChild(div).innerHTML = "<a id='" + expando + "'></a>" + "<select id='" + expando + "-\f]' msallowcapture=''>" + "<option selected=''></option></select>";
                if (div.querySelectorAll("[msallowcapture^='']").length) {
                    rbuggyQSA.push("[*^$]=" + whitespace + "*(?:''|\"\")");
                }
                if (!div.querySelectorAll("[selected]").length) {
                    rbuggyQSA.push("\\[" + whitespace + "*(?:value|" + booleans + ")");
                }
                if (!div.querySelectorAll("[id~=" + expando + "-]").length) {
                    rbuggyQSA.push("~=");
                }
                if (!div.querySelectorAll(":checked").length) {
                    rbuggyQSA.push(":checked");
                }
                if (!div.querySelectorAll("a#" + expando + "+*").length) {
                    rbuggyQSA.push(".#.+[+~]");
                }
            });
            assert(function(div) {
                var input = doc.createElement("input");
                input.setAttribute("type", "hidden");
                div.appendChild(input).setAttribute("name", "D");
                if (div.querySelectorAll("[name=d]").length) {
                    rbuggyQSA.push("name" + whitespace + "*[*^$|!~]?=");
                }
                if (!div.querySelectorAll(":enabled").length) {
                    rbuggyQSA.push(":enabled", ":disabled");
                }
                div.querySelectorAll("*,:x");
                rbuggyQSA.push(",.*:");
            });
        }
        if (support.matchesSelector = rnative.test(matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)) {
            assert(function(div) {
                support.disconnectedMatch = matches.call(div, "div");
                matches.call(div, "[s!='']:x");
                rbuggyMatches.push("!=", pseudos);
            });
        }
        rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join("|"));
        rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join("|"));
        hasCompare = rnative.test(docElem.compareDocumentPosition);
        contains = hasCompare || rnative.test(docElem.contains) ? function(a, b) {
            var adown = a.nodeType === 9 ? a.documentElement : a, bup = b && b.parentNode;
            return a === bup || !!(bup && bup.nodeType === 1 && (adown.contains ? adown.contains(bup) : a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16));
        } : function(a, b) {
            if (b) {
                while (b = b.parentNode) {
                    if (b === a) {
                        return true;
                    }
                }
            }
            return false;
        };
        sortOrder = hasCompare ? function(a, b) {
            if (a === b) {
                hasDuplicate = true;
                return 0;
            }
            var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
            if (compare) {
                return compare;
            }
            compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1;
            if (compare & 1 || !support.sortDetached && b.compareDocumentPosition(a) === compare) {
                if (a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a)) {
                    return -1;
                }
                if (b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b)) {
                    return 1;
                }
                return sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0;
            }
            return compare & 4 ? -1 : 1;
        } : function(a, b) {
            if (a === b) {
                hasDuplicate = true;
                return 0;
            }
            var cur, i = 0, aup = a.parentNode, bup = b.parentNode, ap = [ a ], bp = [ b ];
            if (!aup || !bup) {
                return a === doc ? -1 : b === doc ? 1 : aup ? -1 : bup ? 1 : sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0;
            } else if (aup === bup) {
                return siblingCheck(a, b);
            }
            cur = a;
            while (cur = cur.parentNode) {
                ap.unshift(cur);
            }
            cur = b;
            while (cur = cur.parentNode) {
                bp.unshift(cur);
            }
            while (ap[i] === bp[i]) {
                i++;
            }
            return i ? siblingCheck(ap[i], bp[i]) : ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0;
        };
        return doc;
    };
    Sizzle.matches = function(expr, elements) {
        return Sizzle(expr, null, null, elements);
    };
    Sizzle.matchesSelector = function(elem, expr) {
        if ((elem.ownerDocument || elem) !== document) {
            setDocument(elem);
        }
        expr = expr.replace(rattributeQuotes, "='$1']");
        if (support.matchesSelector && documentIsHTML && (!rbuggyMatches || !rbuggyMatches.test(expr)) && (!rbuggyQSA || !rbuggyQSA.test(expr))) {
            try {
                var ret = matches.call(elem, expr);
                if (ret || support.disconnectedMatch || elem.document && elem.document.nodeType !== 11) {
                    return ret;
                }
            } catch (e) {}
        }
        return Sizzle(expr, document, null, [ elem ]).length > 0;
    };
    Sizzle.contains = function(context, elem) {
        if ((context.ownerDocument || context) !== document) {
            setDocument(context);
        }
        return contains(context, elem);
    };
    Sizzle.attr = function(elem, name) {
        if ((elem.ownerDocument || elem) !== document) {
            setDocument(elem);
        }
        var fn = Expr.attrHandle[name.toLowerCase()], val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : undefined;
        return val !== undefined ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
    };
    Sizzle.error = function(msg) {
        throw new Error("Syntax error, unrecognized expression: " + msg);
    };
    Sizzle.uniqueSort = function(results) {
        var elem, duplicates = [], j = 0, i = 0;
        hasDuplicate = !support.detectDuplicates;
        sortInput = !support.sortStable && results.slice(0);
        results.sort(sortOrder);
        if (hasDuplicate) {
            while (elem = results[i++]) {
                if (elem === results[i]) {
                    j = duplicates.push(i);
                }
            }
            while (j--) {
                results.splice(duplicates[j], 1);
            }
        }
        sortInput = null;
        return results;
    };
    getText = Sizzle.getText = function(elem) {
        var node, ret = "", i = 0, nodeType = elem.nodeType;
        if (!nodeType) {
            while (node = elem[i++]) {
                ret += getText(node);
            }
        } else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
            if (typeof elem.textContent === "string") {
                return elem.textContent;
            } else {
                for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
                    ret += getText(elem);
                }
            }
        } else if (nodeType === 3 || nodeType === 4) {
            return elem.nodeValue;
        }
        return ret;
    };
    Expr = Sizzle.selectors = {
        cacheLength: 50,
        createPseudo: markFunction,
        match: matchExpr,
        attrHandle: {},
        find: {},
        relative: {
            ">": {
                dir: "parentNode",
                first: true
            },
            " ": {
                dir: "parentNode"
            },
            "+": {
                dir: "previousSibling",
                first: true
            },
            "~": {
                dir: "previousSibling"
            }
        },
        preFilter: {
            ATTR: function(match) {
                match[1] = match[1].replace(runescape, funescape);
                match[3] = (match[3] || match[4] || match[5] || "").replace(runescape, funescape);
                if (match[2] === "~=") {
                    match[3] = " " + match[3] + " ";
                }
                return match.slice(0, 4);
            },
            CHILD: function(match) {
                match[1] = match[1].toLowerCase();
                if (match[1].slice(0, 3) === "nth") {
                    if (!match[3]) {
                        Sizzle.error(match[0]);
                    }
                    match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * (match[3] === "even" || match[3] === "odd"));
                    match[5] = +(match[7] + match[8] || match[3] === "odd");
                } else if (match[3]) {
                    Sizzle.error(match[0]);
                }
                return match;
            },
            PSEUDO: function(match) {
                var excess, unquoted = !match[6] && match[2];
                if (matchExpr["CHILD"].test(match[0])) {
                    return null;
                }
                if (match[3]) {
                    match[2] = match[4] || match[5] || "";
                } else if (unquoted && rpseudo.test(unquoted) && (excess = tokenize(unquoted, true)) && (excess = unquoted.indexOf(")", unquoted.length - excess) - unquoted.length)) {
                    match[0] = match[0].slice(0, excess);
                    match[2] = unquoted.slice(0, excess);
                }
                return match.slice(0, 3);
            }
        },
        filter: {
            TAG: function(nodeNameSelector) {
                var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
                return nodeNameSelector === "*" ? function() {
                    return true;
                } : function(elem) {
                    return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
                };
            },
            CLASS: function(className) {
                var pattern = classCache[className + " "];
                return pattern || (pattern = new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)")) && classCache(className, function(elem) {
                    return pattern.test(typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "");
                });
            },
            ATTR: function(name, operator, check) {
                return function(elem) {
                    var result = Sizzle.attr(elem, name);
                    if (result == null) {
                        return operator === "!=";
                    }
                    if (!operator) {
                        return true;
                    }
                    result += "";
                    return operator === "=" ? result === check : operator === "!=" ? result !== check : operator === "^=" ? check && result.indexOf(check) === 0 : operator === "*=" ? check && result.indexOf(check) > -1 : operator === "$=" ? check && result.slice(-check.length) === check : operator === "~=" ? (" " + result.replace(rwhitespace, " ") + " ").indexOf(check) > -1 : operator === "|=" ? result === check || result.slice(0, check.length + 1) === check + "-" : false;
                };
            },
            CHILD: function(type, what, argument, first, last) {
                var simple = type.slice(0, 3) !== "nth", forward = type.slice(-4) !== "last", ofType = what === "of-type";
                return first === 1 && last === 0 ? function(elem) {
                    return !!elem.parentNode;
                } : function(elem, context, xml) {
                    var cache, outerCache, node, diff, nodeIndex, start, dir = simple !== forward ? "nextSibling" : "previousSibling", parent = elem.parentNode, name = ofType && elem.nodeName.toLowerCase(), useCache = !xml && !ofType;
                    if (parent) {
                        if (simple) {
                            while (dir) {
                                node = elem;
                                while (node = node[dir]) {
                                    if (ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) {
                                        return false;
                                    }
                                }
                                start = dir = type === "only" && !start && "nextSibling";
                            }
                            return true;
                        }
                        start = [ forward ? parent.firstChild : parent.lastChild ];
                        if (forward && useCache) {
                            outerCache = parent[expando] || (parent[expando] = {});
                            cache = outerCache[type] || [];
                            nodeIndex = cache[0] === dirruns && cache[1];
                            diff = cache[0] === dirruns && cache[2];
                            node = nodeIndex && parent.childNodes[nodeIndex];
                            while (node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop()) {
                                if (node.nodeType === 1 && ++diff && node === elem) {
                                    outerCache[type] = [ dirruns, nodeIndex, diff ];
                                    break;
                                }
                            }
                        } else if (useCache && (cache = (elem[expando] || (elem[expando] = {}))[type]) && cache[0] === dirruns) {
                            diff = cache[1];
                        } else {
                            while (node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop()) {
                                if ((ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) && ++diff) {
                                    if (useCache) {
                                        (node[expando] || (node[expando] = {}))[type] = [ dirruns, diff ];
                                    }
                                    if (node === elem) {
                                        break;
                                    }
                                }
                            }
                        }
                        diff -= last;
                        return diff === first || diff % first === 0 && diff / first >= 0;
                    }
                };
            },
            PSEUDO: function(pseudo, argument) {
                var args, fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error("unsupported pseudo: " + pseudo);
                if (fn[expando]) {
                    return fn(argument);
                }
                if (fn.length > 1) {
                    args = [ pseudo, pseudo, "", argument ];
                    return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function(seed, matches) {
                        var idx, matched = fn(seed, argument), i = matched.length;
                        while (i--) {
                            idx = indexOf(seed, matched[i]);
                            seed[idx] = !(matches[idx] = matched[i]);
                        }
                    }) : function(elem) {
                        return fn(elem, 0, args);
                    };
                }
                return fn;
            }
        },
        pseudos: {
            not: markFunction(function(selector) {
                var input = [], results = [], matcher = compile(selector.replace(rtrim, "$1"));
                return matcher[expando] ? markFunction(function(seed, matches, context, xml) {
                    var elem, unmatched = matcher(seed, null, xml, []), i = seed.length;
                    while (i--) {
                        if (elem = unmatched[i]) {
                            seed[i] = !(matches[i] = elem);
                        }
                    }
                }) : function(elem, context, xml) {
                    input[0] = elem;
                    matcher(input, null, xml, results);
                    input[0] = null;
                    return !results.pop();
                };
            }),
            has: markFunction(function(selector) {
                return function(elem) {
                    return Sizzle(selector, elem).length > 0;
                };
            }),
            contains: markFunction(function(text) {
                text = text.replace(runescape, funescape);
                return function(elem) {
                    return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1;
                };
            }),
            lang: markFunction(function(lang) {
                if (!ridentifier.test(lang || "")) {
                    Sizzle.error("unsupported lang: " + lang);
                }
                lang = lang.replace(runescape, funescape).toLowerCase();
                return function(elem) {
                    var elemLang;
                    do {
                        if (elemLang = documentIsHTML ? elem.lang : elem.getAttribute("xml:lang") || elem.getAttribute("lang")) {
                            elemLang = elemLang.toLowerCase();
                            return elemLang === lang || elemLang.indexOf(lang + "-") === 0;
                        }
                    } while ((elem = elem.parentNode) && elem.nodeType === 1);
                    return false;
                };
            }),
            target: function(elem) {
                var hash = window.location && window.location.hash;
                return hash && hash.slice(1) === elem.id;
            },
            root: function(elem) {
                return elem === docElem;
            },
            focus: function(elem) {
                return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
            },
            enabled: function(elem) {
                return elem.disabled === false;
            },
            disabled: function(elem) {
                return elem.disabled === true;
            },
            checked: function(elem) {
                var nodeName = elem.nodeName.toLowerCase();
                return nodeName === "input" && !!elem.checked || nodeName === "option" && !!elem.selected;
            },
            selected: function(elem) {
                if (elem.parentNode) {
                    elem.parentNode.selectedIndex;
                }
                return elem.selected === true;
            },
            empty: function(elem) {
                for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
                    if (elem.nodeType < 6) {
                        return false;
                    }
                }
                return true;
            },
            parent: function(elem) {
                return !Expr.pseudos["empty"](elem);
            },
            header: function(elem) {
                return rheader.test(elem.nodeName);
            },
            input: function(elem) {
                return rinputs.test(elem.nodeName);
            },
            button: function(elem) {
                var name = elem.nodeName.toLowerCase();
                return name === "input" && elem.type === "button" || name === "button";
            },
            text: function(elem) {
                var attr;
                return elem.nodeName.toLowerCase() === "input" && elem.type === "text" && ((attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text");
            },
            first: createPositionalPseudo(function() {
                return [ 0 ];
            }),
            last: createPositionalPseudo(function(matchIndexes, length) {
                return [ length - 1 ];
            }),
            eq: createPositionalPseudo(function(matchIndexes, length, argument) {
                return [ argument < 0 ? argument + length : argument ];
            }),
            even: createPositionalPseudo(function(matchIndexes, length) {
                var i = 0;
                for (;i < length; i += 2) {
                    matchIndexes.push(i);
                }
                return matchIndexes;
            }),
            odd: createPositionalPseudo(function(matchIndexes, length) {
                var i = 1;
                for (;i < length; i += 2) {
                    matchIndexes.push(i);
                }
                return matchIndexes;
            }),
            lt: createPositionalPseudo(function(matchIndexes, length, argument) {
                var i = argument < 0 ? argument + length : argument;
                for (;--i >= 0; ) {
                    matchIndexes.push(i);
                }
                return matchIndexes;
            }),
            gt: createPositionalPseudo(function(matchIndexes, length, argument) {
                var i = argument < 0 ? argument + length : argument;
                for (;++i < length; ) {
                    matchIndexes.push(i);
                }
                return matchIndexes;
            })
        }
    };
    Expr.pseudos["nth"] = Expr.pseudos["eq"];
    for (i in {
        radio: true,
        checkbox: true,
        file: true,
        password: true,
        image: true
    }) {
        Expr.pseudos[i] = createInputPseudo(i);
    }
    for (i in {
        submit: true,
        reset: true
    }) {
        Expr.pseudos[i] = createButtonPseudo(i);
    }
    function setFilters() {}
    setFilters.prototype = Expr.filters = Expr.pseudos;
    Expr.setFilters = new setFilters();
    tokenize = Sizzle.tokenize = function(selector, parseOnly) {
        var matched, match, tokens, type, soFar, groups, preFilters, cached = tokenCache[selector + " "];
        if (cached) {
            return parseOnly ? 0 : cached.slice(0);
        }
        soFar = selector;
        groups = [];
        preFilters = Expr.preFilter;
        while (soFar) {
            if (!matched || (match = rcomma.exec(soFar))) {
                if (match) {
                    soFar = soFar.slice(match[0].length) || soFar;
                }
                groups.push(tokens = []);
            }
            matched = false;
            if (match = rcombinators.exec(soFar)) {
                matched = match.shift();
                tokens.push({
                    value: matched,
                    type: match[0].replace(rtrim, " ")
                });
                soFar = soFar.slice(matched.length);
            }
            for (type in Expr.filter) {
                if ((match = matchExpr[type].exec(soFar)) && (!preFilters[type] || (match = preFilters[type](match)))) {
                    matched = match.shift();
                    tokens.push({
                        value: matched,
                        type: type,
                        matches: match
                    });
                    soFar = soFar.slice(matched.length);
                }
            }
            if (!matched) {
                break;
            }
        }
        return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) : tokenCache(selector, groups).slice(0);
    };
    function toSelector(tokens) {
        var i = 0, len = tokens.length, selector = "";
        for (;i < len; i++) {
            selector += tokens[i].value;
        }
        return selector;
    }
    function addCombinator(matcher, combinator, base) {
        var dir = combinator.dir, checkNonElements = base && dir === "parentNode", doneName = done++;
        return combinator.first ? function(elem, context, xml) {
            while (elem = elem[dir]) {
                if (elem.nodeType === 1 || checkNonElements) {
                    return matcher(elem, context, xml);
                }
            }
        } : function(elem, context, xml) {
            var oldCache, outerCache, newCache = [ dirruns, doneName ];
            if (xml) {
                while (elem = elem[dir]) {
                    if (elem.nodeType === 1 || checkNonElements) {
                        if (matcher(elem, context, xml)) {
                            return true;
                        }
                    }
                }
            } else {
                while (elem = elem[dir]) {
                    if (elem.nodeType === 1 || checkNonElements) {
                        outerCache = elem[expando] || (elem[expando] = {});
                        if ((oldCache = outerCache[dir]) && oldCache[0] === dirruns && oldCache[1] === doneName) {
                            return newCache[2] = oldCache[2];
                        } else {
                            outerCache[dir] = newCache;
                            if (newCache[2] = matcher(elem, context, xml)) {
                                return true;
                            }
                        }
                    }
                }
            }
        };
    }
    function elementMatcher(matchers) {
        return matchers.length > 1 ? function(elem, context, xml) {
            var i = matchers.length;
            while (i--) {
                if (!matchers[i](elem, context, xml)) {
                    return false;
                }
            }
            return true;
        } : matchers[0];
    }
    function multipleContexts(selector, contexts, results) {
        var i = 0, len = contexts.length;
        for (;i < len; i++) {
            Sizzle(selector, contexts[i], results);
        }
        return results;
    }
    function condense(unmatched, map, filter, context, xml) {
        var elem, newUnmatched = [], i = 0, len = unmatched.length, mapped = map != null;
        for (;i < len; i++) {
            if (elem = unmatched[i]) {
                if (!filter || filter(elem, context, xml)) {
                    newUnmatched.push(elem);
                    if (mapped) {
                        map.push(i);
                    }
                }
            }
        }
        return newUnmatched;
    }
    function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
        if (postFilter && !postFilter[expando]) {
            postFilter = setMatcher(postFilter);
        }
        if (postFinder && !postFinder[expando]) {
            postFinder = setMatcher(postFinder, postSelector);
        }
        return markFunction(function(seed, results, context, xml) {
            var temp, i, elem, preMap = [], postMap = [], preexisting = results.length, elems = seed || multipleContexts(selector || "*", context.nodeType ? [ context ] : context, []), matcherIn = preFilter && (seed || !selector) ? condense(elems, preMap, preFilter, context, xml) : elems, matcherOut = matcher ? postFinder || (seed ? preFilter : preexisting || postFilter) ? [] : results : matcherIn;
            if (matcher) {
                matcher(matcherIn, matcherOut, context, xml);
            }
            if (postFilter) {
                temp = condense(matcherOut, postMap);
                postFilter(temp, [], context, xml);
                i = temp.length;
                while (i--) {
                    if (elem = temp[i]) {
                        matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem);
                    }
                }
            }
            if (seed) {
                if (postFinder || preFilter) {
                    if (postFinder) {
                        temp = [];
                        i = matcherOut.length;
                        while (i--) {
                            if (elem = matcherOut[i]) {
                                temp.push(matcherIn[i] = elem);
                            }
                        }
                        postFinder(null, matcherOut = [], temp, xml);
                    }
                    i = matcherOut.length;
                    while (i--) {
                        if ((elem = matcherOut[i]) && (temp = postFinder ? indexOf(seed, elem) : preMap[i]) > -1) {
                            seed[temp] = !(results[temp] = elem);
                        }
                    }
                }
            } else {
                matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut);
                if (postFinder) {
                    postFinder(null, results, matcherOut, xml);
                } else {
                    push.apply(results, matcherOut);
                }
            }
        });
    }
    function matcherFromTokens(tokens) {
        var checkContext, matcher, j, len = tokens.length, leadingRelative = Expr.relative[tokens[0].type], implicitRelative = leadingRelative || Expr.relative[" "], i = leadingRelative ? 1 : 0, matchContext = addCombinator(function(elem) {
            return elem === checkContext;
        }, implicitRelative, true), matchAnyContext = addCombinator(function(elem) {
            return indexOf(checkContext, elem) > -1;
        }, implicitRelative, true), matchers = [ function(elem, context, xml) {
            var ret = !leadingRelative && (xml || context !== outermostContext) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml));
            checkContext = null;
            return ret;
        } ];
        for (;i < len; i++) {
            if (matcher = Expr.relative[tokens[i].type]) {
                matchers = [ addCombinator(elementMatcher(matchers), matcher) ];
            } else {
                matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches);
                if (matcher[expando]) {
                    j = ++i;
                    for (;j < len; j++) {
                        if (Expr.relative[tokens[j].type]) {
                            break;
                        }
                    }
                    return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector(tokens.slice(0, i - 1).concat({
                        value: tokens[i - 2].type === " " ? "*" : ""
                    })).replace(rtrim, "$1"), matcher, i < j && matcherFromTokens(tokens.slice(i, j)), j < len && matcherFromTokens(tokens = tokens.slice(j)), j < len && toSelector(tokens));
                }
                matchers.push(matcher);
            }
        }
        return elementMatcher(matchers);
    }
    function matcherFromGroupMatchers(elementMatchers, setMatchers) {
        var bySet = setMatchers.length > 0, byElement = elementMatchers.length > 0, superMatcher = function(seed, context, xml, results, outermost) {
            var elem, j, matcher, matchedCount = 0, i = "0", unmatched = seed && [], setMatched = [], contextBackup = outermostContext, elems = seed || byElement && Expr.find["TAG"]("*", outermost), dirrunsUnique = dirruns += contextBackup == null ? 1 : Math.random() || .1, len = elems.length;
            if (outermost) {
                outermostContext = context !== document && context;
            }
            for (;i !== len && (elem = elems[i]) != null; i++) {
                if (byElement && elem) {
                    j = 0;
                    while (matcher = elementMatchers[j++]) {
                        if (matcher(elem, context, xml)) {
                            results.push(elem);
                            break;
                        }
                    }
                    if (outermost) {
                        dirruns = dirrunsUnique;
                    }
                }
                if (bySet) {
                    if (elem = !matcher && elem) {
                        matchedCount--;
                    }
                    if (seed) {
                        unmatched.push(elem);
                    }
                }
            }
            matchedCount += i;
            if (bySet && i !== matchedCount) {
                j = 0;
                while (matcher = setMatchers[j++]) {
                    matcher(unmatched, setMatched, context, xml);
                }
                if (seed) {
                    if (matchedCount > 0) {
                        while (i--) {
                            if (!(unmatched[i] || setMatched[i])) {
                                setMatched[i] = pop.call(results);
                            }
                        }
                    }
                    setMatched = condense(setMatched);
                }
                push.apply(results, setMatched);
                if (outermost && !seed && setMatched.length > 0 && matchedCount + setMatchers.length > 1) {
                    Sizzle.uniqueSort(results);
                }
            }
            if (outermost) {
                dirruns = dirrunsUnique;
                outermostContext = contextBackup;
            }
            return unmatched;
        };
        return bySet ? markFunction(superMatcher) : superMatcher;
    }
    compile = Sizzle.compile = function(selector, match) {
        var i, setMatchers = [], elementMatchers = [], cached = compilerCache[selector + " "];
        if (!cached) {
            if (!match) {
                match = tokenize(selector);
            }
            i = match.length;
            while (i--) {
                cached = matcherFromTokens(match[i]);
                if (cached[expando]) {
                    setMatchers.push(cached);
                } else {
                    elementMatchers.push(cached);
                }
            }
            cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers));
            cached.selector = selector;
        }
        return cached;
    };
    select = Sizzle.select = function(selector, context, results, seed) {
        var i, tokens, token, type, find, compiled = typeof selector === "function" && selector, match = !seed && tokenize(selector = compiled.selector || selector);
        results = results || [];
        if (match.length === 1) {
            tokens = match[0] = match[0].slice(0);
            if (tokens.length > 2 && (token = tokens[0]).type === "ID" && support.getById && context.nodeType === 9 && documentIsHTML && Expr.relative[tokens[1].type]) {
                context = (Expr.find["ID"](token.matches[0].replace(runescape, funescape), context) || [])[0];
                if (!context) {
                    return results;
                } else if (compiled) {
                    context = context.parentNode;
                }
                selector = selector.slice(tokens.shift().value.length);
            }
            i = matchExpr["needsContext"].test(selector) ? 0 : tokens.length;
            while (i--) {
                token = tokens[i];
                if (Expr.relative[type = token.type]) {
                    break;
                }
                if (find = Expr.find[type]) {
                    if (seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context)) {
                        tokens.splice(i, 1);
                        selector = seed.length && toSelector(tokens);
                        if (!selector) {
                            push.apply(results, seed);
                            return results;
                        }
                        break;
                    }
                }
            }
        }
        (compiled || compile(selector, match))(seed, context, !documentIsHTML, results, rsibling.test(selector) && testContext(context.parentNode) || context);
        return results;
    };
    support.sortStable = expando.split("").sort(sortOrder).join("") === expando;
    support.detectDuplicates = !!hasDuplicate;
    setDocument();
    support.sortDetached = assert(function(div1) {
        return div1.compareDocumentPosition(document.createElement("div")) & 1;
    });
    if (!assert(function(div) {
        div.innerHTML = "<a href='#'></a>";
        return div.firstChild.getAttribute("href") === "#";
    })) {
        addHandle("type|href|height|width", function(elem, name, isXML) {
            if (!isXML) {
                return elem.getAttribute(name, name.toLowerCase() === "type" ? 1 : 2);
            }
        });
    }
    if (!support.attributes || !assert(function(div) {
        div.innerHTML = "<input/>";
        div.firstChild.setAttribute("value", "");
        return div.firstChild.getAttribute("value") === "";
    })) {
        addHandle("value", function(elem, name, isXML) {
            if (!isXML && elem.nodeName.toLowerCase() === "input") {
                return elem.defaultValue;
            }
        });
    }
    if (!assert(function(div) {
        return div.getAttribute("disabled") == null;
    })) {
        addHandle(booleans, function(elem, name, isXML) {
            var val;
            if (!isXML) {
                return elem[name] === true ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
            }
        });
    }
    if (typeof define === "function") {
        _M_["jquery/cmd/sizzle"] = function(id, module) {
            return function() {
                if (!module[id].executed) {
                    var exports = function(__id__, __mod__) {
                        return Sizzle;
                    }(id, module);
                    if (exports == undefined) {
                        exports = module[id];
                    }
                    module[id] = function() {
                        return exports;
                    };
                    module[id].executed = true;
                }
                return module[id]();
            };
        }("jquery/cmd/sizzle", (_M_["jquery/cmd/sizzle"] = {}) && _M_);
    } else if (typeof module !== "undefined" && module.exports) {
        module.exports = Sizzle;
    } else {
        window.Sizzle = Sizzle;
    }
})(window);

_M_["jquery/cmd/traversing"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rneedsContext = __mod__["jquery/cmd/traversing/var/rneedsContext"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/traversing/findFilter"]();
                __mod__["jquery/cmd/selector"]();
                var rparentsprev = /^(?:parents|prev(?:Until|All))/, guaranteedUnique = {
                    children: true,
                    contents: true,
                    next: true,
                    prev: true
                };
                jQuery.extend({
                    dir: function(elem, dir, until) {
                        var matched = [], cur = elem[dir];
                        while (cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery(cur).is(until))) {
                            if (cur.nodeType === 1) {
                                matched.push(cur);
                            }
                            cur = cur[dir];
                        }
                        return matched;
                    },
                    sibling: function(n, elem) {
                        var r = [];
                        for (;n; n = n.nextSibling) {
                            if (n.nodeType === 1 && n !== elem) {
                                r.push(n);
                            }
                        }
                        return r;
                    }
                });
                jQuery.fn.extend({
                    has: function(target) {
                        var i, targets = jQuery(target, this), len = targets.length;
                        return this.filter(function() {
                            for (i = 0; i < len; i++) {
                                if (jQuery.contains(this, targets[i])) {
                                    return true;
                                }
                            }
                        });
                    },
                    closest: function(selectors, context) {
                        var cur, i = 0, l = this.length, matched = [], pos = rneedsContext.test(selectors) || typeof selectors !== "string" ? jQuery(selectors, context || this.context) : 0;
                        for (;i < l; i++) {
                            for (cur = this[i]; cur && cur !== context; cur = cur.parentNode) {
                                if (cur.nodeType < 11 && (pos ? pos.index(cur) > -1 : cur.nodeType === 1 && jQuery.find.matchesSelector(cur, selectors))) {
                                    matched.push(cur);
                                    break;
                                }
                            }
                        }
                        return this.pushStack(matched.length > 1 ? jQuery.unique(matched) : matched);
                    },
                    index: function(elem) {
                        if (!elem) {
                            return this[0] && this[0].parentNode ? this.first().prevAll().length : -1;
                        }
                        if (typeof elem === "string") {
                            return jQuery.inArray(this[0], jQuery(elem));
                        }
                        return jQuery.inArray(elem.jquery ? elem[0] : elem, this);
                    },
                    add: function(selector, context) {
                        return this.pushStack(jQuery.unique(jQuery.merge(this.get(), jQuery(selector, context))));
                    },
                    addBack: function(selector) {
                        return this.add(selector == null ? this.prevObject : this.prevObject.filter(selector));
                    }
                });
                function sibling(cur, dir) {
                    do {
                        cur = cur[dir];
                    } while (cur && cur.nodeType !== 1);
                    return cur;
                }
                jQuery.each({
                    parent: function(elem) {
                        var parent = elem.parentNode;
                        return parent && parent.nodeType !== 11 ? parent : null;
                    },
                    parents: function(elem) {
                        return jQuery.dir(elem, "parentNode");
                    },
                    parentsUntil: function(elem, i, until) {
                        return jQuery.dir(elem, "parentNode", until);
                    },
                    next: function(elem) {
                        return sibling(elem, "nextSibling");
                    },
                    prev: function(elem) {
                        return sibling(elem, "previousSibling");
                    },
                    nextAll: function(elem) {
                        return jQuery.dir(elem, "nextSibling");
                    },
                    prevAll: function(elem) {
                        return jQuery.dir(elem, "previousSibling");
                    },
                    nextUntil: function(elem, i, until) {
                        return jQuery.dir(elem, "nextSibling", until);
                    },
                    prevUntil: function(elem, i, until) {
                        return jQuery.dir(elem, "previousSibling", until);
                    },
                    siblings: function(elem) {
                        return jQuery.sibling((elem.parentNode || {}).firstChild, elem);
                    },
                    children: function(elem) {
                        return jQuery.sibling(elem.firstChild);
                    },
                    contents: function(elem) {
                        return jQuery.nodeName(elem, "iframe") ? elem.contentDocument || elem.contentWindow.document : jQuery.merge([], elem.childNodes);
                    }
                }, function(name, fn) {
                    jQuery.fn[name] = function(until, selector) {
                        var ret = jQuery.map(this, fn, until);
                        if (name.slice(-5) !== "Until") {
                            selector = until;
                        }
                        if (selector && typeof selector === "string") {
                            ret = jQuery.filter(selector, ret);
                        }
                        if (this.length > 1) {
                            if (!guaranteedUnique[name]) {
                                ret = jQuery.unique(ret);
                            }
                            if (rparentsprev.test(name)) {
                                ret = ret.reverse();
                            }
                        }
                        return this.pushStack(ret);
                    };
                });
                return jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/traversing", (_M_["jquery/cmd/traversing"] = {}) && _M_);

_M_["jquery/cmd/traversing/var/rneedsContext"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/selector"]();
                __mod__[__id__] = jQuery.expr.match.needsContext;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/traversing/var/rneedsContext", (_M_["jquery/cmd/traversing/var/rneedsContext"] = {}) && _M_);

_M_["jquery/cmd/core/init"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rsingleTag = __mod__["jquery/cmd/core/var/rsingleTag"]();
                __mod__["jquery/cmd/traversing/findFilter"]();
                var rootjQuery, document = window.document, rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/, init = jQuery.fn.init = function(selector, context) {
                    var match, elem;
                    if (!selector) {
                        return this;
                    }
                    if (typeof selector === "string") {
                        if (selector.charAt(0) === "<" && selector.charAt(selector.length - 1) === ">" && selector.length >= 3) {
                            match = [ null, selector, null ];
                        } else {
                            match = rquickExpr.exec(selector);
                        }
                        if (match && (match[1] || !context)) {
                            if (match[1]) {
                                context = context instanceof jQuery ? context[0] : context;
                                jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, true));
                                if (rsingleTag.test(match[1]) && jQuery.isPlainObject(context)) {
                                    for (match in context) {
                                        if (jQuery.isFunction(this[match])) {
                                            this[match](context[match]);
                                        } else {
                                            this.attr(match, context[match]);
                                        }
                                    }
                                }
                                return this;
                            } else {
                                elem = document.getElementById(match[2]);
                                if (elem && elem.parentNode) {
                                    if (elem.id !== match[2]) {
                                        return rootjQuery.find(selector);
                                    }
                                    this.length = 1;
                                    this[0] = elem;
                                }
                                this.context = document;
                                this.selector = selector;
                                return this;
                            }
                        } else if (!context || context.jquery) {
                            return (context || rootjQuery).find(selector);
                        } else {
                            return this.constructor(context).find(selector);
                        }
                    } else if (selector.nodeType) {
                        this.context = this[0] = selector;
                        this.length = 1;
                        return this;
                    } else if (jQuery.isFunction(selector)) {
                        return typeof rootjQuery.ready !== "undefined" ? rootjQuery.ready(selector) : selector(jQuery);
                    }
                    if (selector.selector !== undefined) {
                        this.selector = selector.selector;
                        this.context = selector.context;
                    }
                    return jQuery.makeArray(selector, this);
                };
                init.prototype = jQuery.fn;
                rootjQuery = jQuery(document);
                __mod__[__id__] = init;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/core/init", (_M_["jquery/cmd/core/init"] = {}) && _M_);

_M_["jquery/cmd/core/var/rsingleTag"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = /^<(\w+)\s*\/?>(?:<\/\1>|)$/;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/core/var/rsingleTag", (_M_["jquery/cmd/core/var/rsingleTag"] = {}) && _M_);

_M_["jquery/cmd/traversing/findFilter"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var indexOf = __mod__["jquery/cmd/var/indexOf"]();
                var rneedsContext = __mod__["jquery/cmd/traversing/var/rneedsContext"]();
                __mod__["jquery/cmd/selector"]();
                var risSimple = /^.[^:#\[\.,]*$/;
                function winnow(elements, qualifier, not) {
                    if (jQuery.isFunction(qualifier)) {
                        return jQuery.grep(elements, function(elem, i) {
                            return !!qualifier.call(elem, i, elem) !== not;
                        });
                    }
                    if (qualifier.nodeType) {
                        return jQuery.grep(elements, function(elem) {
                            return elem === qualifier !== not;
                        });
                    }
                    if (typeof qualifier === "string") {
                        if (risSimple.test(qualifier)) {
                            return jQuery.filter(qualifier, elements, not);
                        }
                        qualifier = jQuery.filter(qualifier, elements);
                    }
                    return jQuery.grep(elements, function(elem) {
                        return jQuery.inArray(elem, qualifier) >= 0 !== not;
                    });
                }
                jQuery.filter = function(expr, elems, not) {
                    var elem = elems[0];
                    if (not) {
                        expr = ":not(" + expr + ")";
                    }
                    return elems.length === 1 && elem.nodeType === 1 ? jQuery.find.matchesSelector(elem, expr) ? [ elem ] : [] : jQuery.find.matches(expr, jQuery.grep(elems, function(elem) {
                        return elem.nodeType === 1;
                    }));
                };
                jQuery.fn.extend({
                    find: function(selector) {
                        var i, ret = [], self = this, len = self.length;
                        if (typeof selector !== "string") {
                            return this.pushStack(jQuery(selector).filter(function() {
                                for (i = 0; i < len; i++) {
                                    if (jQuery.contains(self[i], this)) {
                                        return true;
                                    }
                                }
                            }));
                        }
                        for (i = 0; i < len; i++) {
                            jQuery.find(selector, self[i], ret);
                        }
                        ret = this.pushStack(len > 1 ? jQuery.unique(ret) : ret);
                        ret.selector = this.selector ? this.selector + " " + selector : selector;
                        return ret;
                    },
                    filter: function(selector) {
                        return this.pushStack(winnow(this, selector || [], false));
                    },
                    not: function(selector) {
                        return this.pushStack(winnow(this, selector || [], true));
                    },
                    is: function(selector) {
                        return !!winnow(this, typeof selector === "string" && rneedsContext.test(selector) ? jQuery(selector) : selector || [], false).length;
                    }
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/traversing/findFilter", (_M_["jquery/cmd/traversing/findFilter"] = {}) && _M_);

_M_["jquery/cmd/callbacks"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rnotwhite = __mod__["jquery/cmd/var/rnotwhite"]();
                var optionsCache = {};
                function createOptions(options) {
                    var object = optionsCache[options] = {};
                    jQuery.each(options.match(rnotwhite) || [], function(_, flag) {
                        object[flag] = true;
                    });
                    return object;
                }
                jQuery.Callbacks = function(options) {
                    options = typeof options === "string" ? optionsCache[options] || createOptions(options) : jQuery.extend({}, options);
                    var firing, memory, fired, firingLength, firingIndex, firingStart, list = [], stack = !options.once && [], fire = function(data) {
                        memory = options.memory && data;
                        fired = true;
                        firingIndex = firingStart || 0;
                        firingStart = 0;
                        firingLength = list.length;
                        firing = true;
                        for (;list && firingIndex < firingLength; firingIndex++) {
                            if (list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
                                memory = false;
                                break;
                            }
                        }
                        firing = false;
                        if (list) {
                            if (stack) {
                                if (stack.length) {
                                    fire(stack.shift());
                                }
                            } else if (memory) {
                                list = [];
                            } else {
                                self.disable();
                            }
                        }
                    }, self = {
                        add: function() {
                            if (list) {
                                var start = list.length;
                                (function add(args) {
                                    jQuery.each(args, function(_, arg) {
                                        var type = jQuery.type(arg);
                                        if (type === "function") {
                                            if (!options.unique || !self.has(arg)) {
                                                list.push(arg);
                                            }
                                        } else if (arg && arg.length && type !== "string") {
                                            add(arg);
                                        }
                                    });
                                })(arguments);
                                if (firing) {
                                    firingLength = list.length;
                                } else if (memory) {
                                    firingStart = start;
                                    fire(memory);
                                }
                            }
                            return this;
                        },
                        remove: function() {
                            if (list) {
                                jQuery.each(arguments, function(_, arg) {
                                    var index;
                                    while ((index = jQuery.inArray(arg, list, index)) > -1) {
                                        list.splice(index, 1);
                                        if (firing) {
                                            if (index <= firingLength) {
                                                firingLength--;
                                            }
                                            if (index <= firingIndex) {
                                                firingIndex--;
                                            }
                                        }
                                    }
                                });
                            }
                            return this;
                        },
                        has: function(fn) {
                            return fn ? jQuery.inArray(fn, list) > -1 : !!(list && list.length);
                        },
                        empty: function() {
                            list = [];
                            firingLength = 0;
                            return this;
                        },
                        disable: function() {
                            list = stack = memory = undefined;
                            return this;
                        },
                        disabled: function() {
                            return !list;
                        },
                        lock: function() {
                            stack = undefined;
                            if (!memory) {
                                self.disable();
                            }
                            return this;
                        },
                        locked: function() {
                            return !stack;
                        },
                        fireWith: function(context, args) {
                            if (list && (!fired || stack)) {
                                args = args || [];
                                args = [ context, args.slice ? args.slice() : args ];
                                if (firing) {
                                    stack.push(args);
                                } else {
                                    fire(args);
                                }
                            }
                            return this;
                        },
                        fire: function() {
                            self.fireWith(this, arguments);
                            return this;
                        },
                        fired: function() {
                            return !!fired;
                        }
                    };
                    return self;
                };
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/callbacks", (_M_["jquery/cmd/callbacks"] = {}) && _M_);

_M_["jquery/cmd/var/rnotwhite"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = /\S+/g;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/rnotwhite", (_M_["jquery/cmd/var/rnotwhite"] = {}) && _M_);

_M_["jquery/cmd/deferred"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var slice = __mod__["jquery/cmd/var/slice"]();
                __mod__["jquery/cmd/callbacks"]();
                jQuery.extend({
                    Deferred: function(func) {
                        var tuples = [ [ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ], [ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ], [ "notify", "progress", jQuery.Callbacks("memory") ] ], state = "pending", promise = {
                            state: function() {
                                return state;
                            },
                            always: function() {
                                deferred.done(arguments).fail(arguments);
                                return this;
                            },
                            then: function() {
                                var fns = arguments;
                                return jQuery.Deferred(function(newDefer) {
                                    jQuery.each(tuples, function(i, tuple) {
                                        var fn = jQuery.isFunction(fns[i]) && fns[i];
                                        deferred[tuple[1]](function() {
                                            var returned = fn && fn.apply(this, arguments);
                                            if (returned && jQuery.isFunction(returned.promise)) {
                                                returned.promise().done(newDefer.resolve).fail(newDefer.reject).progress(newDefer.notify);
                                            } else {
                                                newDefer[tuple[0] + "With"](this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments);
                                            }
                                        });
                                    });
                                    fns = null;
                                }).promise();
                            },
                            promise: function(obj) {
                                return obj != null ? jQuery.extend(obj, promise) : promise;
                            }
                        }, deferred = {};
                        promise.pipe = promise.then;
                        jQuery.each(tuples, function(i, tuple) {
                            var list = tuple[2], stateString = tuple[3];
                            promise[tuple[1]] = list.add;
                            if (stateString) {
                                list.add(function() {
                                    state = stateString;
                                }, tuples[i ^ 1][2].disable, tuples[2][2].lock);
                            }
                            deferred[tuple[0]] = function() {
                                deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments);
                                return this;
                            };
                            deferred[tuple[0] + "With"] = list.fireWith;
                        });
                        promise.promise(deferred);
                        if (func) {
                            func.call(deferred, deferred);
                        }
                        return deferred;
                    },
                    when: function(subordinate) {
                        var i = 0, resolveValues = slice.call(arguments), length = resolveValues.length, remaining = length !== 1 || subordinate && jQuery.isFunction(subordinate.promise) ? length : 0, deferred = remaining === 1 ? subordinate : jQuery.Deferred(), updateFunc = function(i, contexts, values) {
                            return function(value) {
                                contexts[i] = this;
                                values[i] = arguments.length > 1 ? slice.call(arguments) : value;
                                if (values === progressValues) {
                                    deferred.notifyWith(contexts, values);
                                } else if (!--remaining) {
                                    deferred.resolveWith(contexts, values);
                                }
                            };
                        }, progressValues, progressContexts, resolveContexts;
                        if (length > 1) {
                            progressValues = new Array(length);
                            progressContexts = new Array(length);
                            resolveContexts = new Array(length);
                            for (;i < length; i++) {
                                if (resolveValues[i] && jQuery.isFunction(resolveValues[i].promise)) {
                                    resolveValues[i].promise().done(updateFunc(i, resolveContexts, resolveValues)).fail(deferred.reject).progress(updateFunc(i, progressContexts, progressValues));
                                } else {
                                    --remaining;
                                }
                            }
                        }
                        if (!remaining) {
                            deferred.resolveWith(resolveContexts, resolveValues);
                        }
                        return deferred.promise();
                    }
                });
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/deferred", (_M_["jquery/cmd/deferred"] = {}) && _M_);

_M_["jquery/cmd/core/ready"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/deferred"]();
                var readyList;
                jQuery.fn.ready = function(fn) {
                    jQuery.ready.promise().done(fn);
                    return this;
                };
                jQuery.extend({
                    isReady: false,
                    readyWait: 1,
                    holdReady: function(hold) {
                        if (hold) {
                            jQuery.readyWait++;
                        } else {
                            jQuery.ready(true);
                        }
                    },
                    ready: function(wait) {
                        if (arguments.length === 1 && "function" === typeof wait) {
                            Q.libReady(wait);
                            return;
                        }
                        if (wait === true ? --jQuery.readyWait : jQuery.isReady) {
                            return;
                        }
                        if (!document.body) {
                            return setTimeout(jQuery.ready);
                        }
                        jQuery.isReady = true;
                        if (wait !== true && --jQuery.readyWait > 0) {
                            return;
                        }
                        readyList.resolveWith(document, [ jQuery ]);
                        if (jQuery.fn.triggerHandler) {
                            jQuery(document).triggerHandler("ready");
                            jQuery(document).off("ready");
                        }
                    }
                });
                function detach() {
                    if (document.addEventListener) {
                        document.removeEventListener("DOMContentLoaded", completed, false);
                        window.removeEventListener("load", completed, false);
                    } else {
                        document.detachEvent("onreadystatechange", completed);
                        window.detachEvent("onload", completed);
                    }
                }
                function completed() {
                    if (document.addEventListener || event.type === "load" || document.readyState === "complete") {
                        detach();
                        jQuery.ready();
                    }
                }
                jQuery.ready.promise = function(obj) {
                    if (!readyList) {
                        readyList = jQuery.Deferred();
                        if (document.readyState === "complete") {
                            setTimeout(jQuery.ready);
                        } else if (document.addEventListener) {
                            document.addEventListener("DOMContentLoaded", completed, false);
                            window.addEventListener("load", completed, false);
                        } else {
                            document.attachEvent("onreadystatechange", completed);
                            window.attachEvent("onload", completed);
                            var top = false;
                            try {
                                top = window.frameElement == null && document.documentElement;
                            } catch (e) {}
                            if (top && top.doScroll) {
                                (function doScrollCheck() {
                                    if (!jQuery.isReady) {
                                        try {
                                            top.doScroll("left");
                                        } catch (e) {
                                            return setTimeout(doScrollCheck, 50);
                                        }
                                        detach();
                                        jQuery.ready();
                                    }
                                })();
                            }
                        }
                    }
                    return readyList.promise(obj);
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/core/ready", (_M_["jquery/cmd/core/ready"] = {}) && _M_);

_M_["jquery/cmd/support"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var strundefined = __mod__["jquery/cmd/var/strundefined"]();
                var support = __mod__["jquery/cmd/var/support"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/core/ready"]();
                var i;
                for (i in jQuery(support)) {
                    break;
                }
                support.ownLast = i !== "0";
                support.inlineBlockNeedsLayout = false;
                jQuery(function() {
                    var val, div, body, container;
                    body = document.getElementsByTagName("body")[0];
                    if (!body || !body.style) {
                        return;
                    }
                    div = document.createElement("div");
                    container = document.createElement("div");
                    container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
                    body.appendChild(container).appendChild(div);
                    if (typeof div.style.zoom !== strundefined) {
                        div.style.cssText = "display:inline;margin:0;border:0;padding:1px;width:1px;zoom:1";
                        support.inlineBlockNeedsLayout = val = div.offsetWidth === 3;
                        if (val) {
                            body.style.zoom = 1;
                        }
                    }
                    body.removeChild(container);
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/support", (_M_["jquery/cmd/support"] = {}) && _M_);

_M_["jquery/cmd/var/strundefined"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = typeof undefined;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/strundefined", (_M_["jquery/cmd/var/strundefined"] = {}) && _M_);

_M_["jquery/cmd/data"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var deletedIds = __mod__["jquery/cmd/var/deletedIds"]();
                var support = __mod__["jquery/cmd/data/support"]();
                __mod__["jquery/cmd/data/accepts"]();
                var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/, rmultiDash = /([A-Z])/g;
                function dataAttr(elem, key, data) {
                    if (data === undefined && elem.nodeType === 1) {
                        var name = "data-" + key.replace(rmultiDash, "-$1").toLowerCase();
                        data = elem.getAttribute(name);
                        if (typeof data === "string") {
                            try {
                                data = data === "true" ? true : data === "false" ? false : data === "null" ? null : +data + "" === data ? +data : rbrace.test(data) ? jQuery.parseJSON(data) : data;
                            } catch (e) {}
                            jQuery.data(elem, key, data);
                        } else {
                            data = undefined;
                        }
                    }
                    return data;
                }
                function isEmptyDataObject(obj) {
                    var name;
                    for (name in obj) {
                        if (name === "data" && jQuery.isEmptyObject(obj[name])) {
                            continue;
                        }
                        if (name !== "toJSON") {
                            return false;
                        }
                    }
                    return true;
                }
                function internalData(elem, name, data, pvt) {
                    if (!jQuery.acceptData(elem)) {
                        return;
                    }
                    var ret, thisCache, internalKey = jQuery.expando, isNode = elem.nodeType, cache = isNode ? jQuery.cache : elem, id = isNode ? elem[internalKey] : elem[internalKey] && internalKey;
                    if ((!id || !cache[id] || !pvt && !cache[id].data) && data === undefined && typeof name === "string") {
                        return;
                    }
                    if (!id) {
                        if (isNode) {
                            id = elem[internalKey] = deletedIds.pop() || jQuery.guid++;
                        } else {
                            id = internalKey;
                        }
                    }
                    if (!cache[id]) {
                        cache[id] = isNode ? {} : {
                            toJSON: jQuery.noop
                        };
                    }
                    if (typeof name === "object" || typeof name === "function") {
                        if (pvt) {
                            cache[id] = jQuery.extend(cache[id], name);
                        } else {
                            cache[id].data = jQuery.extend(cache[id].data, name);
                        }
                    }
                    thisCache = cache[id];
                    if (!pvt) {
                        if (!thisCache.data) {
                            thisCache.data = {};
                        }
                        thisCache = thisCache.data;
                    }
                    if (data !== undefined) {
                        thisCache[jQuery.camelCase(name)] = data;
                    }
                    if (typeof name === "string") {
                        ret = thisCache[name];
                        if (ret == null) {
                            ret = thisCache[jQuery.camelCase(name)];
                        }
                    } else {
                        ret = thisCache;
                    }
                    return ret;
                }
                function internalRemoveData(elem, name, pvt) {
                    if (!jQuery.acceptData(elem)) {
                        return;
                    }
                    var thisCache, i, isNode = elem.nodeType, cache = isNode ? jQuery.cache : elem, id = isNode ? elem[jQuery.expando] : jQuery.expando;
                    if (!cache[id]) {
                        return;
                    }
                    if (name) {
                        thisCache = pvt ? cache[id] : cache[id].data;
                        if (thisCache) {
                            if (!jQuery.isArray(name)) {
                                if (name in thisCache) {
                                    name = [ name ];
                                } else {
                                    name = jQuery.camelCase(name);
                                    if (name in thisCache) {
                                        name = [ name ];
                                    } else {
                                        name = name.split(" ");
                                    }
                                }
                            } else {
                                name = name.concat(jQuery.map(name, jQuery.camelCase));
                            }
                            i = name.length;
                            while (i--) {
                                delete thisCache[name[i]];
                            }
                            if (pvt ? !isEmptyDataObject(thisCache) : !jQuery.isEmptyObject(thisCache)) {
                                return;
                            }
                        }
                    }
                    if (!pvt) {
                        delete cache[id].data;
                        if (!isEmptyDataObject(cache[id])) {
                            return;
                        }
                    }
                    if (isNode) {
                        jQuery.cleanData([ elem ], true);
                    } else if (support.deleteExpando || cache != cache.window) {
                        delete cache[id];
                    } else {
                        cache[id] = null;
                    }
                }
                jQuery.extend({
                    cache: {},
                    noData: {
                        "applet ": true,
                        "embed ": true,
                        "object ": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
                    },
                    hasData: function(elem) {
                        elem = elem.nodeType ? jQuery.cache[elem[jQuery.expando]] : elem[jQuery.expando];
                        return !!elem && !isEmptyDataObject(elem);
                    },
                    data: function(elem, name, data) {
                        return internalData(elem, name, data);
                    },
                    removeData: function(elem, name) {
                        return internalRemoveData(elem, name);
                    },
                    _data: function(elem, name, data) {
                        return internalData(elem, name, data, true);
                    },
                    _removeData: function(elem, name) {
                        return internalRemoveData(elem, name, true);
                    }
                });
                jQuery.fn.extend({
                    data: function(key, value) {
                        var i, name, data, elem = this[0], attrs = elem && elem.attributes;
                        if (key === undefined) {
                            if (this.length) {
                                data = jQuery.data(elem);
                                if (elem.nodeType === 1 && !jQuery._data(elem, "parsedAttrs")) {
                                    i = attrs.length;
                                    while (i--) {
                                        if (attrs[i]) {
                                            name = attrs[i].name;
                                            if (name.indexOf("data-") === 0) {
                                                name = jQuery.camelCase(name.slice(5));
                                                dataAttr(elem, name, data[name]);
                                            }
                                        }
                                    }
                                    jQuery._data(elem, "parsedAttrs", true);
                                }
                            }
                            return data;
                        }
                        if (typeof key === "object") {
                            return this.each(function() {
                                jQuery.data(this, key);
                            });
                        }
                        return arguments.length > 1 ? this.each(function() {
                            jQuery.data(this, key, value);
                        }) : elem ? dataAttr(elem, key, jQuery.data(elem, key)) : undefined;
                    },
                    removeData: function(key) {
                        return this.each(function() {
                            jQuery.removeData(this, key);
                        });
                    }
                });
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/data", (_M_["jquery/cmd/data"] = {}) && _M_);

_M_["jquery/cmd/data/support"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var support = __mod__["jquery/cmd/var/support"]();
                (function() {
                    var div = document.createElement("div");
                    if (support.deleteExpando == null) {
                        support.deleteExpando = true;
                        try {
                            delete div.test;
                        } catch (e) {
                            support.deleteExpando = false;
                        }
                    }
                    div = null;
                })();
                __mod__[__id__] = support;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/data/support", (_M_["jquery/cmd/data/support"] = {}) && _M_);

_M_["jquery/cmd/data/accepts"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                jQuery.acceptData = function(elem) {
                    var noData = jQuery.noData[(elem.nodeName + " ").toLowerCase()], nodeType = +elem.nodeType || 1;
                    return nodeType !== 1 && nodeType !== 9 ? false : !noData || noData !== true && elem.getAttribute("classid") === noData;
                };
                __mod__[__id__] = jQuery.acceptData;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/data/accepts", (_M_["jquery/cmd/data/accepts"] = {}) && _M_);

_M_["jquery/cmd/queue"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/deferred"]();
                __mod__["jquery/cmd/callbacks"]();
                jQuery.extend({
                    queue: function(elem, type, data) {
                        var queue;
                        if (elem) {
                            type = (type || "fx") + "queue";
                            queue = jQuery._data(elem, type);
                            if (data) {
                                if (!queue || jQuery.isArray(data)) {
                                    queue = jQuery._data(elem, type, jQuery.makeArray(data));
                                } else {
                                    queue.push(data);
                                }
                            }
                            return queue || [];
                        }
                    },
                    dequeue: function(elem, type) {
                        type = type || "fx";
                        var queue = jQuery.queue(elem, type), startLength = queue.length, fn = queue.shift(), hooks = jQuery._queueHooks(elem, type), next = function() {
                            jQuery.dequeue(elem, type);
                        };
                        if (fn === "inprogress") {
                            fn = queue.shift();
                            startLength--;
                        }
                        if (fn) {
                            if (type === "fx") {
                                queue.unshift("inprogress");
                            }
                            delete hooks.stop;
                            fn.call(elem, next, hooks);
                        }
                        if (!startLength && hooks) {
                            hooks.empty.fire();
                        }
                    },
                    _queueHooks: function(elem, type) {
                        var key = type + "queueHooks";
                        return jQuery._data(elem, key) || jQuery._data(elem, key, {
                            empty: jQuery.Callbacks("once memory").add(function() {
                                jQuery._removeData(elem, type + "queue");
                                jQuery._removeData(elem, key);
                            })
                        });
                    }
                });
                jQuery.fn.extend({
                    queue: function(type, data) {
                        var setter = 2;
                        if (typeof type !== "string") {
                            data = type;
                            type = "fx";
                            setter--;
                        }
                        if (arguments.length < setter) {
                            return jQuery.queue(this[0], type);
                        }
                        return data === undefined ? this : this.each(function() {
                            var queue = jQuery.queue(this, type, data);
                            jQuery._queueHooks(this, type);
                            if (type === "fx" && queue[0] !== "inprogress") {
                                jQuery.dequeue(this, type);
                            }
                        });
                    },
                    dequeue: function(type) {
                        return this.each(function() {
                            jQuery.dequeue(this, type);
                        });
                    },
                    clearQueue: function(type) {
                        return this.queue(type || "fx", []);
                    },
                    promise: function(type, obj) {
                        var tmp, count = 1, defer = jQuery.Deferred(), elements = this, i = this.length, resolve = function() {
                            if (!--count) {
                                defer.resolveWith(elements, [ elements ]);
                            }
                        };
                        if (typeof type !== "string") {
                            obj = type;
                            type = undefined;
                        }
                        type = type || "fx";
                        while (i--) {
                            tmp = jQuery._data(elements[i], type + "queueHooks");
                            if (tmp && tmp.empty) {
                                count++;
                                tmp.empty.add(resolve);
                            }
                        }
                        resolve();
                        return defer.promise(obj);
                    }
                });
                return jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/queue", (_M_["jquery/cmd/queue"] = {}) && _M_);

_M_["jquery/cmd/queue/delay"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/queue"]();
                __mod__["jquery/cmd/effects"]();
                jQuery.fn.delay = function(time, type) {
                    time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
                    type = type || "fx";
                    return this.queue(type, function(next, hooks) {
                        var timeout = setTimeout(next, time);
                        hooks.stop = function() {
                            clearTimeout(timeout);
                        };
                    });
                };
                __mod__[__id__] = jQuery.fn.delay;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/queue/delay", (_M_["jquery/cmd/queue/delay"] = {}) && _M_);

_M_["jquery/cmd/effects"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var pnum = __mod__["jquery/cmd/var/pnum"]();
                var cssExpand = __mod__["jquery/cmd/css/var/cssExpand"]();
                var isHidden = __mod__["jquery/cmd/css/var/isHidden"]();
                var defaultDisplay = __mod__["jquery/cmd/css/defaultDisplay"]();
                var support = __mod__["jquery/cmd/effects/support"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/effects/Tween"]();
                __mod__["jquery/cmd/queue"]();
                __mod__["jquery/cmd/css"]();
                __mod__["jquery/cmd/deferred"]();
                __mod__["jquery/cmd/traversing"]();
                var fxNow, timerId, rfxtypes = /^(?:toggle|show|hide)$/, rfxnum = new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i"), rrun = /queueHooks$/, animationPrefilters = [ defaultPrefilter ], tweeners = {
                    "*": [ function(prop, value) {
                        var tween = this.createTween(prop, value), target = tween.cur(), parts = rfxnum.exec(value), unit = parts && parts[3] || (jQuery.cssNumber[prop] ? "" : "px"), start = (jQuery.cssNumber[prop] || unit !== "px" && +target) && rfxnum.exec(jQuery.css(tween.elem, prop)), scale = 1, maxIterations = 20;
                        if (start && start[3] !== unit) {
                            unit = unit || start[3];
                            parts = parts || [];
                            start = +target || 1;
                            do {
                                scale = scale || ".5";
                                start = start / scale;
                                jQuery.style(tween.elem, prop, start + unit);
                            } while (scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations);
                        }
                        if (parts) {
                            start = tween.start = +start || +target || 0;
                            tween.unit = unit;
                            tween.end = parts[1] ? start + (parts[1] + 1) * parts[2] : +parts[2];
                        }
                        return tween;
                    } ]
                };
                function createFxNow() {
                    setTimeout(function() {
                        fxNow = undefined;
                    });
                    return fxNow = jQuery.now();
                }
                function genFx(type, includeWidth) {
                    var which, attrs = {
                        height: type
                    }, i = 0;
                    includeWidth = includeWidth ? 1 : 0;
                    for (;i < 4; i += 2 - includeWidth) {
                        which = cssExpand[i];
                        attrs["margin" + which] = attrs["padding" + which] = type;
                    }
                    if (includeWidth) {
                        attrs.opacity = attrs.width = type;
                    }
                    return attrs;
                }
                function createTween(value, prop, animation) {
                    var tween, collection = (tweeners[prop] || []).concat(tweeners["*"]), index = 0, length = collection.length;
                    for (;index < length; index++) {
                        if (tween = collection[index].call(animation, prop, value)) {
                            return tween;
                        }
                    }
                }
                function defaultPrefilter(elem, props, opts) {
                    var prop, value, toggle, tween, hooks, oldfire, display, checkDisplay, anim = this, orig = {}, style = elem.style, hidden = elem.nodeType && isHidden(elem), dataShow = jQuery._data(elem, "fxshow");
                    if (!opts.queue) {
                        hooks = jQuery._queueHooks(elem, "fx");
                        if (hooks.unqueued == null) {
                            hooks.unqueued = 0;
                            oldfire = hooks.empty.fire;
                            hooks.empty.fire = function() {
                                if (!hooks.unqueued) {
                                    oldfire();
                                }
                            };
                        }
                        hooks.unqueued++;
                        anim.always(function() {
                            anim.always(function() {
                                hooks.unqueued--;
                                if (!jQuery.queue(elem, "fx").length) {
                                    hooks.empty.fire();
                                }
                            });
                        });
                    }
                    if (elem.nodeType === 1 && ("height" in props || "width" in props)) {
                        opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];
                        display = jQuery.css(elem, "display");
                        checkDisplay = display === "none" ? jQuery._data(elem, "olddisplay") || defaultDisplay(elem.nodeName) : display;
                        if (checkDisplay === "inline" && jQuery.css(elem, "float") === "none") {
                            if (!support.inlineBlockNeedsLayout || defaultDisplay(elem.nodeName) === "inline") {
                                style.display = "inline-block";
                            } else {
                                style.zoom = 1;
                            }
                        }
                    }
                    if (opts.overflow) {
                        style.overflow = "hidden";
                        if (!support.shrinkWrapBlocks()) {
                            anim.always(function() {
                                style.overflow = opts.overflow[0];
                                style.overflowX = opts.overflow[1];
                                style.overflowY = opts.overflow[2];
                            });
                        }
                    }
                    for (prop in props) {
                        value = props[prop];
                        if (rfxtypes.exec(value)) {
                            delete props[prop];
                            toggle = toggle || value === "toggle";
                            if (value === (hidden ? "hide" : "show")) {
                                if (value === "show" && dataShow && dataShow[prop] !== undefined) {
                                    hidden = true;
                                } else {
                                    continue;
                                }
                            }
                            orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop);
                        } else {
                            display = undefined;
                        }
                    }
                    if (!jQuery.isEmptyObject(orig)) {
                        if (dataShow) {
                            if ("hidden" in dataShow) {
                                hidden = dataShow.hidden;
                            }
                        } else {
                            dataShow = jQuery._data(elem, "fxshow", {});
                        }
                        if (toggle) {
                            dataShow.hidden = !hidden;
                        }
                        if (hidden) {
                            jQuery(elem).show();
                        } else {
                            anim.done(function() {
                                jQuery(elem).hide();
                            });
                        }
                        anim.done(function() {
                            var prop;
                            jQuery._removeData(elem, "fxshow");
                            for (prop in orig) {
                                jQuery.style(elem, prop, orig[prop]);
                            }
                        });
                        for (prop in orig) {
                            tween = createTween(hidden ? dataShow[prop] : 0, prop, anim);
                            if (!(prop in dataShow)) {
                                dataShow[prop] = tween.start;
                                if (hidden) {
                                    tween.end = tween.start;
                                    tween.start = prop === "width" || prop === "height" ? 1 : 0;
                                }
                            }
                        }
                    } else if ((display === "none" ? defaultDisplay(elem.nodeName) : display) === "inline") {
                        style.display = display;
                    }
                }
                function propFilter(props, specialEasing) {
                    var index, name, easing, value, hooks;
                    for (index in props) {
                        name = jQuery.camelCase(index);
                        easing = specialEasing[name];
                        value = props[index];
                        if (jQuery.isArray(value)) {
                            easing = value[1];
                            value = props[index] = value[0];
                        }
                        if (index !== name) {
                            props[name] = value;
                            delete props[index];
                        }
                        hooks = jQuery.cssHooks[name];
                        if (hooks && "expand" in hooks) {
                            value = hooks.expand(value);
                            delete props[name];
                            for (index in value) {
                                if (!(index in props)) {
                                    props[index] = value[index];
                                    specialEasing[index] = easing;
                                }
                            }
                        } else {
                            specialEasing[name] = easing;
                        }
                    }
                }
                function Animation(elem, properties, options) {
                    var result, stopped, index = 0, length = animationPrefilters.length, deferred = jQuery.Deferred().always(function() {
                        delete tick.elem;
                    }), tick = function() {
                        if (stopped) {
                            return false;
                        }
                        var currentTime = fxNow || createFxNow(), remaining = Math.max(0, animation.startTime + animation.duration - currentTime), temp = remaining / animation.duration || 0, percent = 1 - temp, index = 0, length = animation.tweens.length;
                        for (;index < length; index++) {
                            animation.tweens[index].run(percent);
                        }
                        deferred.notifyWith(elem, [ animation, percent, remaining ]);
                        if (percent < 1 && length) {
                            return remaining;
                        } else {
                            deferred.resolveWith(elem, [ animation ]);
                            return false;
                        }
                    }, animation = deferred.promise({
                        elem: elem,
                        props: jQuery.extend({}, properties),
                        opts: jQuery.extend(true, {
                            specialEasing: {}
                        }, options),
                        originalProperties: properties,
                        originalOptions: options,
                        startTime: fxNow || createFxNow(),
                        duration: options.duration,
                        tweens: [],
                        createTween: function(prop, end) {
                            var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
                            animation.tweens.push(tween);
                            return tween;
                        },
                        stop: function(gotoEnd) {
                            var index = 0, length = gotoEnd ? animation.tweens.length : 0;
                            if (stopped) {
                                return this;
                            }
                            stopped = true;
                            for (;index < length; index++) {
                                animation.tweens[index].run(1);
                            }
                            if (gotoEnd) {
                                deferred.resolveWith(elem, [ animation, gotoEnd ]);
                            } else {
                                deferred.rejectWith(elem, [ animation, gotoEnd ]);
                            }
                            return this;
                        }
                    }), props = animation.props;
                    propFilter(props, animation.opts.specialEasing);
                    for (;index < length; index++) {
                        result = animationPrefilters[index].call(animation, elem, props, animation.opts);
                        if (result) {
                            return result;
                        }
                    }
                    jQuery.map(props, createTween, animation);
                    if (jQuery.isFunction(animation.opts.start)) {
                        animation.opts.start.call(elem, animation);
                    }
                    jQuery.fx.timer(jQuery.extend(tick, {
                        elem: elem,
                        anim: animation,
                        queue: animation.opts.queue
                    }));
                    return animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);
                }
                jQuery.Animation = jQuery.extend(Animation, {
                    tweener: function(props, callback) {
                        if (jQuery.isFunction(props)) {
                            callback = props;
                            props = [ "*" ];
                        } else {
                            props = props.split(" ");
                        }
                        var prop, index = 0, length = props.length;
                        for (;index < length; index++) {
                            prop = props[index];
                            tweeners[prop] = tweeners[prop] || [];
                            tweeners[prop].unshift(callback);
                        }
                    },
                    prefilter: function(callback, prepend) {
                        if (prepend) {
                            animationPrefilters.unshift(callback);
                        } else {
                            animationPrefilters.push(callback);
                        }
                    }
                });
                jQuery.speed = function(speed, easing, fn) {
                    var opt = speed && typeof speed === "object" ? jQuery.extend({}, speed) : {
                        complete: fn || !fn && easing || jQuery.isFunction(speed) && speed,
                        duration: speed,
                        easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
                    };
                    opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration : opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[opt.duration] : jQuery.fx.speeds._default;
                    if (opt.queue == null || opt.queue === true) {
                        opt.queue = "fx";
                    }
                    opt.old = opt.complete;
                    opt.complete = function() {
                        if (jQuery.isFunction(opt.old)) {
                            opt.old.call(this);
                        }
                        if (opt.queue) {
                            jQuery.dequeue(this, opt.queue);
                        }
                    };
                    return opt;
                };
                jQuery.fn.extend({
                    fadeTo: function(speed, to, easing, callback) {
                        return this.filter(isHidden).css("opacity", 0).show().end().animate({
                            opacity: to
                        }, speed, easing, callback);
                    },
                    animate: function(prop, speed, easing, callback) {
                        var empty = jQuery.isEmptyObject(prop), optall = jQuery.speed(speed, easing, callback), doAnimation = function() {
                            var anim = Animation(this, jQuery.extend({}, prop), optall);
                            if (empty || jQuery._data(this, "finish")) {
                                anim.stop(true);
                            }
                        };
                        doAnimation.finish = doAnimation;
                        return empty || optall.queue === false ? this.each(doAnimation) : this.queue(optall.queue, doAnimation);
                    },
                    stop: function(type, clearQueue, gotoEnd) {
                        var stopQueue = function(hooks) {
                            var stop = hooks.stop;
                            delete hooks.stop;
                            stop(gotoEnd);
                        };
                        if (typeof type !== "string") {
                            gotoEnd = clearQueue;
                            clearQueue = type;
                            type = undefined;
                        }
                        if (clearQueue && type !== false) {
                            this.queue(type || "fx", []);
                        }
                        return this.each(function() {
                            var dequeue = true, index = type != null && type + "queueHooks", timers = jQuery.timers, data = jQuery._data(this);
                            if (index) {
                                if (data[index] && data[index].stop) {
                                    stopQueue(data[index]);
                                }
                            } else {
                                for (index in data) {
                                    if (data[index] && data[index].stop && rrun.test(index)) {
                                        stopQueue(data[index]);
                                    }
                                }
                            }
                            for (index = timers.length; index--; ) {
                                if (timers[index].elem === this && (type == null || timers[index].queue === type)) {
                                    timers[index].anim.stop(gotoEnd);
                                    dequeue = false;
                                    timers.splice(index, 1);
                                }
                            }
                            if (dequeue || !gotoEnd) {
                                jQuery.dequeue(this, type);
                            }
                        });
                    },
                    finish: function(type) {
                        if (type !== false) {
                            type = type || "fx";
                        }
                        return this.each(function() {
                            var index, data = jQuery._data(this), queue = data[type + "queue"], hooks = data[type + "queueHooks"], timers = jQuery.timers, length = queue ? queue.length : 0;
                            data.finish = true;
                            jQuery.queue(this, type, []);
                            if (hooks && hooks.stop) {
                                hooks.stop.call(this, true);
                            }
                            for (index = timers.length; index--; ) {
                                if (timers[index].elem === this && timers[index].queue === type) {
                                    timers[index].anim.stop(true);
                                    timers.splice(index, 1);
                                }
                            }
                            for (index = 0; index < length; index++) {
                                if (queue[index] && queue[index].finish) {
                                    queue[index].finish.call(this);
                                }
                            }
                            delete data.finish;
                        });
                    }
                });
                jQuery.each([ "toggle", "show", "hide" ], function(i, name) {
                    var cssFn = jQuery.fn[name];
                    jQuery.fn[name] = function(speed, easing, callback) {
                        return speed == null || typeof speed === "boolean" ? cssFn.apply(this, arguments) : this.animate(genFx(name, true), speed, easing, callback);
                    };
                });
                jQuery.each({
                    slideDown: genFx("show"),
                    slideUp: genFx("hide"),
                    slideToggle: genFx("toggle"),
                    fadeIn: {
                        opacity: "show"
                    },
                    fadeOut: {
                        opacity: "hide"
                    },
                    fadeToggle: {
                        opacity: "toggle"
                    }
                }, function(name, props) {
                    jQuery.fn[name] = function(speed, easing, callback) {
                        return this.animate(props, speed, easing, callback);
                    };
                });
                jQuery.timers = [];
                jQuery.fx.tick = function() {
                    var timer, timers = jQuery.timers, i = 0;
                    fxNow = jQuery.now();
                    for (;i < timers.length; i++) {
                        timer = timers[i];
                        if (!timer() && timers[i] === timer) {
                            timers.splice(i--, 1);
                        }
                    }
                    if (!timers.length) {
                        jQuery.fx.stop();
                    }
                    fxNow = undefined;
                };
                jQuery.fx.timer = function(timer) {
                    jQuery.timers.push(timer);
                    if (timer()) {
                        jQuery.fx.start();
                    } else {
                        jQuery.timers.pop();
                    }
                };
                jQuery.fx.interval = 13;
                jQuery.fx.start = function() {
                    if (!timerId) {
                        timerId = setInterval(jQuery.fx.tick, jQuery.fx.interval);
                    }
                };
                jQuery.fx.stop = function() {
                    clearInterval(timerId);
                    timerId = null;
                };
                jQuery.fx.speeds = {
                    slow: 600,
                    fast: 200,
                    _default: 400
                };
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/effects", (_M_["jquery/cmd/effects"] = {}) && _M_);

_M_["jquery/cmd/var/pnum"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/var/pnum", (_M_["jquery/cmd/var/pnum"] = {}) && _M_);

_M_["jquery/cmd/css/var/cssExpand"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = [ "Top", "Right", "Bottom", "Left" ];
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/var/cssExpand", (_M_["jquery/cmd/css/var/cssExpand"] = {}) && _M_);

_M_["jquery/cmd/css/var/isHidden"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/selector"]();
                __mod__[__id__] = function(elem, el) {
                    elem = el || elem;
                    return jQuery.css(elem, "display") === "none" || !jQuery.contains(elem.ownerDocument, elem);
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/var/isHidden", (_M_["jquery/cmd/css/var/isHidden"] = {}) && _M_);

_M_["jquery/cmd/css/defaultDisplay"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/manipulation"]();
                var iframe, elemdisplay = {};
                function actualDisplay(name, doc) {
                    var style, elem = jQuery(doc.createElement(name)).appendTo(doc.body), display = window.getDefaultComputedStyle && (style = window.getDefaultComputedStyle(elem[0])) ? style.display : jQuery.css(elem[0], "display");
                    elem.detach();
                    return display;
                }
                function defaultDisplay(nodeName) {
                    var doc = document, display = elemdisplay[nodeName];
                    if (!display) {
                        display = actualDisplay(nodeName, doc);
                        if (display === "none" || !display) {
                            iframe = (iframe || jQuery("<iframe frameborder='0' width='0' height='0'/>")).appendTo(doc.documentElement);
                            doc = (iframe[0].contentWindow || iframe[0].contentDocument).document;
                            doc.write();
                            doc.close();
                            display = actualDisplay(nodeName, doc);
                            iframe.detach();
                        }
                        elemdisplay[nodeName] = display;
                    }
                    return display;
                }
                __mod__[__id__] = defaultDisplay;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/defaultDisplay", (_M_["jquery/cmd/css/defaultDisplay"] = {}) && _M_);

_M_["jquery/cmd/manipulation"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var strundefined = __mod__["jquery/cmd/var/strundefined"]();
                var concat = __mod__["jquery/cmd/var/concat"]();
                var push = __mod__["jquery/cmd/var/push"]();
                var deletedIds = __mod__["jquery/cmd/var/deletedIds"]();
                var access = __mod__["jquery/cmd/core/access"]();
                var rcheckableType = __mod__["jquery/cmd/manipulation/var/rcheckableType"]();
                var support = __mod__["jquery/cmd/manipulation/support"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/data/accepts"]();
                __mod__["jquery/cmd/traversing"]();
                __mod__["jquery/cmd/selector"]();
                __mod__["jquery/cmd/event"]();
                function createSafeFragment(document) {
                    var list = nodeNames.split("|"), safeFrag = document.createDocumentFragment();
                    if (safeFrag.createElement) {
                        while (list.length) {
                            safeFrag.createElement(list.pop());
                        }
                    }
                    return safeFrag;
                }
                var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" + "header|hgroup|mark|meter|nav|output|progress|section|summary|time|video", rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g, rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"), rleadingWhitespace = /^\s+/, rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi, rtagName = /<([\w:]+)/, rtbody = /<tbody/i, rhtml = /<|&#?\w+;/, rnoInnerhtml = /<(?:script|style|link)/i, rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i, rscriptType = /^$|\/(?:java|ecma)script/i, rscriptTypeMasked = /^true\/(.*)/, rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g, wrapMap = {
                    option: [ 1, "<select multiple='multiple'>", "</select>" ],
                    legend: [ 1, "<fieldset>", "</fieldset>" ],
                    area: [ 1, "<map>", "</map>" ],
                    param: [ 1, "<object>", "</object>" ],
                    thead: [ 1, "<table>", "</table>" ],
                    tr: [ 2, "<table><tbody>", "</tbody></table>" ],
                    col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
                    td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
                    _default: support.htmlSerialize ? [ 0, "", "" ] : [ 1, "X<div>", "</div>" ]
                }, safeFragment = createSafeFragment(document), fragmentDiv = safeFragment.appendChild(document.createElement("div"));
                wrapMap.optgroup = wrapMap.option;
                wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
                wrapMap.th = wrapMap.td;
                function getAll(context, tag) {
                    var elems, elem, i = 0, found = typeof context.getElementsByTagName !== strundefined ? context.getElementsByTagName(tag || "*") : typeof context.querySelectorAll !== strundefined ? context.querySelectorAll(tag || "*") : undefined;
                    if (!found) {
                        for (found = [], elems = context.childNodes || context; (elem = elems[i]) != null; i++) {
                            if (!tag || jQuery.nodeName(elem, tag)) {
                                found.push(elem);
                            } else {
                                jQuery.merge(found, getAll(elem, tag));
                            }
                        }
                    }
                    return tag === undefined || tag && jQuery.nodeName(context, tag) ? jQuery.merge([ context ], found) : found;
                }
                function fixDefaultChecked(elem) {
                    if (rcheckableType.test(elem.type)) {
                        elem.defaultChecked = elem.checked;
                    }
                }
                function manipulationTarget(elem, content) {
                    return jQuery.nodeName(elem, "table") && jQuery.nodeName(content.nodeType !== 11 ? content : content.firstChild, "tr") ? elem.getElementsByTagName("tbody")[0] || elem.appendChild(elem.ownerDocument.createElement("tbody")) : elem;
                }
                function disableScript(elem) {
                    elem.type = (jQuery.find.attr(elem, "type") !== null) + "/" + elem.type;
                    return elem;
                }
                function restoreScript(elem) {
                    var match = rscriptTypeMasked.exec(elem.type);
                    if (match) {
                        elem.type = match[1];
                    } else {
                        elem.removeAttribute("type");
                    }
                    return elem;
                }
                function setGlobalEval(elems, refElements) {
                    var elem, i = 0;
                    for (;(elem = elems[i]) != null; i++) {
                        jQuery._data(elem, "globalEval", !refElements || jQuery._data(refElements[i], "globalEval"));
                    }
                }
                function cloneCopyEvent(src, dest) {
                    if (dest.nodeType !== 1 || !jQuery.hasData(src)) {
                        return;
                    }
                    var type, i, l, oldData = jQuery._data(src), curData = jQuery._data(dest, oldData), events = oldData.events;
                    if (events) {
                        delete curData.handle;
                        curData.events = {};
                        for (type in events) {
                            for (i = 0, l = events[type].length; i < l; i++) {
                                jQuery.event.add(dest, type, events[type][i]);
                            }
                        }
                    }
                    if (curData.data) {
                        curData.data = jQuery.extend({}, curData.data);
                    }
                }
                function fixCloneNodeIssues(src, dest) {
                    var nodeName, e, data;
                    if (dest.nodeType !== 1) {
                        return;
                    }
                    nodeName = dest.nodeName.toLowerCase();
                    if (!support.noCloneEvent && dest[jQuery.expando]) {
                        data = jQuery._data(dest);
                        for (e in data.events) {
                            jQuery.removeEvent(dest, e, data.handle);
                        }
                        dest.removeAttribute(jQuery.expando);
                    }
                    if (nodeName === "script" && dest.text !== src.text) {
                        disableScript(dest).text = src.text;
                        restoreScript(dest);
                    } else if (nodeName === "object") {
                        if (dest.parentNode) {
                            dest.outerHTML = src.outerHTML;
                        }
                        if (support.html5Clone && src.innerHTML && !jQuery.trim(dest.innerHTML)) {
                            dest.innerHTML = src.innerHTML;
                        }
                    } else if (nodeName === "input" && rcheckableType.test(src.type)) {
                        dest.defaultChecked = dest.checked = src.checked;
                        if (dest.value !== src.value) {
                            dest.value = src.value;
                        }
                    } else if (nodeName === "option") {
                        dest.defaultSelected = dest.selected = src.defaultSelected;
                    } else if (nodeName === "input" || nodeName === "textarea") {
                        dest.defaultValue = src.defaultValue;
                    }
                }
                jQuery.extend({
                    clone: function(elem, dataAndEvents, deepDataAndEvents) {
                        var destElements, node, clone, i, srcElements, inPage = jQuery.contains(elem.ownerDocument, elem);
                        if (support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test("<" + elem.nodeName + ">")) {
                            clone = elem.cloneNode(true);
                        } else {
                            fragmentDiv.innerHTML = elem.outerHTML;
                            fragmentDiv.removeChild(clone = fragmentDiv.firstChild);
                        }
                        if ((!support.noCloneEvent || !support.noCloneChecked) && (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem)) {
                            destElements = getAll(clone);
                            srcElements = getAll(elem);
                            for (i = 0; (node = srcElements[i]) != null; ++i) {
                                if (destElements[i]) {
                                    fixCloneNodeIssues(node, destElements[i]);
                                }
                            }
                        }
                        if (dataAndEvents) {
                            if (deepDataAndEvents) {
                                srcElements = srcElements || getAll(elem);
                                destElements = destElements || getAll(clone);
                                for (i = 0; (node = srcElements[i]) != null; i++) {
                                    cloneCopyEvent(node, destElements[i]);
                                }
                            } else {
                                cloneCopyEvent(elem, clone);
                            }
                        }
                        destElements = getAll(clone, "script");
                        if (destElements.length > 0) {
                            setGlobalEval(destElements, !inPage && getAll(elem, "script"));
                        }
                        destElements = srcElements = node = null;
                        return clone;
                    },
                    buildFragment: function(elems, context, scripts, selection) {
                        var j, elem, contains, tmp, tag, tbody, wrap, l = elems.length, safe = createSafeFragment(context), nodes = [], i = 0;
                        for (;i < l; i++) {
                            elem = elems[i];
                            if (elem || elem === 0) {
                                if (jQuery.type(elem) === "object") {
                                    jQuery.merge(nodes, elem.nodeType ? [ elem ] : elem);
                                } else if (!rhtml.test(elem)) {
                                    nodes.push(context.createTextNode(elem));
                                } else {
                                    tmp = tmp || safe.appendChild(context.createElement("div"));
                                    tag = (rtagName.exec(elem) || [ "", "" ])[1].toLowerCase();
                                    wrap = wrapMap[tag] || wrapMap._default;
                                    tmp.innerHTML = wrap[1] + elem.replace(rxhtmlTag, "<$1></$2>") + wrap[2];
                                    j = wrap[0];
                                    while (j--) {
                                        tmp = tmp.lastChild;
                                    }
                                    if (!support.leadingWhitespace && rleadingWhitespace.test(elem)) {
                                        nodes.push(context.createTextNode(rleadingWhitespace.exec(elem)[0]));
                                    }
                                    if (!support.tbody) {
                                        elem = tag === "table" && !rtbody.test(elem) ? tmp.firstChild : wrap[1] === "<table>" && !rtbody.test(elem) ? tmp : 0;
                                        j = elem && elem.childNodes.length;
                                        while (j--) {
                                            if (jQuery.nodeName(tbody = elem.childNodes[j], "tbody") && !tbody.childNodes.length) {
                                                elem.removeChild(tbody);
                                            }
                                        }
                                    }
                                    jQuery.merge(nodes, tmp.childNodes);
                                    tmp.textContent = "";
                                    while (tmp.firstChild) {
                                        tmp.removeChild(tmp.firstChild);
                                    }
                                    tmp = safe.lastChild;
                                }
                            }
                        }
                        if (tmp) {
                            safe.removeChild(tmp);
                        }
                        if (!support.appendChecked) {
                            jQuery.grep(getAll(nodes, "input"), fixDefaultChecked);
                        }
                        i = 0;
                        while (elem = nodes[i++]) {
                            if (selection && jQuery.inArray(elem, selection) !== -1) {
                                continue;
                            }
                            contains = jQuery.contains(elem.ownerDocument, elem);
                            tmp = getAll(safe.appendChild(elem), "script");
                            if (contains) {
                                setGlobalEval(tmp);
                            }
                            if (scripts) {
                                j = 0;
                                while (elem = tmp[j++]) {
                                    if (rscriptType.test(elem.type || "")) {
                                        scripts.push(elem);
                                    }
                                }
                            }
                        }
                        tmp = null;
                        return safe;
                    },
                    cleanData: function(elems, acceptData) {
                        var elem, type, id, data, i = 0, internalKey = jQuery.expando, cache = jQuery.cache, deleteExpando = support.deleteExpando, special = jQuery.event.special;
                        for (;(elem = elems[i]) != null; i++) {
                            if (acceptData || jQuery.acceptData(elem)) {
                                id = elem[internalKey];
                                data = id && cache[id];
                                if (data) {
                                    if (data.events) {
                                        for (type in data.events) {
                                            if (special[type]) {
                                                jQuery.event.remove(elem, type);
                                            } else {
                                                jQuery.removeEvent(elem, type, data.handle);
                                            }
                                        }
                                    }
                                    if (cache[id]) {
                                        delete cache[id];
                                        if (deleteExpando) {
                                            delete elem[internalKey];
                                        } else if (typeof elem.removeAttribute !== strundefined) {
                                            elem.removeAttribute(internalKey);
                                        } else {
                                            elem[internalKey] = null;
                                        }
                                        deletedIds.push(id);
                                    }
                                }
                            }
                        }
                    }
                });
                jQuery.fn.extend({
                    text: function(value) {
                        return access(this, function(value) {
                            return value === undefined ? jQuery.text(this) : this.empty().append((this[0] && this[0].ownerDocument || document).createTextNode(value));
                        }, null, value, arguments.length);
                    },
                    append: function() {
                        return this.domManip(arguments, function(elem) {
                            if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
                                var target = manipulationTarget(this, elem);
                                target.appendChild(elem);
                            }
                        });
                    },
                    prepend: function() {
                        return this.domManip(arguments, function(elem) {
                            if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
                                var target = manipulationTarget(this, elem);
                                target.insertBefore(elem, target.firstChild);
                            }
                        });
                    },
                    before: function() {
                        return this.domManip(arguments, function(elem) {
                            if (this.parentNode) {
                                this.parentNode.insertBefore(elem, this);
                            }
                        });
                    },
                    after: function() {
                        return this.domManip(arguments, function(elem) {
                            if (this.parentNode) {
                                this.parentNode.insertBefore(elem, this.nextSibling);
                            }
                        });
                    },
                    remove: function(selector, keepData) {
                        var elem, elems = selector ? jQuery.filter(selector, this) : this, i = 0;
                        for (;(elem = elems[i]) != null; i++) {
                            if (!keepData && elem.nodeType === 1) {
                                jQuery.cleanData(getAll(elem));
                            }
                            if (elem.parentNode) {
                                if (keepData && jQuery.contains(elem.ownerDocument, elem)) {
                                    setGlobalEval(getAll(elem, "script"));
                                }
                                elem.parentNode.removeChild(elem);
                            }
                        }
                        return this;
                    },
                    empty: function() {
                        var elem, i = 0;
                        for (;(elem = this[i]) != null; i++) {
                            if (elem.nodeType === 1) {
                                jQuery.cleanData(getAll(elem, false));
                            }
                            while (elem.firstChild) {
                                elem.removeChild(elem.firstChild);
                            }
                            if (elem.options && jQuery.nodeName(elem, "select")) {
                                elem.options.length = 0;
                            }
                        }
                        return this;
                    },
                    clone: function(dataAndEvents, deepDataAndEvents) {
                        dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
                        deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
                        return this.map(function() {
                            return jQuery.clone(this, dataAndEvents, deepDataAndEvents);
                        });
                    },
                    html: function(value) {
                        return access(this, function(value) {
                            var elem = this[0] || {}, i = 0, l = this.length;
                            if (value === undefined) {
                                return elem.nodeType === 1 ? elem.innerHTML.replace(rinlinejQuery, "") : undefined;
                            }
                            if (typeof value === "string" && !rnoInnerhtml.test(value) && (support.htmlSerialize || !rnoshimcache.test(value)) && (support.leadingWhitespace || !rleadingWhitespace.test(value)) && !wrapMap[(rtagName.exec(value) || [ "", "" ])[1].toLowerCase()]) {
                                value = value.replace(rxhtmlTag, "<$1></$2>");
                                try {
                                    for (;i < l; i++) {
                                        elem = this[i] || {};
                                        if (elem.nodeType === 1) {
                                            jQuery.cleanData(getAll(elem, false));
                                            elem.innerHTML = value;
                                        }
                                    }
                                    elem = 0;
                                } catch (e) {}
                            }
                            if (elem) {
                                this.empty().append(value);
                            }
                        }, null, value, arguments.length);
                    },
                    replaceWith: function() {
                        var arg = arguments[0];
                        this.domManip(arguments, function(elem) {
                            arg = this.parentNode;
                            jQuery.cleanData(getAll(this));
                            if (arg) {
                                arg.replaceChild(elem, this);
                            }
                        });
                        return arg && (arg.length || arg.nodeType) ? this : this.remove();
                    },
                    detach: function(selector) {
                        return this.remove(selector, true);
                    },
                    domManip: function(args, callback) {
                        args = concat.apply([], args);
                        var first, node, hasScripts, scripts, doc, fragment, i = 0, l = this.length, set = this, iNoClone = l - 1, value = args[0], isFunction = jQuery.isFunction(value);
                        if (isFunction || l > 1 && typeof value === "string" && !support.checkClone && rchecked.test(value)) {
                            return this.each(function(index) {
                                var self = set.eq(index);
                                if (isFunction) {
                                    args[0] = value.call(this, index, self.html());
                                }
                                self.domManip(args, callback);
                            });
                        }
                        if (l) {
                            fragment = jQuery.buildFragment(args, this[0].ownerDocument, false, this);
                            first = fragment.firstChild;
                            if (fragment.childNodes.length === 1) {
                                fragment = first;
                            }
                            if (first) {
                                scripts = jQuery.map(getAll(fragment, "script"), disableScript);
                                hasScripts = scripts.length;
                                for (;i < l; i++) {
                                    node = fragment;
                                    if (i !== iNoClone) {
                                        node = jQuery.clone(node, true, true);
                                        if (hasScripts) {
                                            jQuery.merge(scripts, getAll(node, "script"));
                                        }
                                    }
                                    callback.call(this[i], node, i);
                                }
                                if (hasScripts) {
                                    doc = scripts[scripts.length - 1].ownerDocument;
                                    jQuery.map(scripts, restoreScript);
                                    for (i = 0; i < hasScripts; i++) {
                                        node = scripts[i];
                                        if (rscriptType.test(node.type || "") && !jQuery._data(node, "globalEval") && jQuery.contains(doc, node)) {
                                            if (node.src) {
                                                if (jQuery._evalUrl) {
                                                    jQuery._evalUrl(node.src);
                                                }
                                            } else {
                                                jQuery.globalEval((node.text || node.textContent || node.innerHTML || "").replace(rcleanScript, ""));
                                            }
                                        }
                                    }
                                }
                                fragment = first = null;
                            }
                        }
                        return this;
                    }
                });
                jQuery.each({
                    appendTo: "append",
                    prependTo: "prepend",
                    insertBefore: "before",
                    insertAfter: "after",
                    replaceAll: "replaceWith"
                }, function(name, original) {
                    jQuery.fn[name] = function(selector) {
                        var elems, i = 0, ret = [], insert = jQuery(selector), last = insert.length - 1;
                        for (;i <= last; i++) {
                            elems = i === last ? this : this.clone(true);
                            jQuery(insert[i])[original](elems);
                            push.apply(ret, elems.get());
                        }
                        return this.pushStack(ret);
                    };
                });
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/manipulation", (_M_["jquery/cmd/manipulation"] = {}) && _M_);

_M_["jquery/cmd/core/access"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var access = jQuery.access = function(elems, fn, key, value, chainable, emptyGet, raw) {
                    var i = 0, length = elems.length, bulk = key == null;
                    if (jQuery.type(key) === "object") {
                        chainable = true;
                        for (i in key) {
                            jQuery.access(elems, fn, i, key[i], true, emptyGet, raw);
                        }
                    } else if (value !== undefined) {
                        chainable = true;
                        if (!jQuery.isFunction(value)) {
                            raw = true;
                        }
                        if (bulk) {
                            if (raw) {
                                fn.call(elems, value);
                                fn = null;
                            } else {
                                bulk = fn;
                                fn = function(elem, key, value) {
                                    return bulk.call(jQuery(elem), value);
                                };
                            }
                        }
                        if (fn) {
                            for (;i < length; i++) {
                                fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
                            }
                        }
                    }
                    return chainable ? elems : bulk ? fn.call(elems) : length ? fn(elems[0], key) : emptyGet;
                };
                __mod__[__id__] = access;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/core/access", (_M_["jquery/cmd/core/access"] = {}) && _M_);

_M_["jquery/cmd/manipulation/var/rcheckableType"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = /^(?:checkbox|radio)$/i;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/manipulation/var/rcheckableType", (_M_["jquery/cmd/manipulation/var/rcheckableType"] = {}) && _M_);

_M_["jquery/cmd/manipulation/support"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var support = __mod__["jquery/cmd/var/support"]();
                (function() {
                    var input = document.createElement("input"), div = document.createElement("div"), fragment = document.createDocumentFragment();
                    div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";
                    support.leadingWhitespace = div.firstChild.nodeType === 3;
                    support.tbody = !div.getElementsByTagName("tbody").length;
                    support.htmlSerialize = !!div.getElementsByTagName("link").length;
                    support.html5Clone = document.createElement("nav").cloneNode(true).outerHTML !== "<:nav></:nav>";
                    input.type = "checkbox";
                    input.checked = true;
                    fragment.appendChild(input);
                    support.appendChecked = input.checked;
                    div.innerHTML = "<textarea>x</textarea>";
                    support.noCloneChecked = !!div.cloneNode(true).lastChild.defaultValue;
                    fragment.appendChild(div);
                    div.innerHTML = "<input type='radio' checked='checked' name='t'/>";
                    support.checkClone = div.cloneNode(true).cloneNode(true).lastChild.checked;
                    support.noCloneEvent = true;
                    if (div.attachEvent) {
                        div.attachEvent("onclick", function() {
                            support.noCloneEvent = false;
                        });
                        div.cloneNode(true).click();
                    }
                    if (support.deleteExpando == null) {
                        support.deleteExpando = true;
                        try {
                            delete div.test;
                        } catch (e) {
                            support.deleteExpando = false;
                        }
                    }
                })();
                __mod__[__id__] = support;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/manipulation/support", (_M_["jquery/cmd/manipulation/support"] = {}) && _M_);

_M_["jquery/cmd/event"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var strundefined = __mod__["jquery/cmd/var/strundefined"]();
                var rnotwhite = __mod__["jquery/cmd/var/rnotwhite"]();
                var hasOwn = __mod__["jquery/cmd/var/hasOwn"]();
                var slice = __mod__["jquery/cmd/var/slice"]();
                var support = __mod__["jquery/cmd/event/support"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/data/accepts"]();
                __mod__["jquery/cmd/selector"]();
                var rformElems = /^(?:input|select|textarea)$/i, rkeyEvent = /^key/, rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/, rfocusMorph = /^(?:focusinfocus|focusoutblur)$/, rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;
                function returnTrue() {
                    return true;
                }
                function returnFalse() {
                    return false;
                }
                function safeActiveElement() {
                    try {
                        return document.activeElement;
                    } catch (err) {}
                }
                jQuery.event = {
                    global: {},
                    add: function(elem, types, handler, data, selector) {
                        var tmp, events, t, handleObjIn, special, eventHandle, handleObj, handlers, type, namespaces, origType, elemData = jQuery._data(elem);
                        if (!elemData) {
                            return;
                        }
                        if (handler.handler) {
                            handleObjIn = handler;
                            handler = handleObjIn.handler;
                            selector = handleObjIn.selector;
                        }
                        if (!handler.guid) {
                            handler.guid = jQuery.guid++;
                        }
                        if (!(events = elemData.events)) {
                            events = elemData.events = {};
                        }
                        if (!(eventHandle = elemData.handle)) {
                            eventHandle = elemData.handle = function(e) {
                                return typeof jQuery !== strundefined && (!e || jQuery.event.triggered !== e.type) ? jQuery.event.dispatch.apply(eventHandle.elem, arguments) : undefined;
                            };
                            eventHandle.elem = elem;
                        }
                        types = (types || "").match(rnotwhite) || [ "" ];
                        t = types.length;
                        while (t--) {
                            tmp = rtypenamespace.exec(types[t]) || [];
                            type = origType = tmp[1];
                            namespaces = (tmp[2] || "").split(".").sort();
                            if (!type) {
                                continue;
                            }
                            special = jQuery.event.special[type] || {};
                            type = (selector ? special.delegateType : special.bindType) || type;
                            special = jQuery.event.special[type] || {};
                            handleObj = jQuery.extend({
                                type: type,
                                origType: origType,
                                data: data,
                                handler: handler,
                                guid: handler.guid,
                                selector: selector,
                                needsContext: selector && jQuery.expr.match.needsContext.test(selector),
                                namespace: namespaces.join(".")
                            }, handleObjIn);
                            if (!(handlers = events[type])) {
                                handlers = events[type] = [];
                                handlers.delegateCount = 0;
                                if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {
                                    if (elem.addEventListener) {
                                        elem.addEventListener(type, eventHandle, false);
                                    } else if (elem.attachEvent) {
                                        elem.attachEvent("on" + type, eventHandle);
                                    }
                                }
                            }
                            if (special.add) {
                                special.add.call(elem, handleObj);
                                if (!handleObj.handler.guid) {
                                    handleObj.handler.guid = handler.guid;
                                }
                            }
                            if (selector) {
                                handlers.splice(handlers.delegateCount++, 0, handleObj);
                            } else {
                                handlers.push(handleObj);
                            }
                            jQuery.event.global[type] = true;
                        }
                        elem = null;
                    },
                    remove: function(elem, types, handler, selector, mappedTypes) {
                        var j, handleObj, tmp, origCount, t, events, special, handlers, type, namespaces, origType, elemData = jQuery.hasData(elem) && jQuery._data(elem);
                        if (!elemData || !(events = elemData.events)) {
                            return;
                        }
                        types = (types || "").match(rnotwhite) || [ "" ];
                        t = types.length;
                        while (t--) {
                            tmp = rtypenamespace.exec(types[t]) || [];
                            type = origType = tmp[1];
                            namespaces = (tmp[2] || "").split(".").sort();
                            if (!type) {
                                for (type in events) {
                                    jQuery.event.remove(elem, type + types[t], handler, selector, true);
                                }
                                continue;
                            }
                            special = jQuery.event.special[type] || {};
                            type = (selector ? special.delegateType : special.bindType) || type;
                            handlers = events[type] || [];
                            tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");
                            origCount = j = handlers.length;
                            while (j--) {
                                handleObj = handlers[j];
                                if ((mappedTypes || origType === handleObj.origType) && (!handler || handler.guid === handleObj.guid) && (!tmp || tmp.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === "**" && handleObj.selector)) {
                                    handlers.splice(j, 1);
                                    if (handleObj.selector) {
                                        handlers.delegateCount--;
                                    }
                                    if (special.remove) {
                                        special.remove.call(elem, handleObj);
                                    }
                                }
                            }
                            if (origCount && !handlers.length) {
                                if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {
                                    jQuery.removeEvent(elem, type, elemData.handle);
                                }
                                delete events[type];
                            }
                        }
                        if (jQuery.isEmptyObject(events)) {
                            delete elemData.handle;
                            jQuery._removeData(elem, "events");
                        }
                    },
                    trigger: function(event, data, elem, onlyHandlers) {
                        var handle, ontype, cur, bubbleType, special, tmp, i, eventPath = [ elem || document ], type = hasOwn.call(event, "type") ? event.type : event, namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];
                        cur = tmp = elem = elem || document;
                        if (elem.nodeType === 3 || elem.nodeType === 8) {
                            return;
                        }
                        if (rfocusMorph.test(type + jQuery.event.triggered)) {
                            return;
                        }
                        if (type.indexOf(".") >= 0) {
                            namespaces = type.split(".");
                            type = namespaces.shift();
                            namespaces.sort();
                        }
                        ontype = type.indexOf(":") < 0 && "on" + type;
                        event = event[jQuery.expando] ? event : new jQuery.Event(type, typeof event === "object" && event);
                        event.isTrigger = onlyHandlers ? 2 : 3;
                        event.namespace = namespaces.join(".");
                        event.namespace_re = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
                        event.result = undefined;
                        if (!event.target) {
                            event.target = elem;
                        }
                        data = data == null ? [ event ] : jQuery.makeArray(data, [ event ]);
                        special = jQuery.event.special[type] || {};
                        if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
                            return;
                        }
                        if (!onlyHandlers && !special.noBubble && !jQuery.isWindow(elem)) {
                            bubbleType = special.delegateType || type;
                            if (!rfocusMorph.test(bubbleType + type)) {
                                cur = cur.parentNode;
                            }
                            for (;cur; cur = cur.parentNode) {
                                eventPath.push(cur);
                                tmp = cur;
                            }
                            if (tmp === (elem.ownerDocument || document)) {
                                eventPath.push(tmp.defaultView || tmp.parentWindow || window);
                            }
                        }
                        i = 0;
                        while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {
                            event.type = i > 1 ? bubbleType : special.bindType || type;
                            handle = (jQuery._data(cur, "events") || {})[event.type] && jQuery._data(cur, "handle");
                            if (handle) {
                                handle.apply(cur, data);
                            }
                            handle = ontype && cur[ontype];
                            if (handle && handle.apply && jQuery.acceptData(cur)) {
                                event.result = handle.apply(cur, data);
                                if (event.result === false) {
                                    event.preventDefault();
                                }
                            }
                        }
                        event.type = type;
                        if (!onlyHandlers && !event.isDefaultPrevented()) {
                            if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && jQuery.acceptData(elem)) {
                                if (ontype && elem[type] && !jQuery.isWindow(elem)) {
                                    tmp = elem[ontype];
                                    if (tmp) {
                                        elem[ontype] = null;
                                    }
                                    jQuery.event.triggered = type;
                                    try {
                                        elem[type]();
                                    } catch (e) {}
                                    jQuery.event.triggered = undefined;
                                    if (tmp) {
                                        elem[ontype] = tmp;
                                    }
                                }
                            }
                        }
                        return event.result;
                    },
                    dispatch: function(event) {
                        event = jQuery.event.fix(event);
                        var i, ret, handleObj, matched, j, handlerQueue = [], args = slice.call(arguments), handlers = (jQuery._data(this, "events") || {})[event.type] || [], special = jQuery.event.special[event.type] || {};
                        args[0] = event;
                        event.delegateTarget = this;
                        if (special.preDispatch && special.preDispatch.call(this, event) === false) {
                            return;
                        }
                        handlerQueue = jQuery.event.handlers.call(this, event, handlers);
                        i = 0;
                        while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
                            event.currentTarget = matched.elem;
                            j = 0;
                            while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {
                                if (!event.namespace_re || event.namespace_re.test(handleObj.namespace)) {
                                    event.handleObj = handleObj;
                                    event.data = handleObj.data;
                                    ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);
                                    if (ret !== undefined) {
                                        if ((event.result = ret) === false) {
                                            event.preventDefault();
                                            event.stopPropagation();
                                        }
                                    }
                                }
                            }
                        }
                        if (special.postDispatch) {
                            special.postDispatch.call(this, event);
                        }
                        return event.result;
                    },
                    handlers: function(event, handlers) {
                        var sel, handleObj, matches, i, handlerQueue = [], delegateCount = handlers.delegateCount, cur = event.target;
                        if (delegateCount && cur.nodeType && (!event.button || event.type !== "click")) {
                            for (;cur != this; cur = cur.parentNode || this) {
                                if (cur.nodeType === 1 && (cur.disabled !== true || event.type !== "click")) {
                                    matches = [];
                                    for (i = 0; i < delegateCount; i++) {
                                        handleObj = handlers[i];
                                        sel = handleObj.selector + " ";
                                        if (matches[sel] === undefined) {
                                            matches[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) >= 0 : jQuery.find(sel, this, null, [ cur ]).length;
                                        }
                                        if (matches[sel]) {
                                            matches.push(handleObj);
                                        }
                                    }
                                    if (matches.length) {
                                        handlerQueue.push({
                                            elem: cur,
                                            handlers: matches
                                        });
                                    }
                                }
                            }
                        }
                        if (delegateCount < handlers.length) {
                            handlerQueue.push({
                                elem: this,
                                handlers: handlers.slice(delegateCount)
                            });
                        }
                        return handlerQueue;
                    },
                    fix: function(event) {
                        if (event[jQuery.expando]) {
                            return event;
                        }
                        var i, prop, copy, type = event.type, originalEvent = event, fixHook = this.fixHooks[type];
                        if (!fixHook) {
                            this.fixHooks[type] = fixHook = rmouseEvent.test(type) ? this.mouseHooks : rkeyEvent.test(type) ? this.keyHooks : {};
                        }
                        copy = fixHook.props ? this.props.concat(fixHook.props) : this.props;
                        event = new jQuery.Event(originalEvent);
                        i = copy.length;
                        while (i--) {
                            prop = copy[i];
                            event[prop] = originalEvent[prop];
                        }
                        if (!event.target) {
                            event.target = originalEvent.srcElement || document;
                        }
                        if (event.target.nodeType === 3) {
                            event.target = event.target.parentNode;
                        }
                        event.metaKey = !!event.metaKey;
                        return fixHook.filter ? fixHook.filter(event, originalEvent) : event;
                    },
                    props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
                    fixHooks: {},
                    keyHooks: {
                        props: "char charCode key keyCode".split(" "),
                        filter: function(event, original) {
                            if (event.which == null) {
                                event.which = original.charCode != null ? original.charCode : original.keyCode;
                            }
                            return event;
                        }
                    },
                    mouseHooks: {
                        props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
                        filter: function(event, original) {
                            var body, eventDoc, doc, button = original.button, fromElement = original.fromElement;
                            if (event.pageX == null && original.clientX != null) {
                                eventDoc = event.target.ownerDocument || document;
                                doc = eventDoc.documentElement;
                                body = eventDoc.body;
                                event.pageX = original.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
                                event.pageY = original.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
                            }
                            if (!event.relatedTarget && fromElement) {
                                event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
                            }
                            if (!event.which && button !== undefined) {
                                event.which = button & 1 ? 1 : button & 2 ? 3 : button & 4 ? 2 : 0;
                            }
                            return event;
                        }
                    },
                    special: {
                        load: {
                            noBubble: true
                        },
                        focus: {
                            trigger: function() {
                                if (this !== safeActiveElement() && this.focus) {
                                    try {
                                        this.focus();
                                        return false;
                                    } catch (e) {}
                                }
                            },
                            delegateType: "focusin"
                        },
                        blur: {
                            trigger: function() {
                                if (this === safeActiveElement() && this.blur) {
                                    this.blur();
                                    return false;
                                }
                            },
                            delegateType: "focusout"
                        },
                        click: {
                            trigger: function() {
                                if (jQuery.nodeName(this, "input") && this.type === "checkbox" && this.click) {
                                    this.click();
                                    return false;
                                }
                            },
                            _default: function(event) {
                                return jQuery.nodeName(event.target, "a");
                            }
                        },
                        beforeunload: {
                            postDispatch: function(event) {
                                if (event.result !== undefined && event.originalEvent) {
                                    event.originalEvent.returnValue = event.result;
                                }
                            }
                        }
                    },
                    simulate: function(type, elem, event, bubble) {
                        var e = jQuery.extend(new jQuery.Event(), event, {
                            type: type,
                            isSimulated: true,
                            originalEvent: {}
                        });
                        if (bubble) {
                            jQuery.event.trigger(e, null, elem);
                        } else {
                            jQuery.event.dispatch.call(elem, e);
                        }
                        if (e.isDefaultPrevented()) {
                            event.preventDefault();
                        }
                    }
                };
                jQuery.removeEvent = document.removeEventListener ? function(elem, type, handle) {
                    if (elem.removeEventListener) {
                        elem.removeEventListener(type, handle, false);
                    }
                } : function(elem, type, handle) {
                    var name = "on" + type;
                    if (elem.detachEvent) {
                        if (typeof elem[name] === strundefined) {
                            elem[name] = null;
                        }
                        elem.detachEvent(name, handle);
                    }
                };
                jQuery.Event = function(src, props) {
                    if (!(this instanceof jQuery.Event)) {
                        return new jQuery.Event(src, props);
                    }
                    if (src && src.type) {
                        this.originalEvent = src;
                        this.type = src.type;
                        this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined && src.returnValue === false ? returnTrue : returnFalse;
                    } else {
                        this.type = src;
                    }
                    if (props) {
                        jQuery.extend(this, props);
                    }
                    this.timeStamp = src && src.timeStamp || jQuery.now();
                    this[jQuery.expando] = true;
                };
                jQuery.Event.prototype = {
                    isDefaultPrevented: returnFalse,
                    isPropagationStopped: returnFalse,
                    isImmediatePropagationStopped: returnFalse,
                    preventDefault: function() {
                        var e = this.originalEvent;
                        this.isDefaultPrevented = returnTrue;
                        if (!e) {
                            return;
                        }
                        if (e.preventDefault) {
                            e.preventDefault();
                        } else {
                            e.returnValue = false;
                        }
                    },
                    stopPropagation: function() {
                        var e = this.originalEvent;
                        this.isPropagationStopped = returnTrue;
                        if (!e) {
                            return;
                        }
                        if (e.stopPropagation) {
                            e.stopPropagation();
                        }
                        e.cancelBubble = true;
                    },
                    stopImmediatePropagation: function() {
                        var e = this.originalEvent;
                        this.isImmediatePropagationStopped = returnTrue;
                        if (e && e.stopImmediatePropagation) {
                            e.stopImmediatePropagation();
                        }
                        this.stopPropagation();
                    }
                };
                jQuery.each({
                    mouseenter: "mouseover",
                    mouseleave: "mouseout",
                    pointerenter: "pointerover",
                    pointerleave: "pointerout"
                }, function(orig, fix) {
                    jQuery.event.special[orig] = {
                        delegateType: fix,
                        bindType: fix,
                        handle: function(event) {
                            var ret, target = this, related = event.relatedTarget, handleObj = event.handleObj;
                            if (!related || related !== target && !jQuery.contains(target, related)) {
                                event.type = handleObj.origType;
                                ret = handleObj.handler.apply(this, arguments);
                                event.type = fix;
                            }
                            return ret;
                        }
                    };
                });
                if (!support.submitBubbles) {
                    jQuery.event.special.submit = {
                        setup: function() {
                            if (jQuery.nodeName(this, "form")) {
                                return false;
                            }
                            jQuery.event.add(this, "click._submit keypress._submit", function(e) {
                                var elem = e.target, form = jQuery.nodeName(elem, "input") || jQuery.nodeName(elem, "button") ? elem.form : undefined;
                                if (form && !jQuery._data(form, "submitBubbles")) {
                                    jQuery.event.add(form, "submit._submit", function(event) {
                                        event._submit_bubble = true;
                                    });
                                    jQuery._data(form, "submitBubbles", true);
                                }
                            });
                        },
                        postDispatch: function(event) {
                            if (event._submit_bubble) {
                                delete event._submit_bubble;
                                if (this.parentNode && !event.isTrigger) {
                                    jQuery.event.simulate("submit", this.parentNode, event, true);
                                }
                            }
                        },
                        teardown: function() {
                            if (jQuery.nodeName(this, "form")) {
                                return false;
                            }
                            jQuery.event.remove(this, "._submit");
                        }
                    };
                }
                if (!support.changeBubbles) {
                    jQuery.event.special.change = {
                        setup: function() {
                            if (rformElems.test(this.nodeName)) {
                                if (this.type === "checkbox" || this.type === "radio") {
                                    jQuery.event.add(this, "propertychange._change", function(event) {
                                        if (event.originalEvent.propertyName === "checked") {
                                            this._just_changed = true;
                                        }
                                    });
                                    jQuery.event.add(this, "click._change", function(event) {
                                        if (this._just_changed && !event.isTrigger) {
                                            this._just_changed = false;
                                        }
                                        jQuery.event.simulate("change", this, event, true);
                                    });
                                }
                                return false;
                            }
                            jQuery.event.add(this, "beforeactivate._change", function(e) {
                                var elem = e.target;
                                if (rformElems.test(elem.nodeName) && !jQuery._data(elem, "changeBubbles")) {
                                    jQuery.event.add(elem, "change._change", function(event) {
                                        if (this.parentNode && !event.isSimulated && !event.isTrigger) {
                                            jQuery.event.simulate("change", this.parentNode, event, true);
                                        }
                                    });
                                    jQuery._data(elem, "changeBubbles", true);
                                }
                            });
                        },
                        handle: function(event) {
                            var elem = event.target;
                            if (this !== elem || event.isSimulated || event.isTrigger || elem.type !== "radio" && elem.type !== "checkbox") {
                                return event.handleObj.handler.apply(this, arguments);
                            }
                        },
                        teardown: function() {
                            jQuery.event.remove(this, "._change");
                            return !rformElems.test(this.nodeName);
                        }
                    };
                }
                if (!support.focusinBubbles) {
                    jQuery.each({
                        focus: "focusin",
                        blur: "focusout"
                    }, function(orig, fix) {
                        var handler = function(event) {
                            jQuery.event.simulate(fix, event.target, jQuery.event.fix(event), true);
                        };
                        jQuery.event.special[fix] = {
                            setup: function() {
                                var doc = this.ownerDocument || this, attaches = jQuery._data(doc, fix);
                                if (!attaches) {
                                    doc.addEventListener(orig, handler, true);
                                }
                                jQuery._data(doc, fix, (attaches || 0) + 1);
                            },
                            teardown: function() {
                                var doc = this.ownerDocument || this, attaches = jQuery._data(doc, fix) - 1;
                                if (!attaches) {
                                    doc.removeEventListener(orig, handler, true);
                                    jQuery._removeData(doc, fix);
                                } else {
                                    jQuery._data(doc, fix, attaches);
                                }
                            }
                        };
                    });
                }
                jQuery.fn.extend({
                    on: function(types, selector, data, fn, one) {
                        var type, origFn;
                        if (typeof types === "object") {
                            if (typeof selector !== "string") {
                                data = data || selector;
                                selector = undefined;
                            }
                            for (type in types) {
                                this.on(type, selector, data, types[type], one);
                            }
                            return this;
                        }
                        if (data == null && fn == null) {
                            fn = selector;
                            data = selector = undefined;
                        } else if (fn == null) {
                            if (typeof selector === "string") {
                                fn = data;
                                data = undefined;
                            } else {
                                fn = data;
                                data = selector;
                                selector = undefined;
                            }
                        }
                        if (fn === false) {
                            fn = returnFalse;
                        } else if (!fn) {
                            return this;
                        }
                        if (one === 1) {
                            origFn = fn;
                            fn = function(event) {
                                jQuery().off(event);
                                return origFn.apply(this, arguments);
                            };
                            fn.guid = origFn.guid || (origFn.guid = jQuery.guid++);
                        }
                        return this.each(function() {
                            jQuery.event.add(this, types, fn, data, selector);
                        });
                    },
                    one: function(types, selector, data, fn) {
                        return this.on(types, selector, data, fn, 1);
                    },
                    off: function(types, selector, fn) {
                        var handleObj, type;
                        if (types && types.preventDefault && types.handleObj) {
                            handleObj = types.handleObj;
                            jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler);
                            return this;
                        }
                        if (typeof types === "object") {
                            for (type in types) {
                                this.off(type, selector, types[type]);
                            }
                            return this;
                        }
                        if (selector === false || typeof selector === "function") {
                            fn = selector;
                            selector = undefined;
                        }
                        if (fn === false) {
                            fn = returnFalse;
                        }
                        return this.each(function() {
                            jQuery.event.remove(this, types, fn, selector);
                        });
                    },
                    trigger: function(type, data) {
                        return this.each(function() {
                            jQuery.event.trigger(type, data, this);
                        });
                    },
                    triggerHandler: function(type, data) {
                        var elem = this[0];
                        if (elem) {
                            return jQuery.event.trigger(type, data, elem, true);
                        }
                    }
                });
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/event", (_M_["jquery/cmd/event"] = {}) && _M_);

_M_["jquery/cmd/event/support"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var support = __mod__["jquery/cmd/var/support"]();
                (function() {
                    var i, eventName, div = document.createElement("div");
                    for (i in {
                        submit: true,
                        change: true,
                        focusin: true
                    }) {
                        eventName = "on" + i;
                        if (!(support[i + "Bubbles"] = eventName in window)) {
                            div.setAttribute(eventName, "t");
                            support[i + "Bubbles"] = div.attributes[eventName].expando === false;
                        }
                    }
                    div = null;
                })();
                __mod__[__id__] = support;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/event/support", (_M_["jquery/cmd/event/support"] = {}) && _M_);

_M_["jquery/cmd/effects/support"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var strundefined = __mod__["jquery/cmd/var/strundefined"]();
                var support = __mod__["jquery/cmd/var/support"]();
                (function() {
                    var shrinkWrapBlocksVal;
                    support.shrinkWrapBlocks = function() {
                        if (shrinkWrapBlocksVal != null) {
                            return shrinkWrapBlocksVal;
                        }
                        shrinkWrapBlocksVal = false;
                        var div, body, container;
                        body = document.getElementsByTagName("body")[0];
                        if (!body || !body.style) {
                            return;
                        }
                        div = document.createElement("div");
                        container = document.createElement("div");
                        container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
                        body.appendChild(container).appendChild(div);
                        if (typeof div.style.zoom !== strundefined) {
                            div.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" + "box-sizing:content-box;display:block;margin:0;border:0;" + "padding:1px;width:1px;zoom:1";
                            div.appendChild(document.createElement("div")).style.width = "5px";
                            shrinkWrapBlocksVal = div.offsetWidth !== 3;
                        }
                        body.removeChild(container);
                        return shrinkWrapBlocksVal;
                    };
                })();
                __mod__[__id__] = support;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/effects/support", (_M_["jquery/cmd/effects/support"] = {}) && _M_);

_M_["jquery/cmd/effects/Tween"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/css"]();
                function Tween(elem, options, prop, end, easing) {
                    return new Tween.prototype.init(elem, options, prop, end, easing);
                }
                jQuery.Tween = Tween;
                Tween.prototype = {
                    constructor: Tween,
                    init: function(elem, options, prop, end, easing, unit) {
                        this.elem = elem;
                        this.prop = prop;
                        this.easing = easing || "swing";
                        this.options = options;
                        this.start = this.now = this.cur();
                        this.end = end;
                        this.unit = unit || (jQuery.cssNumber[prop] ? "" : "px");
                    },
                    cur: function() {
                        var hooks = Tween.propHooks[this.prop];
                        return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this);
                    },
                    run: function(percent) {
                        var eased, hooks = Tween.propHooks[this.prop];
                        if (this.options.duration) {
                            this.pos = eased = jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration);
                        } else {
                            this.pos = eased = percent;
                        }
                        this.now = (this.end - this.start) * eased + this.start;
                        if (this.options.step) {
                            this.options.step.call(this.elem, this.now, this);
                        }
                        if (hooks && hooks.set) {
                            hooks.set(this);
                        } else {
                            Tween.propHooks._default.set(this);
                        }
                        return this;
                    }
                };
                Tween.prototype.init.prototype = Tween.prototype;
                Tween.propHooks = {
                    _default: {
                        get: function(tween) {
                            var result;
                            if (tween.elem[tween.prop] != null && (!tween.elem.style || tween.elem.style[tween.prop] == null)) {
                                return tween.elem[tween.prop];
                            }
                            result = jQuery.css(tween.elem, tween.prop, "");
                            return !result || result === "auto" ? 0 : result;
                        },
                        set: function(tween) {
                            if (jQuery.fx.step[tween.prop]) {
                                jQuery.fx.step[tween.prop](tween);
                            } else if (tween.elem.style && (tween.elem.style[jQuery.cssProps[tween.prop]] != null || jQuery.cssHooks[tween.prop])) {
                                jQuery.style(tween.elem, tween.prop, tween.now + tween.unit);
                            } else {
                                tween.elem[tween.prop] = tween.now;
                            }
                        }
                    }
                };
                Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
                    set: function(tween) {
                        if (tween.elem.nodeType && tween.elem.parentNode) {
                            tween.elem[tween.prop] = tween.now;
                        }
                    }
                };
                jQuery.easing = {
                    linear: function(p) {
                        return p;
                    },
                    swing: function(p) {
                        return .5 - Math.cos(p * Math.PI) / 2;
                    }
                };
                jQuery.fx = Tween.prototype.init;
                jQuery.fx.step = {};
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/effects/Tween", (_M_["jquery/cmd/effects/Tween"] = {}) && _M_);

_M_["jquery/cmd/css"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var pnum = __mod__["jquery/cmd/var/pnum"]();
                var access = __mod__["jquery/cmd/core/access"]();
                var rmargin = __mod__["jquery/cmd/css/var/rmargin"]();
                var rnumnonpx = __mod__["jquery/cmd/css/var/rnumnonpx"]();
                var cssExpand = __mod__["jquery/cmd/css/var/cssExpand"]();
                var isHidden = __mod__["jquery/cmd/css/var/isHidden"]();
                var curCSS = __mod__["jquery/cmd/css/curCSS"]();
                var defaultDisplay = __mod__["jquery/cmd/css/defaultDisplay"]();
                var addGetHookIf = __mod__["jquery/cmd/css/addGetHookIf"]();
                var support = __mod__["jquery/cmd/css/support"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/css/swap"]();
                __mod__["jquery/cmd/core/ready"]();
                __mod__["jquery/cmd/selector"]();
                var getStyles = curCSS.getStyles, ralpha = /alpha\([^)]*\)/i, ropacity = /opacity\s*=\s*([^)]*)/, rdisplayswap = /^(none|table(?!-c[ea]).+)/, rnumsplit = new RegExp("^(" + pnum + ")(.*)$", "i"), rrelNum = new RegExp("^([+-])=(" + pnum + ")", "i"), cssShow = {
                    position: "absolute",
                    visibility: "hidden",
                    display: "block"
                }, cssNormalTransform = {
                    letterSpacing: "0",
                    fontWeight: "400"
                }, cssPrefixes = [ "Webkit", "O", "Moz", "ms" ];
                curCSS = curCSS.curCSS;
                function vendorPropName(style, name) {
                    if (name in style) {
                        return name;
                    }
                    var capName = name.charAt(0).toUpperCase() + name.slice(1), origName = name, i = cssPrefixes.length;
                    while (i--) {
                        name = cssPrefixes[i] + capName;
                        if (name in style) {
                            return name;
                        }
                    }
                    return origName;
                }
                function showHide(elements, show) {
                    var display, elem, hidden, values = [], index = 0, length = elements.length;
                    for (;index < length; index++) {
                        elem = elements[index];
                        if (!elem.style) {
                            continue;
                        }
                        values[index] = jQuery._data(elem, "olddisplay");
                        display = elem.style.display;
                        if (show) {
                            if (!values[index] && display === "none") {
                                elem.style.display = "";
                            }
                            if (elem.style.display === "" && isHidden(elem)) {
                                values[index] = jQuery._data(elem, "olddisplay", defaultDisplay(elem.nodeName));
                            }
                        } else {
                            hidden = isHidden(elem);
                            if (display && display !== "none" || !hidden) {
                                jQuery._data(elem, "olddisplay", hidden ? display : jQuery.css(elem, "display"));
                            }
                        }
                    }
                    for (index = 0; index < length; index++) {
                        elem = elements[index];
                        if (!elem.style) {
                            continue;
                        }
                        if (!show || elem.style.display === "none" || elem.style.display === "") {
                            elem.style.display = show ? values[index] || "" : "none";
                        }
                    }
                    return elements;
                }
                function setPositiveNumber(elem, value, subtract) {
                    var matches = rnumsplit.exec(value);
                    return matches ? Math.max(0, matches[1] - (subtract || 0)) + (matches[2] || "px") : value;
                }
                function augmentWidthOrHeight(elem, name, extra, isBorderBox, styles) {
                    var i = extra === (isBorderBox ? "border" : "content") ? 4 : name === "width" ? 1 : 0, val = 0;
                    for (;i < 4; i += 2) {
                        if (extra === "margin") {
                            val += jQuery.css(elem, extra + cssExpand[i], true, styles);
                        }
                        if (isBorderBox) {
                            if (extra === "content") {
                                val -= jQuery.css(elem, "padding" + cssExpand[i], true, styles);
                            }
                            if (extra !== "margin") {
                                val -= jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
                            }
                        } else {
                            val += jQuery.css(elem, "padding" + cssExpand[i], true, styles);
                            if (extra !== "padding") {
                                val += jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
                            }
                        }
                    }
                    return val;
                }
                function getWidthOrHeight(elem, name, extra) {
                    var valueIsBorderBox = true, val = name === "width" ? elem.offsetWidth : elem.offsetHeight, styles = getStyles(elem), isBorderBox = support.boxSizing && jQuery.css(elem, "boxSizing", false, styles) === "border-box";
                    if (val <= 0 || val == null) {
                        val = curCSS(elem, name, styles);
                        if (val < 0 || val == null) {
                            val = elem.style[name];
                        }
                        if (rnumnonpx.test(val)) {
                            return val;
                        }
                        valueIsBorderBox = isBorderBox && (support.boxSizingReliable() || val === elem.style[name]);
                        val = parseFloat(val) || 0;
                    }
                    return val + augmentWidthOrHeight(elem, name, extra || (isBorderBox ? "border" : "content"), valueIsBorderBox, styles) + "px";
                }
                jQuery.extend({
                    cssHooks: {
                        opacity: {
                            get: function(elem, computed) {
                                if (computed) {
                                    var ret = curCSS(elem, "opacity");
                                    return ret === "" ? "1" : ret;
                                }
                            }
                        }
                    },
                    cssNumber: {
                        columnCount: true,
                        fillOpacity: true,
                        flexGrow: true,
                        flexShrink: true,
                        fontWeight: true,
                        lineHeight: true,
                        opacity: true,
                        order: true,
                        orphans: true,
                        widows: true,
                        zIndex: true,
                        zoom: true
                    },
                    cssProps: {
                        "float": support.cssFloat ? "cssFloat" : "styleFloat"
                    },
                    style: function(elem, name, value, extra) {
                        if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style) {
                            return;
                        }
                        var ret, type, hooks, origName = jQuery.camelCase(name), style = elem.style;
                        name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(style, origName));
                        hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
                        if (value !== undefined) {
                            type = typeof value;
                            if (type === "string" && (ret = rrelNum.exec(value))) {
                                value = (ret[1] + 1) * ret[2] + parseFloat(jQuery.css(elem, name));
                                type = "number";
                            }
                            if (value == null || value !== value) {
                                return;
                            }
                            if (type === "number" && !jQuery.cssNumber[origName]) {
                                value += "px";
                            }
                            if (!support.clearCloneStyle && value === "" && name.indexOf("background") === 0) {
                                style[name] = "inherit";
                            }
                            if (!hooks || !("set" in hooks) || (value = hooks.set(elem, value, extra)) !== undefined) {
                                try {
                                    style[name] = value;
                                } catch (e) {}
                            }
                        } else {
                            if (hooks && "get" in hooks && (ret = hooks.get(elem, false, extra)) !== undefined) {
                                return ret;
                            }
                            return style[name];
                        }
                    },
                    css: function(elem, name, extra, styles) {
                        var num, val, hooks, origName = jQuery.camelCase(name);
                        name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(elem.style, origName));
                        hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
                        if (hooks && "get" in hooks) {
                            val = hooks.get(elem, true, extra);
                        }
                        if (val === undefined) {
                            val = curCSS(elem, name, styles);
                        }
                        if (val === "normal" && name in cssNormalTransform) {
                            val = cssNormalTransform[name];
                        }
                        if (extra === "" || extra) {
                            num = parseFloat(val);
                            return extra === true || jQuery.isNumeric(num) ? num || 0 : val;
                        }
                        return val;
                    }
                });
                jQuery.each([ "height", "width" ], function(i, name) {
                    jQuery.cssHooks[name] = {
                        get: function(elem, computed, extra) {
                            if (computed) {
                                return rdisplayswap.test(jQuery.css(elem, "display")) && elem.offsetWidth === 0 ? jQuery.swap(elem, cssShow, function() {
                                    return getWidthOrHeight(elem, name, extra);
                                }) : getWidthOrHeight(elem, name, extra);
                            }
                        },
                        set: function(elem, value, extra) {
                            var styles = extra && getStyles(elem);
                            return setPositiveNumber(elem, value, extra ? augmentWidthOrHeight(elem, name, extra, support.boxSizing && jQuery.css(elem, "boxSizing", false, styles) === "border-box", styles) : 0);
                        }
                    };
                });
                if (!support.opacity) {
                    jQuery.cssHooks.opacity = {
                        get: function(elem, computed) {
                            return ropacity.test((computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "") ? .01 * parseFloat(RegExp.$1) + "" : computed ? "1" : "";
                        },
                        set: function(elem, value) {
                            var style = elem.style, currentStyle = elem.currentStyle, opacity = jQuery.isNumeric(value) ? "alpha(opacity=" + value * 100 + ")" : "", filter = currentStyle && currentStyle.filter || style.filter || "";
                            style.zoom = 1;
                            if ((value >= 1 || value === "") && jQuery.trim(filter.replace(ralpha, "")) === "" && style.removeAttribute) {
                                style.removeAttribute("filter");
                                if (value === "" || currentStyle && !currentStyle.filter) {
                                    return;
                                }
                            }
                            style.filter = ralpha.test(filter) ? filter.replace(ralpha, opacity) : filter + " " + opacity;
                        }
                    };
                }
                jQuery.cssHooks.marginRight = addGetHookIf(support.reliableMarginRight, function(elem, computed) {
                    if (computed) {
                        return jQuery.swap(elem, {
                            display: "inline-block"
                        }, curCSS, [ elem, "marginRight" ]);
                    }
                });
                jQuery.each({
                    margin: "",
                    padding: "",
                    border: "Width"
                }, function(prefix, suffix) {
                    jQuery.cssHooks[prefix + suffix] = {
                        expand: function(value) {
                            var i = 0, expanded = {}, parts = typeof value === "string" ? value.split(" ") : [ value ];
                            for (;i < 4; i++) {
                                expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
                            }
                            return expanded;
                        }
                    };
                    if (!rmargin.test(prefix)) {
                        jQuery.cssHooks[prefix + suffix].set = setPositiveNumber;
                    }
                });
                jQuery.fn.extend({
                    css: function(name, value) {
                        return access(this, function(elem, name, value) {
                            var styles, len, map = {}, i = 0;
                            if (jQuery.isArray(name)) {
                                styles = getStyles(elem);
                                len = name.length;
                                for (;i < len; i++) {
                                    map[name[i]] = jQuery.css(elem, name[i], false, styles);
                                }
                                return map;
                            }
                            return value !== undefined ? jQuery.style(elem, name, value) : jQuery.css(elem, name);
                        }, name, value, arguments.length > 1);
                    },
                    show: function() {
                        return showHide(this, true);
                    },
                    hide: function() {
                        return showHide(this);
                    },
                    toggle: function(state) {
                        if (typeof state === "boolean") {
                            return state ? this.show() : this.hide();
                        }
                        return this.each(function() {
                            if (isHidden(this)) {
                                jQuery(this).show();
                            } else {
                                jQuery(this).hide();
                            }
                        });
                    }
                });
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css", (_M_["jquery/cmd/css"] = {}) && _M_);

_M_["jquery/cmd/css/var/rmargin"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = /^margin/;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/var/rmargin", (_M_["jquery/cmd/css/var/rmargin"] = {}) && _M_);

_M_["jquery/cmd/css/var/rnumnonpx"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var pnum = __mod__["jquery/cmd/var/pnum"]();
                __mod__[__id__] = new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i");
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/var/rnumnonpx", (_M_["jquery/cmd/css/var/rnumnonpx"] = {}) && _M_);

_M_["jquery/cmd/css/curCSS"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rnumnonpx = __mod__["jquery/cmd/css/var/rnumnonpx"]();
                var rmargin = __mod__["jquery/cmd/css/var/rmargin"]();
                __mod__["jquery/cmd/selector"]();
                var getStyles, curCSS, rposition = /^(top|right|bottom|left)$/;
                if (window.getComputedStyle) {
                    getStyles = function(elem) {
                        if (elem.ownerDocument.defaultView.opener) {
                            return elem.ownerDocument.defaultView.getComputedStyle(elem, null);
                        }
                        return window.getComputedStyle(elem, null);
                    };
                    curCSS = function(elem, name, computed) {
                        var width, minWidth, maxWidth, ret, style = elem.style;
                        computed = computed || getStyles(elem);
                        ret = computed ? computed.getPropertyValue(name) || computed[name] : undefined;
                        if (computed) {
                            if (ret === "" && !jQuery.contains(elem.ownerDocument, elem)) {
                                ret = jQuery.style(elem, name);
                            }
                            if (rnumnonpx.test(ret) && rmargin.test(name)) {
                                width = style.width;
                                minWidth = style.minWidth;
                                maxWidth = style.maxWidth;
                                style.minWidth = style.maxWidth = style.width = ret;
                                ret = computed.width;
                                style.width = width;
                                style.minWidth = minWidth;
                                style.maxWidth = maxWidth;
                            }
                        }
                        return ret === undefined ? ret : ret + "";
                    };
                } else if (document.documentElement.currentStyle) {
                    getStyles = function(elem) {
                        return elem.currentStyle;
                    };
                    curCSS = function(elem, name, computed) {
                        var left, rs, rsLeft, ret, style = elem.style;
                        computed = computed || getStyles(elem);
                        ret = computed ? computed[name] : undefined;
                        if (ret == null && style && style[name]) {
                            ret = style[name];
                        }
                        if (rnumnonpx.test(ret) && !rposition.test(name)) {
                            left = style.left;
                            rs = elem.runtimeStyle;
                            rsLeft = rs && rs.left;
                            if (rsLeft) {
                                rs.left = elem.currentStyle.left;
                            }
                            style.left = name === "fontSize" ? "1em" : ret;
                            ret = style.pixelLeft + "px";
                            style.left = left;
                            if (rsLeft) {
                                rs.left = rsLeft;
                            }
                        }
                        return ret === undefined ? ret : ret + "" || "auto";
                    };
                }
                __mod__[__id__].getStyles = getStyles;
                __mod__[__id__].curCSS = curCSS;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/curCSS", (_M_["jquery/cmd/css/curCSS"] = {}) && _M_);

_M_["jquery/cmd/css/addGetHookIf"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                function addGetHookIf(conditionFn, hookFn) {
                    return {
                        get: function() {
                            var condition = conditionFn();
                            if (condition == null) {
                                return;
                            }
                            if (condition) {
                                delete this.get;
                                return;
                            }
                            return (this.get = hookFn).apply(this, arguments);
                        }
                    };
                }
                __mod__[__id__] = addGetHookIf;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/addGetHookIf", (_M_["jquery/cmd/css/addGetHookIf"] = {}) && _M_);

_M_["jquery/cmd/css/support"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var support = __mod__["jquery/cmd/var/support"]();
                (function() {
                    var div, style, a, pixelPositionVal, boxSizingReliableVal, reliableHiddenOffsetsVal, reliableMarginRightVal;
                    div = document.createElement("div");
                    div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";
                    a = div.getElementsByTagName("a")[0];
                    style = a && a.style;
                    if (!style) {
                        return;
                    }
                    style.cssText = "float:left;opacity:.5";
                    support.opacity = style.opacity === "0.5";
                    support.cssFloat = !!style.cssFloat;
                    div.style.backgroundClip = "content-box";
                    div.cloneNode(true).style.backgroundClip = "";
                    support.clearCloneStyle = div.style.backgroundClip === "content-box";
                    support.boxSizing = style.boxSizing === "" || style.MozBoxSizing === "" || style.WebkitBoxSizing === "";
                    jQuery.extend(support, {
                        reliableHiddenOffsets: function() {
                            if (reliableHiddenOffsetsVal == null) {
                                computeStyleTests();
                            }
                            return reliableHiddenOffsetsVal;
                        },
                        boxSizingReliable: function() {
                            if (boxSizingReliableVal == null) {
                                computeStyleTests();
                            }
                            return boxSizingReliableVal;
                        },
                        pixelPosition: function() {
                            if (pixelPositionVal == null) {
                                computeStyleTests();
                            }
                            return pixelPositionVal;
                        },
                        reliableMarginRight: function() {
                            if (reliableMarginRightVal == null) {
                                computeStyleTests();
                            }
                            return reliableMarginRightVal;
                        }
                    });
                    function computeStyleTests() {
                        var div, body, container, contents;
                        body = document.getElementsByTagName("body")[0];
                        if (!body || !body.style) {
                            return;
                        }
                        div = document.createElement("div");
                        container = document.createElement("div");
                        container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
                        body.appendChild(container).appendChild(div);
                        div.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" + "box-sizing:border-box;display:block;margin-top:1%;top:1%;" + "border:1px;padding:1px;width:4px;position:absolute";
                        pixelPositionVal = boxSizingReliableVal = false;
                        reliableMarginRightVal = true;
                        if (window.getComputedStyle) {
                            pixelPositionVal = (window.getComputedStyle(div, null) || {}).top !== "1%";
                            boxSizingReliableVal = (window.getComputedStyle(div, null) || {
                                width: "4px"
                            }).width === "4px";
                            contents = div.appendChild(document.createElement("div"));
                            contents.style.cssText = div.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" + "box-sizing:content-box;display:block;margin:0;border:0;padding:0";
                            contents.style.marginRight = contents.style.width = "0";
                            div.style.width = "1px";
                            reliableMarginRightVal = !parseFloat((window.getComputedStyle(contents, null) || {}).marginRight);
                            div.removeChild(contents);
                        }
                        div.innerHTML = "<table><tr><td></td><td>t</td></tr></table>";
                        contents = div.getElementsByTagName("td");
                        contents[0].style.cssText = "margin:0;border:0;padding:0;display:none";
                        reliableHiddenOffsetsVal = contents[0].offsetHeight === 0;
                        if (reliableHiddenOffsetsVal) {
                            contents[0].style.display = "";
                            contents[1].style.display = "none";
                            reliableHiddenOffsetsVal = contents[0].offsetHeight === 0;
                        }
                        body.removeChild(container);
                    }
                })();
                __mod__[__id__] = support;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/support", (_M_["jquery/cmd/css/support"] = {}) && _M_);

_M_["jquery/cmd/css/swap"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                jQuery.swap = function(elem, options, callback, args) {
                    var ret, name, old = {};
                    for (name in options) {
                        old[name] = elem.style[name];
                        elem.style[name] = options[name];
                    }
                    ret = callback.apply(elem, args || []);
                    for (name in options) {
                        elem.style[name] = old[name];
                    }
                    return ret;
                };
                __mod__[__id__] = jQuery.swap;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/swap", (_M_["jquery/cmd/css/swap"] = {}) && _M_);

_M_["jquery/cmd/attributes"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/attributes/val"]();
                __mod__["jquery/cmd/attributes/attr"]();
                __mod__["jquery/cmd/attributes/prop"]();
                __mod__["jquery/cmd/attributes/classes"]();
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/attributes", (_M_["jquery/cmd/attributes"] = {}) && _M_);

_M_["jquery/cmd/attributes/val"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var support = __mod__["jquery/cmd/attributes/support"]();
                __mod__["jquery/cmd/core/init"]();
                var rreturn = /\r/g;
                jQuery.fn.extend({
                    val: function(value) {
                        var hooks, ret, isFunction, elem = this[0];
                        if (!arguments.length) {
                            if (elem) {
                                hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()];
                                if (hooks && "get" in hooks && (ret = hooks.get(elem, "value")) !== undefined) {
                                    return ret;
                                }
                                ret = elem.value;
                                return typeof ret === "string" ? ret.replace(rreturn, "") : ret == null ? "" : ret;
                            }
                            return;
                        }
                        isFunction = jQuery.isFunction(value);
                        return this.each(function(i) {
                            var val;
                            if (this.nodeType !== 1) {
                                return;
                            }
                            if (isFunction) {
                                val = value.call(this, i, jQuery(this).val());
                            } else {
                                val = value;
                            }
                            if (val == null) {
                                val = "";
                            } else if (typeof val === "number") {
                                val += "";
                            } else if (jQuery.isArray(val)) {
                                val = jQuery.map(val, function(value) {
                                    return value == null ? "" : value + "";
                                });
                            }
                            hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()];
                            if (!hooks || !("set" in hooks) || hooks.set(this, val, "value") === undefined) {
                                this.value = val;
                            }
                        });
                    }
                });
                jQuery.extend({
                    valHooks: {
                        option: {
                            get: function(elem) {
                                var val = jQuery.find.attr(elem, "value");
                                return val != null ? val : jQuery.trim(jQuery.text(elem));
                            }
                        },
                        select: {
                            get: function(elem) {
                                var value, option, options = elem.options, index = elem.selectedIndex, one = elem.type === "select-one" || index < 0, values = one ? null : [], max = one ? index + 1 : options.length, i = index < 0 ? max : one ? index : 0;
                                for (;i < max; i++) {
                                    option = options[i];
                                    if ((option.selected || i === index) && (support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) && (!option.parentNode.disabled || !jQuery.nodeName(option.parentNode, "optgroup"))) {
                                        value = jQuery(option).val();
                                        if (one) {
                                            return value;
                                        }
                                        values.push(value);
                                    }
                                }
                                return values;
                            },
                            set: function(elem, value) {
                                var optionSet, option, options = elem.options, values = jQuery.makeArray(value), i = options.length;
                                while (i--) {
                                    option = options[i];
                                    if (jQuery.inArray(jQuery.valHooks.option.get(option), values) >= 0) {
                                        try {
                                            option.selected = optionSet = true;
                                        } catch (_) {
                                            option.scrollHeight;
                                        }
                                    } else {
                                        option.selected = false;
                                    }
                                }
                                if (!optionSet) {
                                    elem.selectedIndex = -1;
                                }
                                return options;
                            }
                        }
                    }
                });
                jQuery.each([ "radio", "checkbox" ], function() {
                    jQuery.valHooks[this] = {
                        set: function(elem, value) {
                            if (jQuery.isArray(value)) {
                                return elem.checked = jQuery.inArray(jQuery(elem).val(), value) >= 0;
                            }
                        }
                    };
                    if (!support.checkOn) {
                        jQuery.valHooks[this].get = function(elem) {
                            return elem.getAttribute("value") === null ? "on" : elem.value;
                        };
                    }
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/attributes/val", (_M_["jquery/cmd/attributes/val"] = {}) && _M_);

_M_["jquery/cmd/attributes/support"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var support = __mod__["jquery/cmd/var/support"]();
                (function() {
                    var input, div, select, a, opt;
                    div = document.createElement("div");
                    div.setAttribute("className", "t");
                    div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";
                    a = div.getElementsByTagName("a")[0];
                    select = document.createElement("select");
                    opt = select.appendChild(document.createElement("option"));
                    input = div.getElementsByTagName("input")[0];
                    a.style.cssText = "top:1px";
                    support.getSetAttribute = div.className !== "t";
                    support.style = /top/.test(a.getAttribute("style"));
                    support.hrefNormalized = a.getAttribute("href") === "/a";
                    support.checkOn = !!input.value;
                    support.optSelected = opt.selected;
                    support.enctype = !!document.createElement("form").enctype;
                    select.disabled = true;
                    support.optDisabled = !opt.disabled;
                    input = document.createElement("input");
                    input.setAttribute("value", "");
                    support.input = input.getAttribute("value") === "";
                    input.value = "t";
                    input.setAttribute("type", "radio");
                    support.radioValue = input.value === "t";
                })();
                __mod__[__id__] = support;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/attributes/support", (_M_["jquery/cmd/attributes/support"] = {}) && _M_);

_M_["jquery/cmd/attributes/attr"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rnotwhite = __mod__["jquery/cmd/var/rnotwhite"]();
                var strundefined = __mod__["jquery/cmd/var/strundefined"]();
                var access = __mod__["jquery/cmd/core/access"]();
                var support = __mod__["jquery/cmd/attributes/support"]();
                __mod__["jquery/cmd/attributes/val"]();
                __mod__["jquery/cmd/selector"]();
                var nodeHook, boolHook, attrHandle = jQuery.expr.attrHandle, ruseDefault = /^(?:checked|selected)$/i, getSetAttribute = support.getSetAttribute, getSetInput = support.input;
                jQuery.fn.extend({
                    attr: function(name, value) {
                        return access(this, jQuery.attr, name, value, arguments.length > 1);
                    },
                    removeAttr: function(name) {
                        return this.each(function() {
                            jQuery.removeAttr(this, name);
                        });
                    }
                });
                jQuery.extend({
                    attr: function(elem, name, value) {
                        var hooks, ret, nType = elem.nodeType;
                        if (!elem || nType === 3 || nType === 8 || nType === 2) {
                            return;
                        }
                        if (typeof elem.getAttribute === strundefined) {
                            return jQuery.prop(elem, name, value);
                        }
                        if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
                            name = name.toLowerCase();
                            hooks = jQuery.attrHooks[name] || (jQuery.expr.match.bool.test(name) ? boolHook : nodeHook);
                        }
                        if (value !== undefined) {
                            if (value === null) {
                                jQuery.removeAttr(elem, name);
                            } else if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
                                return ret;
                            } else {
                                elem.setAttribute(name, value + "");
                                return value;
                            }
                        } else if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
                            return ret;
                        } else {
                            ret = jQuery.find.attr(elem, name);
                            return ret == null ? undefined : ret;
                        }
                    },
                    removeAttr: function(elem, value) {
                        var name, propName, i = 0, attrNames = value && value.match(rnotwhite);
                        if (attrNames && elem.nodeType === 1) {
                            while (name = attrNames[i++]) {
                                propName = jQuery.propFix[name] || name;
                                if (jQuery.expr.match.bool.test(name)) {
                                    if (getSetInput && getSetAttribute || !ruseDefault.test(name)) {
                                        elem[propName] = false;
                                    } else {
                                        elem[jQuery.camelCase("default-" + name)] = elem[propName] = false;
                                    }
                                } else {
                                    jQuery.attr(elem, name, "");
                                }
                                elem.removeAttribute(getSetAttribute ? name : propName);
                            }
                        }
                    },
                    attrHooks: {
                        type: {
                            set: function(elem, value) {
                                if (!support.radioValue && value === "radio" && jQuery.nodeName(elem, "input")) {
                                    var val = elem.value;
                                    elem.setAttribute("type", value);
                                    if (val) {
                                        elem.value = val;
                                    }
                                    return value;
                                }
                            }
                        }
                    }
                });
                boolHook = {
                    set: function(elem, value, name) {
                        if (value === false) {
                            jQuery.removeAttr(elem, name);
                        } else if (getSetInput && getSetAttribute || !ruseDefault.test(name)) {
                            elem.setAttribute(!getSetAttribute && jQuery.propFix[name] || name, name);
                        } else {
                            elem[jQuery.camelCase("default-" + name)] = elem[name] = true;
                        }
                        return name;
                    }
                };
                jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function(i, name) {
                    var getter = attrHandle[name] || jQuery.find.attr;
                    attrHandle[name] = getSetInput && getSetAttribute || !ruseDefault.test(name) ? function(elem, name, isXML) {
                        var ret, handle;
                        if (!isXML) {
                            handle = attrHandle[name];
                            attrHandle[name] = ret;
                            ret = getter(elem, name, isXML) != null ? name.toLowerCase() : null;
                            attrHandle[name] = handle;
                        }
                        return ret;
                    } : function(elem, name, isXML) {
                        if (!isXML) {
                            return elem[jQuery.camelCase("default-" + name)] ? name.toLowerCase() : null;
                        }
                    };
                });
                if (!getSetInput || !getSetAttribute) {
                    jQuery.attrHooks.value = {
                        set: function(elem, value, name) {
                            if (jQuery.nodeName(elem, "input")) {
                                elem.defaultValue = value;
                            } else {
                                return nodeHook && nodeHook.set(elem, value, name);
                            }
                        }
                    };
                }
                if (!getSetAttribute) {
                    nodeHook = {
                        set: function(elem, value, name) {
                            var ret = elem.getAttributeNode(name);
                            if (!ret) {
                                elem.setAttributeNode(ret = elem.ownerDocument.createAttribute(name));
                            }
                            ret.value = value += "";
                            if (name === "value" || value === elem.getAttribute(name)) {
                                return value;
                            }
                        }
                    };
                    attrHandle.id = attrHandle.name = attrHandle.coords = function(elem, name, isXML) {
                        var ret;
                        if (!isXML) {
                            return (ret = elem.getAttributeNode(name)) && ret.value !== "" ? ret.value : null;
                        }
                    };
                    jQuery.valHooks.button = {
                        get: function(elem, name) {
                            var ret = elem.getAttributeNode(name);
                            if (ret && ret.specified) {
                                return ret.value;
                            }
                        },
                        set: nodeHook.set
                    };
                    jQuery.attrHooks.contenteditable = {
                        set: function(elem, value, name) {
                            nodeHook.set(elem, value === "" ? false : value, name);
                        }
                    };
                    jQuery.each([ "width", "height" ], function(i, name) {
                        jQuery.attrHooks[name] = {
                            set: function(elem, value) {
                                if (value === "") {
                                    elem.setAttribute(name, "auto");
                                    return value;
                                }
                            }
                        };
                    });
                }
                if (!support.style) {
                    jQuery.attrHooks.style = {
                        get: function(elem) {
                            return elem.style.cssText || undefined;
                        },
                        set: function(elem, value) {
                            return elem.style.cssText = value + "";
                        }
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/attributes/attr", (_M_["jquery/cmd/attributes/attr"] = {}) && _M_);

_M_["jquery/cmd/attributes/prop"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var access = __mod__["jquery/cmd/core/access"]();
                var support = __mod__["jquery/cmd/attributes/support"]();
                var rfocusable = /^(?:input|select|textarea|button|object)$/i, rclickable = /^(?:a|area)$/i;
                jQuery.fn.extend({
                    prop: function(name, value) {
                        return access(this, jQuery.prop, name, value, arguments.length > 1);
                    },
                    removeProp: function(name) {
                        name = jQuery.propFix[name] || name;
                        return this.each(function() {
                            try {
                                this[name] = undefined;
                                delete this[name];
                            } catch (e) {}
                        });
                    }
                });
                jQuery.extend({
                    propFix: {
                        "for": "htmlFor",
                        "class": "className"
                    },
                    prop: function(elem, name, value) {
                        var ret, hooks, notxml, nType = elem.nodeType;
                        if (!elem || nType === 3 || nType === 8 || nType === 2) {
                            return;
                        }
                        notxml = nType !== 1 || !jQuery.isXMLDoc(elem);
                        if (notxml) {
                            name = jQuery.propFix[name] || name;
                            hooks = jQuery.propHooks[name];
                        }
                        if (value !== undefined) {
                            return hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined ? ret : elem[name] = value;
                        } else {
                            return hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null ? ret : elem[name];
                        }
                    },
                    propHooks: {
                        tabIndex: {
                            get: function(elem) {
                                var tabindex = jQuery.find.attr(elem, "tabindex");
                                return tabindex ? parseInt(tabindex, 10) : rfocusable.test(elem.nodeName) || rclickable.test(elem.nodeName) && elem.href ? 0 : -1;
                            }
                        }
                    }
                });
                if (!support.hrefNormalized) {
                    jQuery.each([ "href", "src" ], function(i, name) {
                        jQuery.propHooks[name] = {
                            get: function(elem) {
                                return elem.getAttribute(name, 4);
                            }
                        };
                    });
                }
                if (!support.optSelected) {
                    jQuery.propHooks.selected = {
                        get: function(elem) {
                            var parent = elem.parentNode;
                            if (parent) {
                                parent.selectedIndex;
                                if (parent.parentNode) {
                                    parent.parentNode.selectedIndex;
                                }
                            }
                            return null;
                        }
                    };
                }
                jQuery.each([ "tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable" ], function() {
                    jQuery.propFix[this.toLowerCase()] = this;
                });
                if (!support.enctype) {
                    jQuery.propFix.enctype = "encoding";
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/attributes/prop", (_M_["jquery/cmd/attributes/prop"] = {}) && _M_);

_M_["jquery/cmd/attributes/classes"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rnotwhite = __mod__["jquery/cmd/var/rnotwhite"]();
                var strundefined = __mod__["jquery/cmd/var/strundefined"]();
                __mod__["jquery/cmd/core/init"]();
                var rclass = /[\t\r\n\f]/g;
                jQuery.fn.extend({
                    addClass: function(value) {
                        var classes, elem, cur, clazz, j, finalValue, i = 0, len = this.length, proceed = typeof value === "string" && value;
                        if (jQuery.isFunction(value)) {
                            return this.each(function(j) {
                                jQuery(this).addClass(value.call(this, j, this.className));
                            });
                        }
                        if (proceed) {
                            classes = (value || "").match(rnotwhite) || [];
                            for (;i < len; i++) {
                                elem = this[i];
                                cur = elem.nodeType === 1 && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : " ");
                                if (cur) {
                                    j = 0;
                                    while (clazz = classes[j++]) {
                                        if (cur.indexOf(" " + clazz + " ") < 0) {
                                            cur += clazz + " ";
                                        }
                                    }
                                    finalValue = jQuery.trim(cur);
                                    if (elem.className !== finalValue) {
                                        elem.className = finalValue;
                                    }
                                }
                            }
                        }
                        return this;
                    },
                    removeClass: function(value) {
                        var classes, elem, cur, clazz, j, finalValue, i = 0, len = this.length, proceed = arguments.length === 0 || typeof value === "string" && value;
                        if (jQuery.isFunction(value)) {
                            return this.each(function(j) {
                                jQuery(this).removeClass(value.call(this, j, this.className));
                            });
                        }
                        if (proceed) {
                            classes = (value || "").match(rnotwhite) || [];
                            for (;i < len; i++) {
                                elem = this[i];
                                cur = elem.nodeType === 1 && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : "");
                                if (cur) {
                                    j = 0;
                                    while (clazz = classes[j++]) {
                                        while (cur.indexOf(" " + clazz + " ") >= 0) {
                                            cur = cur.replace(" " + clazz + " ", " ");
                                        }
                                    }
                                    finalValue = value ? jQuery.trim(cur) : "";
                                    if (elem.className !== finalValue) {
                                        elem.className = finalValue;
                                    }
                                }
                            }
                        }
                        return this;
                    },
                    toggleClass: function(value, stateVal) {
                        var type = typeof value;
                        if (typeof stateVal === "boolean" && type === "string") {
                            return stateVal ? this.addClass(value) : this.removeClass(value);
                        }
                        if (jQuery.isFunction(value)) {
                            return this.each(function(i) {
                                jQuery(this).toggleClass(value.call(this, i, this.className, stateVal), stateVal);
                            });
                        }
                        return this.each(function() {
                            if (type === "string") {
                                var className, i = 0, self = jQuery(this), classNames = value.match(rnotwhite) || [];
                                while (className = classNames[i++]) {
                                    if (self.hasClass(className)) {
                                        self.removeClass(className);
                                    } else {
                                        self.addClass(className);
                                    }
                                }
                            } else if (type === strundefined || type === "boolean") {
                                if (this.className) {
                                    jQuery._data(this, "__className__", this.className);
                                }
                                this.className = this.className || value === false ? "" : jQuery._data(this, "__className__") || "";
                            }
                        });
                    },
                    hasClass: function(selector) {
                        var className = " " + selector + " ", i = 0, l = this.length;
                        for (;i < l; i++) {
                            if (this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf(className) >= 0) {
                                return true;
                            }
                        }
                        return false;
                    }
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/attributes/classes", (_M_["jquery/cmd/attributes/classes"] = {}) && _M_);

_M_["jquery/cmd/event/alias"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/event"]();
                jQuery.each(("blur focus focusin focusout load resize scroll unload click dblclick " + "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " + "change select submit keydown keypress keyup error contextmenu").split(" "), function(i, name) {
                    jQuery.fn[name] = function(data, fn) {
                        return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
                    };
                });
                jQuery.fn.extend({
                    hover: function(fnOver, fnOut) {
                        return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
                    },
                    bind: function(types, data, fn) {
                        return this.on(types, null, data, fn);
                    },
                    unbind: function(types, fn) {
                        return this.off(types, null, fn);
                    },
                    delegate: function(selector, types, data, fn) {
                        return this.on(types, selector, data, fn);
                    },
                    undelegate: function(selector, types, fn) {
                        return arguments.length === 1 ? this.off(selector, "**") : this.off(types, selector || "**", fn);
                    }
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/event/alias", (_M_["jquery/cmd/event/alias"] = {}) && _M_);

_M_["jquery/cmd/manipulation/_evalUrl"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/ajax"]();
                jQuery._evalUrl = function(url) {
                    return jQuery.ajax({
                        url: url,
                        type: "GET",
                        dataType: "script",
                        async: false,
                        global: false,
                        "throws": true
                    });
                };
                __mod__[__id__] = jQuery._evalUrl;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/manipulation/_evalUrl", (_M_["jquery/cmd/manipulation/_evalUrl"] = {}) && _M_);

_M_["jquery/cmd/ajax"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rnotwhite = __mod__["jquery/cmd/var/rnotwhite"]();
                var nonce = __mod__["jquery/cmd/ajax/var/nonce"]();
                var rquery = __mod__["jquery/cmd/ajax/var/rquery"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/ajax/parseJSON"]();
                __mod__["jquery/cmd/ajax/parseXML"]();
                __mod__["jquery/cmd/deferred"]();
                var ajaxLocParts, ajaxLocation, rhash = /#.*$/, rts = /([?&])_=[^&]*/, rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/gm, rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/, rnoContent = /^(?:GET|HEAD)$/, rprotocol = /^\/\//, rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/, prefilters = {}, transports = {}, allTypes = "*/".concat("*");
                try {
                    ajaxLocation = location.href;
                } catch (e) {
                    ajaxLocation = document.createElement("a");
                    ajaxLocation.href = "";
                    ajaxLocation = ajaxLocation.href;
                }
                ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || [];
                function addToPrefiltersOrTransports(structure) {
                    return function(dataTypeExpression, func) {
                        if (typeof dataTypeExpression !== "string") {
                            func = dataTypeExpression;
                            dataTypeExpression = "*";
                        }
                        var dataType, i = 0, dataTypes = dataTypeExpression.toLowerCase().match(rnotwhite) || [];
                        if (jQuery.isFunction(func)) {
                            while (dataType = dataTypes[i++]) {
                                if (dataType.charAt(0) === "+") {
                                    dataType = dataType.slice(1) || "*";
                                    (structure[dataType] = structure[dataType] || []).unshift(func);
                                } else {
                                    (structure[dataType] = structure[dataType] || []).push(func);
                                }
                            }
                        }
                    };
                }
                function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {
                    var inspected = {}, seekingTransport = structure === transports;
                    function inspect(dataType) {
                        var selected;
                        inspected[dataType] = true;
                        jQuery.each(structure[dataType] || [], function(_, prefilterOrFactory) {
                            var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);
                            if (typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[dataTypeOrTransport]) {
                                options.dataTypes.unshift(dataTypeOrTransport);
                                inspect(dataTypeOrTransport);
                                return false;
                            } else if (seekingTransport) {
                                return !(selected = dataTypeOrTransport);
                            }
                        });
                        return selected;
                    }
                    return inspect(options.dataTypes[0]) || !inspected["*"] && inspect("*");
                }
                function ajaxExtend(target, src) {
                    var deep, key, flatOptions = jQuery.ajaxSettings.flatOptions || {};
                    for (key in src) {
                        if (src[key] !== undefined) {
                            (flatOptions[key] ? target : deep || (deep = {}))[key] = src[key];
                        }
                    }
                    if (deep) {
                        jQuery.extend(true, target, deep);
                    }
                    return target;
                }
                function ajaxHandleResponses(s, jqXHR, responses) {
                    var firstDataType, ct, finalDataType, type, contents = s.contents, dataTypes = s.dataTypes;
                    while (dataTypes[0] === "*") {
                        dataTypes.shift();
                        if (ct === undefined) {
                            ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
                        }
                    }
                    if (ct) {
                        for (type in contents) {
                            if (contents[type] && contents[type].test(ct)) {
                                dataTypes.unshift(type);
                                break;
                            }
                        }
                    }
                    if (dataTypes[0] in responses) {
                        finalDataType = dataTypes[0];
                    } else {
                        for (type in responses) {
                            if (!dataTypes[0] || s.converters[type + " " + dataTypes[0]]) {
                                finalDataType = type;
                                break;
                            }
                            if (!firstDataType) {
                                firstDataType = type;
                            }
                        }
                        finalDataType = finalDataType || firstDataType;
                    }
                    if (finalDataType) {
                        if (finalDataType !== dataTypes[0]) {
                            dataTypes.unshift(finalDataType);
                        }
                        return responses[finalDataType];
                    }
                }
                function ajaxConvert(s, response, jqXHR, isSuccess) {
                    var conv2, current, conv, tmp, prev, converters = {}, dataTypes = s.dataTypes.slice();
                    if (dataTypes[1]) {
                        for (conv in s.converters) {
                            converters[conv.toLowerCase()] = s.converters[conv];
                        }
                    }
                    current = dataTypes.shift();
                    while (current) {
                        if (s.responseFields[current]) {
                            jqXHR[s.responseFields[current]] = response;
                        }
                        if (!prev && isSuccess && s.dataFilter) {
                            response = s.dataFilter(response, s.dataType);
                        }
                        prev = current;
                        current = dataTypes.shift();
                        if (current) {
                            if (current === "*") {
                                current = prev;
                            } else if (prev !== "*" && prev !== current) {
                                conv = converters[prev + " " + current] || converters["* " + current];
                                if (!conv) {
                                    for (conv2 in converters) {
                                        tmp = conv2.split(" ");
                                        if (tmp[1] === current) {
                                            conv = converters[prev + " " + tmp[0]] || converters["* " + tmp[0]];
                                            if (conv) {
                                                if (conv === true) {
                                                    conv = converters[conv2];
                                                } else if (converters[conv2] !== true) {
                                                    current = tmp[0];
                                                    dataTypes.unshift(tmp[1]);
                                                }
                                                break;
                                            }
                                        }
                                    }
                                }
                                if (conv !== true) {
                                    if (conv && s["throws"]) {
                                        response = conv(response);
                                    } else {
                                        try {
                                            response = conv(response);
                                        } catch (e) {
                                            return {
                                                state: "parsererror",
                                                error: conv ? e : "No conversion from " + prev + " to " + current
                                            };
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return {
                        state: "success",
                        data: response
                    };
                }
                jQuery.extend({
                    active: 0,
                    lastModified: {},
                    etag: {},
                    ajaxSettings: {
                        url: ajaxLocation,
                        type: "GET",
                        isLocal: rlocalProtocol.test(ajaxLocParts[1]),
                        global: true,
                        processData: true,
                        async: true,
                        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
                        accepts: {
                            "*": allTypes,
                            text: "text/plain",
                            html: "text/html",
                            xml: "application/xml, text/xml",
                            json: "application/json, text/javascript"
                        },
                        contents: {
                            xml: /xml/,
                            html: /html/,
                            json: /json/
                        },
                        responseFields: {
                            xml: "responseXML",
                            text: "responseText",
                            json: "responseJSON"
                        },
                        converters: {
                            "* text": String,
                            "text html": true,
                            "text json": jQuery.parseJSON,
                            "text xml": jQuery.parseXML
                        },
                        flatOptions: {
                            url: true,
                            context: true
                        }
                    },
                    ajaxSetup: function(target, settings) {
                        return settings ? ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) : ajaxExtend(jQuery.ajaxSettings, target);
                    },
                    ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
                    ajaxTransport: addToPrefiltersOrTransports(transports),
                    ajax: function(url, options) {
                        if (typeof url === "object") {
                            options = url;
                            url = undefined;
                        }
                        options = options || {};
                        var parts, i, cacheURL, responseHeadersString, timeoutTimer, fireGlobals, transport, responseHeaders, s = jQuery.ajaxSetup({}, options), callbackContext = s.context || s, globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event, deferred = jQuery.Deferred(), completeDeferred = jQuery.Callbacks("once memory"), statusCode = s.statusCode || {}, requestHeaders = {}, requestHeadersNames = {}, state = 0, strAbort = "canceled", jqXHR = {
                            readyState: 0,
                            getResponseHeader: function(key) {
                                var match;
                                if (state === 2) {
                                    if (!responseHeaders) {
                                        responseHeaders = {};
                                        while (match = rheaders.exec(responseHeadersString)) {
                                            responseHeaders[match[1].toLowerCase()] = match[2];
                                        }
                                    }
                                    match = responseHeaders[key.toLowerCase()];
                                }
                                return match == null ? null : match;
                            },
                            getAllResponseHeaders: function() {
                                return state === 2 ? responseHeadersString : null;
                            },
                            setRequestHeader: function(name, value) {
                                var lname = name.toLowerCase();
                                if (!state) {
                                    name = requestHeadersNames[lname] = requestHeadersNames[lname] || name;
                                    requestHeaders[name] = value;
                                }
                                return this;
                            },
                            overrideMimeType: function(type) {
                                if (!state) {
                                    s.mimeType = type;
                                }
                                return this;
                            },
                            statusCode: function(map) {
                                var code;
                                if (map) {
                                    if (state < 2) {
                                        for (code in map) {
                                            statusCode[code] = [ statusCode[code], map[code] ];
                                        }
                                    } else {
                                        jqXHR.always(map[jqXHR.status]);
                                    }
                                }
                                return this;
                            },
                            abort: function(statusText) {
                                var finalText = statusText || strAbort;
                                if (transport) {
                                    transport.abort(finalText);
                                }
                                done(0, finalText);
                                return this;
                            }
                        };
                        deferred.promise(jqXHR).complete = completeDeferred.add;
                        jqXHR.success = jqXHR.done;
                        jqXHR.error = jqXHR.fail;
                        s.url = ((url || s.url || ajaxLocation) + "").replace(rhash, "").replace(rprotocol, ajaxLocParts[1] + "//");
                        s.type = options.method || options.type || s.method || s.type;
                        s.dataTypes = jQuery.trim(s.dataType || "*").toLowerCase().match(rnotwhite) || [ "" ];
                        if (s.crossDomain == null) {
                            parts = rurl.exec(s.url.toLowerCase());
                            s.crossDomain = !!(parts && (parts[1] !== ajaxLocParts[1] || parts[2] !== ajaxLocParts[2] || (parts[3] || (parts[1] === "http:" ? "80" : "443")) !== (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? "80" : "443"))));
                        }
                        if (s.data && s.processData && typeof s.data !== "string") {
                            s.data = jQuery.param(s.data, s.traditional);
                        }
                        inspectPrefiltersOrTransports(prefilters, s, options, jqXHR);
                        if (state === 2) {
                            return jqXHR;
                        }
                        fireGlobals = jQuery.event && s.global;
                        if (fireGlobals && jQuery.active++ === 0) {
                            jQuery.event.trigger("ajaxStart");
                        }
                        s.type = s.type.toUpperCase();
                        s.hasContent = !rnoContent.test(s.type);
                        cacheURL = s.url;
                        if (!s.hasContent) {
                            if (s.data) {
                                cacheURL = s.url += (rquery.test(cacheURL) ? "&" : "?") + s.data;
                                delete s.data;
                            }
                            if (s.cache === false) {
                                s.url = rts.test(cacheURL) ? cacheURL.replace(rts, "$1_=" + nonce++) : cacheURL + (rquery.test(cacheURL) ? "&" : "?") + "_=" + nonce++;
                            }
                        }
                        if (s.ifModified) {
                            if (jQuery.lastModified[cacheURL]) {
                                jqXHR.setRequestHeader("If-Modified-Since", jQuery.lastModified[cacheURL]);
                            }
                            if (jQuery.etag[cacheURL]) {
                                jqXHR.setRequestHeader("If-None-Match", jQuery.etag[cacheURL]);
                            }
                        }
                        if (s.data && s.hasContent && s.contentType !== false || options.contentType) {
                            jqXHR.setRequestHeader("Content-Type", s.contentType);
                        }
                        jqXHR.setRequestHeader("Accept", s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + (s.dataTypes[0] !== "*" ? ", " + allTypes + "; q=0.01" : "") : s.accepts["*"]);
                        for (i in s.headers) {
                            jqXHR.setRequestHeader(i, s.headers[i]);
                        }
                        if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === false || state === 2)) {
                            return jqXHR.abort();
                        }
                        strAbort = "abort";
                        for (i in {
                            success: 1,
                            error: 1,
                            complete: 1
                        }) {
                            jqXHR[i](s[i]);
                        }
                        transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR);
                        if (!transport) {
                            done(-1, "No Transport");
                        } else {
                            jqXHR.readyState = 1;
                            if (fireGlobals) {
                                globalEventContext.trigger("ajaxSend", [ jqXHR, s ]);
                            }
                            if (s.async && s.timeout > 0) {
                                timeoutTimer = setTimeout(function() {
                                    jqXHR.abort("timeout");
                                }, s.timeout);
                            }
                            try {
                                state = 1;
                                transport.send(requestHeaders, done);
                            } catch (e) {
                                if (state < 2) {
                                    done(-1, e);
                                } else {
                                    throw e;
                                }
                            }
                        }
                        function done(status, nativeStatusText, responses, headers) {
                            var isSuccess, success, error, response, modified, statusText = nativeStatusText;
                            if (state === 2) {
                                return;
                            }
                            state = 2;
                            if (timeoutTimer) {
                                clearTimeout(timeoutTimer);
                            }
                            transport = undefined;
                            responseHeadersString = headers || "";
                            jqXHR.readyState = status > 0 ? 4 : 0;
                            isSuccess = status >= 200 && status < 300 || status === 304;
                            if (responses) {
                                response = ajaxHandleResponses(s, jqXHR, responses);
                            }
                            response = ajaxConvert(s, response, jqXHR, isSuccess);
                            if (isSuccess) {
                                if (s.ifModified) {
                                    modified = jqXHR.getResponseHeader("Last-Modified");
                                    if (modified) {
                                        jQuery.lastModified[cacheURL] = modified;
                                    }
                                    modified = jqXHR.getResponseHeader("etag");
                                    if (modified) {
                                        jQuery.etag[cacheURL] = modified;
                                    }
                                }
                                if (status === 204 || s.type === "HEAD") {
                                    statusText = "nocontent";
                                } else if (status === 304) {
                                    statusText = "notmodified";
                                } else {
                                    statusText = response.state;
                                    success = response.data;
                                    error = response.error;
                                    isSuccess = !error;
                                }
                            } else {
                                error = statusText;
                                if (status || !statusText) {
                                    statusText = "error";
                                    if (status < 0) {
                                        status = 0;
                                    }
                                }
                            }
                            jqXHR.status = status;
                            jqXHR.statusText = (nativeStatusText || statusText) + "";
                            if (isSuccess) {
                                deferred.resolveWith(callbackContext, [ success, statusText, jqXHR ]);
                            } else {
                                deferred.rejectWith(callbackContext, [ jqXHR, statusText, error ]);
                            }
                            jqXHR.statusCode(statusCode);
                            statusCode = undefined;
                            if (fireGlobals) {
                                globalEventContext.trigger(isSuccess ? "ajaxSuccess" : "ajaxError", [ jqXHR, s, isSuccess ? success : error ]);
                            }
                            completeDeferred.fireWith(callbackContext, [ jqXHR, statusText ]);
                            if (fireGlobals) {
                                globalEventContext.trigger("ajaxComplete", [ jqXHR, s ]);
                                if (!--jQuery.active) {
                                    jQuery.event.trigger("ajaxStop");
                                }
                            }
                        }
                        return jqXHR;
                    },
                    getJSON: function(url, data, callback) {
                        return jQuery.get(url, data, callback, "json");
                    },
                    getScript: function(url, callback) {
                        return jQuery.get(url, undefined, callback, "script");
                    }
                });
                jQuery.each([ "get", "post" ], function(i, method) {
                    jQuery[method] = function(url, data, callback, type) {
                        if (jQuery.isFunction(data)) {
                            type = type || callback;
                            callback = data;
                            data = undefined;
                        }
                        return jQuery.ajax({
                            url: url,
                            type: method,
                            dataType: type,
                            data: data,
                            success: callback
                        });
                    };
                });
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/ajax", (_M_["jquery/cmd/ajax"] = {}) && _M_);

_M_["jquery/cmd/ajax/var/nonce"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__[__id__] = jQuery.now();
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/ajax/var/nonce", (_M_["jquery/cmd/ajax/var/nonce"] = {}) && _M_);

_M_["jquery/cmd/ajax/var/rquery"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = /\?/;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/ajax/var/rquery", (_M_["jquery/cmd/ajax/var/rquery"] = {}) && _M_);

_M_["jquery/cmd/ajax/parseJSON"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rvalidtokens = /(,)|(\[|{)|(}|])|"(?:[^"\\\r\n]|\\["\\\/bfnrt]|\\u[\da-fA-F]{4})*"\s*:?|true|false|null|-?(?!0\d)\d+(?:\.\d+|)(?:[eE][+-]?\d+|)/g;
                jQuery.parseJSON = function(data) {
                    if (window.JSON && window.JSON.parse) {
                        return window.JSON.parse(data + "");
                    }
                    var requireNonComma, depth = null, str = jQuery.trim(data + "");
                    return str && !jQuery.trim(str.replace(rvalidtokens, function(token, comma, open, close) {
                        if (requireNonComma && comma) {
                            depth = 0;
                        }
                        if (depth === 0) {
                            return token;
                        }
                        requireNonComma = open || comma;
                        depth += !close - !open;
                        return "";
                    })) ? Function("return " + str)() : jQuery.error("Invalid JSON: " + data);
                };
                __mod__[__id__] = jQuery.parseJSON;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/ajax/parseJSON", (_M_["jquery/cmd/ajax/parseJSON"] = {}) && _M_);

_M_["jquery/cmd/ajax/parseXML"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                jQuery.parseXML = function(data) {
                    var xml, tmp;
                    if (!data || typeof data !== "string") {
                        return null;
                    }
                    try {
                        if (window.DOMParser) {
                            tmp = new DOMParser();
                            xml = tmp.parseFromString(data, "text/xml");
                        } else {
                            xml = new ActiveXObject("Microsoft.XMLDOM");
                            xml.async = "false";
                            xml.loadXML(data);
                        }
                    } catch (e) {
                        xml = undefined;
                    }
                    if (!xml || !xml.documentElement || xml.getElementsByTagName("parsererror").length) {
                        jQuery.error("Invalid XML: " + data);
                    }
                    return xml;
                };
                __mod__[__id__] = jQuery.parseXML;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/ajax/parseXML", (_M_["jquery/cmd/ajax/parseXML"] = {}) && _M_);

_M_["jquery/cmd/wrap"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/manipulation"]();
                __mod__["jquery/cmd/traversing"]();
                jQuery.fn.extend({
                    wrapAll: function(html) {
                        if (jQuery.isFunction(html)) {
                            return this.each(function(i) {
                                jQuery(this).wrapAll(html.call(this, i));
                            });
                        }
                        if (this[0]) {
                            var wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);
                            if (this[0].parentNode) {
                                wrap.insertBefore(this[0]);
                            }
                            wrap.map(function() {
                                var elem = this;
                                while (elem.firstChild && elem.firstChild.nodeType === 1) {
                                    elem = elem.firstChild;
                                }
                                return elem;
                            }).append(this);
                        }
                        return this;
                    },
                    wrapInner: function(html) {
                        if (jQuery.isFunction(html)) {
                            return this.each(function(i) {
                                jQuery(this).wrapInner(html.call(this, i));
                            });
                        }
                        return this.each(function() {
                            var self = jQuery(this), contents = self.contents();
                            if (contents.length) {
                                contents.wrapAll(html);
                            } else {
                                self.append(html);
                            }
                        });
                    },
                    wrap: function(html) {
                        var isFunction = jQuery.isFunction(html);
                        return this.each(function(i) {
                            jQuery(this).wrapAll(isFunction ? html.call(this, i) : html);
                        });
                    },
                    unwrap: function() {
                        return this.parent().each(function() {
                            if (!jQuery.nodeName(this, "body")) {
                                jQuery(this).replaceWith(this.childNodes);
                            }
                        }).end();
                    }
                });
                return jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/wrap", (_M_["jquery/cmd/wrap"] = {}) && _M_);

_M_["jquery/cmd/css/hiddenVisibleSelectors"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var support = __mod__["jquery/cmd/css/support"]();
                __mod__["jquery/cmd/selector"]();
                __mod__["jquery/cmd/css"]();
                jQuery.expr.filters.hidden = function(elem) {
                    return elem.offsetWidth <= 0 && elem.offsetHeight <= 0 || !support.reliableHiddenOffsets() && (elem.style && elem.style.display || jQuery.css(elem, "display")) === "none";
                };
                jQuery.expr.filters.visible = function(elem) {
                    return !jQuery.expr.filters.hidden(elem);
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/css/hiddenVisibleSelectors", (_M_["jquery/cmd/css/hiddenVisibleSelectors"] = {}) && _M_);

_M_["jquery/cmd/serialize"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rcheckableType = __mod__["jquery/cmd/manipulation/var/rcheckableType"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/traversing"]();
                __mod__["jquery/cmd/attributes/prop"]();
                var r20 = /%20/g, rbracket = /\[\]$/, rCRLF = /\r?\n/g, rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i, rsubmittable = /^(?:input|select|textarea|keygen)/i;
                function buildParams(prefix, obj, traditional, add) {
                    var name;
                    if (jQuery.isArray(obj)) {
                        jQuery.each(obj, function(i, v) {
                            if (traditional || rbracket.test(prefix)) {
                                add(prefix, v);
                            } else {
                                buildParams(prefix + "[" + (typeof v === "object" ? i : "") + "]", v, traditional, add);
                            }
                        });
                    } else if (!traditional && jQuery.type(obj) === "object") {
                        for (name in obj) {
                            buildParams(prefix + "[" + name + "]", obj[name], traditional, add);
                        }
                    } else {
                        add(prefix, obj);
                    }
                }
                jQuery.param = function(a, traditional) {
                    var prefix, s = [], add = function(key, value) {
                        value = jQuery.isFunction(value) ? value() : value == null ? "" : value;
                        s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
                    };
                    if (traditional === undefined) {
                        traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
                    }
                    if (jQuery.isArray(a) || a.jquery && !jQuery.isPlainObject(a)) {
                        jQuery.each(a, function() {
                            add(this.name, this.value);
                        });
                    } else {
                        for (prefix in a) {
                            buildParams(prefix, a[prefix], traditional, add);
                        }
                    }
                    return s.join("&").replace(r20, "+");
                };
                jQuery.fn.extend({
                    serialize: function() {
                        return jQuery.param(this.serializeArray());
                    },
                    serializeArray: function() {
                        return this.map(function() {
                            var elements = jQuery.prop(this, "elements");
                            return elements ? jQuery.makeArray(elements) : this;
                        }).filter(function() {
                            var type = this.type;
                            return this.name && !jQuery(this).is(":disabled") && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
                        }).map(function(i, elem) {
                            var val = jQuery(this).val();
                            return val == null ? null : jQuery.isArray(val) ? jQuery.map(val, function(val) {
                                return {
                                    name: elem.name,
                                    value: val.replace(rCRLF, "\r\n")
                                };
                            }) : {
                                name: elem.name,
                                value: val.replace(rCRLF, "\r\n")
                            };
                        }).get();
                    }
                });
                return jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/serialize", (_M_["jquery/cmd/serialize"] = {}) && _M_);

_M_["jquery/cmd/ajax/xhr"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var support = __mod__["jquery/cmd/var/support"]();
                __mod__["jquery/cmd/ajax"]();
                jQuery.ajaxSettings.xhr = window.ActiveXObject !== undefined ? function() {
                    return !this.isLocal && /^(get|post|head|put|delete|options)$/i.test(this.type) && createStandardXHR() || createActiveXHR();
                } : createStandardXHR;
                var xhrId = 0, xhrCallbacks = {}, xhrSupported = jQuery.ajaxSettings.xhr();
                if (window.attachEvent) {
                    window.attachEvent("onunload", function() {
                        for (var key in xhrCallbacks) {
                            xhrCallbacks[key](undefined, true);
                        }
                    });
                }
                support.cors = !!xhrSupported && "withCredentials" in xhrSupported;
                xhrSupported = support.ajax = !!xhrSupported;
                if (xhrSupported) {
                    jQuery.ajaxTransport(function(options) {
                        if (!options.crossDomain || support.cors) {
                            var callback;
                            return {
                                send: function(headers, complete) {
                                    var i, xhr = options.xhr(), id = ++xhrId;
                                    xhr.open(options.type, options.url, options.async, options.username, options.password);
                                    if (options.xhrFields) {
                                        for (i in options.xhrFields) {
                                            xhr[i] = options.xhrFields[i];
                                        }
                                    }
                                    if (options.mimeType && xhr.overrideMimeType) {
                                        xhr.overrideMimeType(options.mimeType);
                                    }
                                    if (!options.crossDomain && !headers["X-Requested-With"]) {
                                        headers["X-Requested-With"] = "XMLHttpRequest";
                                    }
                                    for (i in headers) {
                                        if (headers[i] !== undefined) {
                                            xhr.setRequestHeader(i, headers[i] + "");
                                        }
                                    }
                                    xhr.send(options.hasContent && options.data || null);
                                    callback = function(_, isAbort) {
                                        var status, statusText, responses;
                                        if (callback && (isAbort || xhr.readyState === 4)) {
                                            delete xhrCallbacks[id];
                                            callback = undefined;
                                            xhr.onreadystatechange = jQuery.noop;
                                            if (isAbort) {
                                                if (xhr.readyState !== 4) {
                                                    xhr.abort();
                                                }
                                            } else {
                                                responses = {};
                                                status = xhr.status;
                                                if (typeof xhr.responseText === "string") {
                                                    responses.text = xhr.responseText;
                                                }
                                                try {
                                                    statusText = xhr.statusText;
                                                } catch (e) {
                                                    statusText = "";
                                                }
                                                if (!status && options.isLocal && !options.crossDomain) {
                                                    status = responses.text ? 200 : 404;
                                                } else if (status === 1223) {
                                                    status = 204;
                                                }
                                            }
                                        }
                                        if (responses) {
                                            complete(status, statusText, responses, xhr.getAllResponseHeaders());
                                        }
                                    };
                                    if (!options.async) {
                                        callback();
                                    } else if (xhr.readyState === 4) {
                                        setTimeout(callback);
                                    } else {
                                        xhr.onreadystatechange = xhrCallbacks[id] = callback;
                                    }
                                },
                                abort: function() {
                                    if (callback) {
                                        callback(undefined, true);
                                    }
                                }
                            };
                        }
                    });
                }
                function createStandardXHR() {
                    try {
                        return new window.XMLHttpRequest();
                    } catch (e) {}
                }
                function createActiveXHR() {
                    try {
                        return new window.ActiveXObject("Microsoft.XMLHTTP");
                    } catch (e) {}
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/ajax/xhr", (_M_["jquery/cmd/ajax/xhr"] = {}) && _M_);

_M_["jquery/cmd/ajax/script"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/ajax"]();
                jQuery.ajaxSetup({
                    accepts: {
                        script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
                    },
                    contents: {
                        script: /(?:java|ecma)script/
                    },
                    converters: {
                        "text script": function(text) {
                            jQuery.globalEval(text);
                            return text;
                        }
                    }
                });
                jQuery.ajaxPrefilter("script", function(s) {
                    if (s.cache === undefined) {
                        s.cache = false;
                    }
                    if (s.crossDomain) {
                        s.type = "GET";
                        s.global = false;
                    }
                });
                jQuery.ajaxTransport("script", function(s) {
                    if (s.crossDomain) {
                        var script, head = document.head || jQuery("head")[0] || document.documentElement;
                        return {
                            send: function(_, callback) {
                                script = document.createElement("script");
                                script.async = true;
                                if (s.scriptCharset) {
                                    script.charset = s.scriptCharset;
                                }
                                script.src = s.url;
                                script.onload = script.onreadystatechange = function(_, isAbort) {
                                    if (isAbort || !script.readyState || /loaded|complete/.test(script.readyState)) {
                                        script.onload = script.onreadystatechange = null;
                                        if (script.parentNode) {
                                            script.parentNode.removeChild(script);
                                        }
                                        script = null;
                                        if (!isAbort) {
                                            callback(200, "success");
                                        }
                                    }
                                };
                                head.insertBefore(script, head.firstChild);
                            },
                            abort: function() {
                                if (script) {
                                    script.onload(undefined, true);
                                }
                            }
                        };
                    }
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/ajax/script", (_M_["jquery/cmd/ajax/script"] = {}) && _M_);

_M_["jquery/cmd/ajax/jsonp"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var nonce = __mod__["jquery/cmd/ajax/var/nonce"]();
                var rquery = __mod__["jquery/cmd/ajax/var/rquery"]();
                __mod__["jquery/cmd/ajax"]();
                var oldCallbacks = [], rjsonp = /(=)\?(?=&|$)|\?\?/;
                jQuery.ajaxSetup({
                    jsonp: "callback",
                    jsonpCallback: function() {
                        var callback = oldCallbacks.pop() || jQuery.expando + "_" + nonce++;
                        this[callback] = true;
                        return callback;
                    }
                });
                jQuery.ajaxPrefilter("json jsonp", function(s, originalSettings, jqXHR) {
                    var callbackName, overwritten, responseContainer, jsonProp = s.jsonp !== false && (rjsonp.test(s.url) ? "url" : typeof s.data === "string" && !(s.contentType || "").indexOf("application/x-www-form-urlencoded") && rjsonp.test(s.data) && "data");
                    if (jsonProp || s.dataTypes[0] === "jsonp") {
                        callbackName = s.jsonpCallback = jQuery.isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback;
                        if (jsonProp) {
                            s[jsonProp] = s[jsonProp].replace(rjsonp, "$1" + callbackName);
                        } else if (s.jsonp !== false) {
                            s.url += (rquery.test(s.url) ? "&" : "?") + s.jsonp + "=" + callbackName;
                        }
                        s.converters["script json"] = function() {
                            if (!responseContainer) {
                                jQuery.error(callbackName + " was not called");
                            }
                            return responseContainer[0];
                        };
                        s.dataTypes[0] = "json";
                        overwritten = window[callbackName];
                        window[callbackName] = function() {
                            responseContainer = arguments;
                        };
                        jqXHR.always(function() {
                            window[callbackName] = overwritten;
                            if (s[callbackName]) {
                                s.jsonpCallback = originalSettings.jsonpCallback;
                                oldCallbacks.push(callbackName);
                            }
                            if (responseContainer && jQuery.isFunction(overwritten)) {
                                overwritten(responseContainer[0]);
                            }
                            responseContainer = overwritten = undefined;
                        });
                        return "script";
                    }
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/ajax/jsonp", (_M_["jquery/cmd/ajax/jsonp"] = {}) && _M_);

_M_["jquery/cmd/ajax/load"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/core/parseHTML"]();
                __mod__["jquery/cmd/ajax"]();
                __mod__["jquery/cmd/traversing"]();
                __mod__["jquery/cmd/manipulation"]();
                __mod__["jquery/cmd/selector"]();
                __mod__["jquery/cmd/event/alias"]();
                var _load = jQuery.fn.load;
                jQuery.fn.load = function(url, params, callback) {
                    if (typeof url !== "string" && _load) {
                        return _load.apply(this, arguments);
                    }
                    var selector, response, type, self = this, off = url.indexOf(" ");
                    if (off >= 0) {
                        selector = jQuery.trim(url.slice(off, url.length));
                        url = url.slice(0, off);
                    }
                    if (jQuery.isFunction(params)) {
                        callback = params;
                        params = undefined;
                    } else if (params && typeof params === "object") {
                        type = "POST";
                    }
                    if (self.length > 0) {
                        jQuery.ajax({
                            url: url,
                            type: type,
                            dataType: "html",
                            data: params
                        }).done(function(responseText) {
                            response = arguments;
                            self.html(selector ? jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector) : responseText);
                        }).complete(callback && function(jqXHR, status) {
                            self.each(callback, response || [ jqXHR.responseText, status, jqXHR ]);
                        });
                    }
                    return this;
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/ajax/load", (_M_["jquery/cmd/ajax/load"] = {}) && _M_);

_M_["jquery/cmd/core/parseHTML"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var rsingleTag = __mod__["jquery/cmd/core/var/rsingleTag"]();
                __mod__["jquery/cmd/manipulation"]();
                jQuery.parseHTML = function(data, context, keepScripts) {
                    if (!data || typeof data !== "string") {
                        return null;
                    }
                    if (typeof context === "boolean") {
                        keepScripts = context;
                        context = false;
                    }
                    context = context || document;
                    var parsed = rsingleTag.exec(data), scripts = !keepScripts && [];
                    if (parsed) {
                        return [ context.createElement(parsed[1]) ];
                    }
                    parsed = jQuery.buildFragment([ data ], context, scripts);
                    if (scripts && scripts.length) {
                        jQuery(scripts).remove();
                    }
                    return jQuery.merge([], parsed.childNodes);
                };
                __mod__[__id__] = jQuery.parseHTML;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/core/parseHTML", (_M_["jquery/cmd/core/parseHTML"] = {}) && _M_);

_M_["jquery/cmd/event/ajax"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/event"]();
                jQuery.each([ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function(i, type) {
                    jQuery.fn[type] = function(fn) {
                        return this.on(type, fn);
                    };
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/event/ajax", (_M_["jquery/cmd/event/ajax"] = {}) && _M_);

_M_["jquery/cmd/effects/animatedSelector"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/selector"]();
                __mod__["jquery/cmd/effects"]();
                jQuery.expr.filters.animated = function(elem) {
                    return jQuery.grep(jQuery.timers, function(fn) {
                        return elem === fn.elem;
                    }).length;
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/effects/animatedSelector", (_M_["jquery/cmd/effects/animatedSelector"] = {}) && _M_);

_M_["jquery/cmd/offset"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var strundefined = __mod__["jquery/cmd/var/strundefined"]();
                var access = __mod__["jquery/cmd/core/access"]();
                var rnumnonpx = __mod__["jquery/cmd/css/var/rnumnonpx"]();
                var curCSS = __mod__["jquery/cmd/css/curCSS"]();
                var addGetHookIf = __mod__["jquery/cmd/css/addGetHookIf"]();
                var support = __mod__["jquery/cmd/css/support"]();
                __mod__["jquery/cmd/core/init"]();
                __mod__["jquery/cmd/css"]();
                __mod__["jquery/cmd/selector"]();
                curCSS = curCSS.curCSS;
                var docElem = window.document.documentElement;
                function getWindow(elem) {
                    return jQuery.isWindow(elem) ? elem : elem.nodeType === 9 ? elem.defaultView || elem.parentWindow : false;
                }
                jQuery.offset = {
                    setOffset: function(elem, options, i) {
                        var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition, position = jQuery.css(elem, "position"), curElem = jQuery(elem), props = {};
                        if (position === "static") {
                            elem.style.position = "relative";
                        }
                        curOffset = curElem.offset();
                        curCSSTop = jQuery.css(elem, "top");
                        curCSSLeft = jQuery.css(elem, "left");
                        calculatePosition = (position === "absolute" || position === "fixed") && jQuery.inArray("auto", [ curCSSTop, curCSSLeft ]) > -1;
                        if (calculatePosition) {
                            curPosition = curElem.position();
                            curTop = curPosition.top;
                            curLeft = curPosition.left;
                        } else {
                            curTop = parseFloat(curCSSTop) || 0;
                            curLeft = parseFloat(curCSSLeft) || 0;
                        }
                        if (jQuery.isFunction(options)) {
                            options = options.call(elem, i, curOffset);
                        }
                        if (options.top != null) {
                            props.top = options.top - curOffset.top + curTop;
                        }
                        if (options.left != null) {
                            props.left = options.left - curOffset.left + curLeft;
                        }
                        if ("using" in options) {
                            options.using.call(elem, props);
                        } else {
                            curElem.css(props);
                        }
                    }
                };
                jQuery.fn.extend({
                    offset: function(options) {
                        if (arguments.length) {
                            return options === undefined ? this : this.each(function(i) {
                                jQuery.offset.setOffset(this, options, i);
                            });
                        }
                        var docElem, win, box = {
                            top: 0,
                            left: 0
                        }, elem = this[0], doc = elem && elem.ownerDocument;
                        if (!doc) {
                            return;
                        }
                        docElem = doc.documentElement;
                        if (!jQuery.contains(docElem, elem)) {
                            return box;
                        }
                        if (typeof elem.getBoundingClientRect !== strundefined) {
                            box = elem.getBoundingClientRect();
                        }
                        win = getWindow(doc);
                        return {
                            top: box.top + (win.pageYOffset || docElem.scrollTop) - (docElem.clientTop || 0),
                            left: box.left + (win.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || 0)
                        };
                    },
                    position: function() {
                        if (!this[0]) {
                            return;
                        }
                        var offsetParent, offset, parentOffset = {
                            top: 0,
                            left: 0
                        }, elem = this[0];
                        if (jQuery.css(elem, "position") === "fixed") {
                            offset = elem.getBoundingClientRect();
                        } else {
                            offsetParent = this.offsetParent();
                            offset = this.offset();
                            if (!jQuery.nodeName(offsetParent[0], "html")) {
                                parentOffset = offsetParent.offset();
                            }
                            parentOffset.top += jQuery.css(offsetParent[0], "borderTopWidth", true);
                            parentOffset.left += jQuery.css(offsetParent[0], "borderLeftWidth", true);
                        }
                        return {
                            top: offset.top - parentOffset.top - jQuery.css(elem, "marginTop", true),
                            left: offset.left - parentOffset.left - jQuery.css(elem, "marginLeft", true)
                        };
                    },
                    offsetParent: function() {
                        return this.map(function() {
                            var offsetParent = this.offsetParent || docElem;
                            while (offsetParent && !jQuery.nodeName(offsetParent, "html") && jQuery.css(offsetParent, "position") === "static") {
                                offsetParent = offsetParent.offsetParent;
                            }
                            return offsetParent || docElem;
                        });
                    }
                });
                jQuery.each({
                    scrollLeft: "pageXOffset",
                    scrollTop: "pageYOffset"
                }, function(method, prop) {
                    var top = /Y/.test(prop);
                    jQuery.fn[method] = function(val) {
                        return access(this, function(elem, method, val) {
                            var win = getWindow(elem);
                            if (val === undefined) {
                                return win ? prop in win ? win[prop] : win.document.documentElement[method] : elem[method];
                            }
                            if (win) {
                                win.scrollTo(!top ? val : jQuery(win).scrollLeft(), top ? val : jQuery(win).scrollTop());
                            } else {
                                elem[method] = val;
                            }
                        }, method, val, arguments.length, null);
                    };
                });
                jQuery.each([ "top", "left" ], function(i, prop) {
                    jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function(elem, computed) {
                        if (computed) {
                            computed = curCSS(elem, prop);
                            return rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + "px" : computed;
                        }
                    });
                });
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/offset", (_M_["jquery/cmd/offset"] = {}) && _M_);

_M_["jquery/cmd/dimensions"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                var access = __mod__["jquery/cmd/core/access"]();
                __mod__["jquery/cmd/css"]();
                jQuery.each({
                    Height: "height",
                    Width: "width"
                }, function(name, type) {
                    jQuery.each({
                        padding: "inner" + name,
                        content: type,
                        "": "outer" + name
                    }, function(defaultExtra, funcName) {
                        jQuery.fn[funcName] = function(margin, value) {
                            var chainable = arguments.length && (defaultExtra || typeof margin !== "boolean"), extra = defaultExtra || (margin === true || value === true ? "margin" : "border");
                            return access(this, function(elem, type, value) {
                                var doc;
                                if (jQuery.isWindow(elem)) {
                                    return elem.document.documentElement["client" + name];
                                }
                                if (elem.nodeType === 9) {
                                    doc = elem.documentElement;
                                    return Math.max(elem.body["scroll" + name], doc["scroll" + name], elem.body["offset" + name], doc["offset" + name], doc["client" + name]);
                                }
                                return value === undefined ? jQuery.css(elem, type, extra) : jQuery.style(elem, type, value, extra);
                            }, type, chainable ? margin : undefined, chainable, null);
                        };
                    });
                });
                __mod__[__id__] = jQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/dimensions", (_M_["jquery/cmd/dimensions"] = {}) && _M_);

_M_["jquery/cmd/deprecated"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                __mod__["jquery/cmd/traversing"]();
                jQuery.fn.size = function() {
                    return this.length;
                };
                jQuery.fn.andSelf = jQuery.fn.addBack;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/deprecated", (_M_["jquery/cmd/deprecated"] = {}) && _M_);

_M_["jquery/cmd/exports/amd"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var jQuery = __mod__["jquery/cmd/core"]();
                if (typeof define === "function" && define.amd) {
                    define("jquery", [], function() {
                        return jQuery;
                    });
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("jquery/cmd/exports/amd", (_M_["jquery/cmd/exports/amd"] = {}) && _M_);

_M_["platform/__callbacks__"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var callbacks = {};
                __mod__[__id__] = callbacks;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/__callbacks__", (_M_["platform/__callbacks__"] = {}) && _M_);

_M_["platform/prototype/array/every"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                if (!Array.prototype.every) {
                    Array.prototype.every = function(fun) {
                        if (this == null) throw new TypeError();
                        var t = Object(this);
                        var len = t.length >>> 0;
                        if (typeof fun != "function") throw new TypeError();
                        var thisp = arguments[1];
                        for (var i = 0; i < len; i++) {
                            if (i in t && !fun.call(thisp, t[i], i, t)) return false;
                        }
                        return true;
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/array/every", (_M_["platform/prototype/array/every"] = {}) && _M_);

_M_["platform/prototype/array/filter"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                if (!Array.prototype.filter) {
                    Array.prototype.filter = function(fun) {
                        if (this == null) throw new TypeError();
                        var t = Object(this);
                        var len = t.length >>> 0;
                        if (typeof fun != "function") throw new TypeError();
                        var res = [];
                        var thisp = arguments[1];
                        for (var i = 0; i < len; i++) {
                            if (i in t) {
                                var val = t[i];
                                if (fun.call(thisp, val, i, t)) res.push(val);
                            }
                        }
                        return res;
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/array/filter", (_M_["platform/prototype/array/filter"] = {}) && _M_);

_M_["platform/prototype/array/forEach"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                if (!Array.prototype.forEach) {
                    Array.prototype.forEach = function(callback, thisArg) {
                        var T, k;
                        if (this == null) {
                            throw new TypeError("this is null or not defined");
                        }
                        var O = Object(this);
                        var len = O.length >>> 0;
                        if ({}.toString.call(callback) != "[object Function]") {
                            throw new TypeError(callback + " is not a function");
                        }
                        if (thisArg) {
                            T = thisArg;
                        }
                        k = 0;
                        while (k < len) {
                            var kValue;
                            if (k in O) {
                                kValue = O[k];
                                callback.call(T, kValue, k, O);
                            }
                            k++;
                        }
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/array/forEach", (_M_["platform/prototype/array/forEach"] = {}) && _M_);

_M_["platform/prototype/array/indexOf"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                if (!Array.prototype.indexOf) {
                    Array.prototype.indexOf = function(searchElement) {
                        var len = this.length, i = +arguments[1] || 0;
                        if (len === 0 || isNaN(i) || i >= len) return -1;
                        if (i < 0) {
                            i = len + i;
                            i < 0 && (i = 0);
                        }
                        for (;i < len; ++i) {
                            if (this[i] === searchElement) return i;
                        }
                        return -1;
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/array/indexOf", (_M_["platform/prototype/array/indexOf"] = {}) && _M_);

_M_["platform/prototype/array/lastIndexOf"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                if (!Array.prototype.lastIndexOf) {
                    Array.prototype.lastIndexOf = function(searchElement) {
                        if (this == null) throw new TypeError();
                        var t = Object(this);
                        var len = t.length >>> 0;
                        if (len === 0) return -1;
                        var n = len;
                        if (arguments.length > 1) {
                            n = Number(arguments[1]);
                            if (n != n) n = 0; else if (n != 0 && n != 1 / 0 && n != -(1 / 0)) n = (n > 0 || -1) * Math.floor(Math.abs(n));
                        }
                        var k = n >= 0 ? Math.min(n, len - 1) : len - Math.abs(n);
                        for (;k >= 0; k--) {
                            if (k in t && t[k] === searchElement) return k;
                        }
                        return -1;
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/array/lastIndexOf", (_M_["platform/prototype/array/lastIndexOf"] = {}) && _M_);

_M_["platform/prototype/array/map"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                if (!Array.prototype.map) {
                    Array.prototype.map = function(callback, thisArg) {
                        var T, A, k;
                        if (this == null) {
                            throw new TypeError(" this is null or not defined");
                        }
                        var O = Object(this);
                        var len = O.length >>> 0;
                        if ({}.toString.call(callback) != "[object Function]") {
                            throw new TypeError(callback + " is not a function");
                        }
                        if (thisArg) {
                            T = thisArg;
                        }
                        A = new Array(len);
                        k = 0;
                        while (k < len) {
                            var kValue, mappedValue;
                            if (k in O) {
                                kValue = O[k];
                                mappedValue = callback.call(T, kValue, k, O);
                                A[k] = mappedValue;
                            }
                            k++;
                        }
                        return A;
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/array/map", (_M_["platform/prototype/array/map"] = {}) && _M_);

_M_["platform/prototype/array/reduce"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                if (!Array.prototype.reduce) {
                    Array.prototype.reduce = function reduce(accumulator) {
                        if (this === null || this === undefined) throw new TypeError("Object is null or undefined");
                        var i = 0, l = this.length >> 0, curr;
                        if (typeof accumulator !== "function") throw new TypeError("First argument is not callable");
                        if (arguments.length < 2) {
                            if (l === 0) throw new TypeError("Array length is 0 and no second argument");
                            curr = this[0];
                            i = 1;
                        } else curr = arguments[1];
                        while (i < l) {
                            if (i in this) curr = accumulator.call(undefined, curr, this[i], i, this);
                            ++i;
                        }
                        return curr;
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/array/reduce", (_M_["platform/prototype/array/reduce"] = {}) && _M_);

_M_["platform/prototype/array/some"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                if (!Array.prototype.some) {
                    Array.prototype.some = function(fun) {
                        if (this == null) throw new TypeError();
                        var t = Object(this);
                        var len = t.length >>> 0;
                        if (typeof fun != "function") throw new TypeError();
                        var thisp = arguments[1];
                        for (var i = 0; i < len; i++) {
                            if (i in t && fun.call(thisp, t[i], i, t)) return true;
                        }
                        return false;
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/array/some", (_M_["platform/prototype/array/some"] = {}) && _M_);

_M_["platform/prototype/function/bind"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                if (!Function.prototype.bind) {
                    Function.prototype.bind = function(oThis) {
                        if (typeof this !== "function") {
                            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
                        }
                        var aArgs = Array.prototype.slice.call(arguments, 1), fToBind = this, fNOP = function() {}, fBound = function() {
                            return fToBind.apply(this instanceof fNOP ? this : oThis || window, aArgs.concat(Array.prototype.slice.call(arguments)));
                        };
                        fNOP.prototype = this.prototype;
                        fBound.prototype = new fNOP();
                        return fBound;
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/function/bind", (_M_["platform/prototype/function/bind"] = {}) && _M_);

_M_["platform/prototype/json/parse"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                global.JSON = global.JSON || {};
                if (!global.JSON.parse) {
                    global.JSON.parse = function(data) {
                        return new Function("return " + data)();
                    };
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/json/parse", (_M_["platform/prototype/json/parse"] = {}) && _M_);

_M_["platform/prototype/json/stringify"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                global.JSON = global.JSON || {};
                if (!global.JSON.stringify) {
                    global.JSON.stringify = function() {
                        var escapeMap = {
                            "\b": "\\b",
                            "	": "\\t",
                            "\n": "\\n",
                            "\f": "\\f",
                            "\r": "\\r",
                            '"': '\\"',
                            "\\": "\\\\"
                        };
                        function encodeString(source) {
                            if (/["\\\x00-\x1f]/.test(source)) {
                                source = source.replace(/["\\\x00-\x1f]/g, function(match) {
                                    var c = escapeMap[match];
                                    if (c) {
                                        return c;
                                    }
                                    c = match.charCodeAt();
                                    return "\\u00" + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
                                });
                            }
                            return '"' + source + '"';
                        }
                        function encodeArray(source) {
                            var result = [ "[" ], l = source.length, preComma, i, item;
                            for (i = 0; i < l; i++) {
                                item = source[i];
                                switch (typeof item) {
                                  case "undefined":
                                  case "function":
                                  case "unknown":
                                    break;

                                  default:
                                    if (preComma) {
                                        result.push(",");
                                    }
                                    result.push(global.JSON.stringify(item));
                                    preComma = 1;
                                }
                            }
                            result.push("]");
                            return result.join("");
                        }
                        function pad(source) {
                            return source < 10 ? "0" + source : source;
                        }
                        function encodeDate(source) {
                            return '"' + source.getFullYear() + "-" + pad(source.getMonth() + 1) + "-" + pad(source.getDate()) + "T" + pad(source.getHours()) + ":" + pad(source.getMinutes()) + ":" + pad(source.getSeconds()) + '"';
                        }
                        return function(value) {
                            switch (typeof value) {
                              case "undefined":
                                return "undefined";

                              case "number":
                                return isFinite(value) ? String(value) : "null";

                              case "string":
                                return encodeString(value);

                              case "boolean":
                                return String(value);

                              default:
                                if (value === null) {
                                    return "null";
                                } else if (value instanceof Array) {
                                    return encodeArray(value);
                                } else if (value instanceof Date) {
                                    return encodeDate(value);
                                } else {
                                    var result = [ "{" ], encode = global.JSON.stringify, preComma, item;
                                    for (var key in value) {
                                        if (Object.prototype.hasOwnProperty.call(value, key)) {
                                            item = value[key];
                                            switch (typeof item) {
                                              case "undefined":
                                              case "unknown":
                                              case "function":
                                                break;

                                              default:
                                                if (preComma) {
                                                    result.push(",");
                                                }
                                                preComma = 1;
                                                result.push(encode(key) + ":" + encode(item));
                                            }
                                        }
                                    }
                                    result.push("}");
                                    return result.join("");
                                }
                            }
                        };
                    }();
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/json/stringify", (_M_["platform/prototype/json/stringify"] = {}) && _M_);

_M_["platform/prototype/string/trim"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                String.prototype.trim || (String.prototype.trim = function() {
                    return this.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/prototype/string/trim", (_M_["platform/prototype/string/trim"] = {}) && _M_);

_M_["platform/string/encodeHtml"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var encodeHtml = function(str) {
                    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
                };
                __mod__[__id__] = encodeHtml;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/string/encodeHtml", (_M_["platform/string/encodeHtml"] = {}) && _M_);

_M_["platform/string/decodeHtml"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var decodeHtml = function(str) {
                    return String(str).replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&#39;/g, "'");
                };
                __mod__[__id__] = decodeHtml;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/string/decodeHtml", (_M_["platform/string/decodeHtml"] = {}) && _M_);

_M_["platform/string/pad"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var pad = function(number, length) {
                    var pre = "", string = number;
                    if (string.length < length) {
                        pre = new Array(length - string.length + 1).join("0");
                    }
                    return pre + string;
                };
                __mod__[__id__] = pad;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/string/pad", (_M_["platform/string/pad"] = {}) && _M_);

_M_["platform/string/getLength"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = function(str) {
                    if (typeof str == "undefined") {
                        return 0;
                    }
                    var aMatch = str.match(/[^\x00-\x80]/g);
                    return str.length + (!aMatch ? 0 : aMatch.length);
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/string/getLength", (_M_["platform/string/getLength"] = {}) && _M_);

_M_["platform/string/truncate"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var getLen = __mod__["platform/string/getLength"]();
                var truncate = function(str, len, suffix) {
                    if (typeof suffix == "undefined") suffix = "..";
                    if (getLen(str) <= len) {
                        return str;
                    }
                    var s = str.replace(/\*/g, " ").replace(/[^\x00-\xff]/g, "**");
                    str = str.slice(0, s.slice(0, len).replace(/\*\*/g, " ").replace(/\*/g, "").length);
                    str = str.slice(0, str.length - (suffix === "" ? 0 : 1)) + suffix;
                    return str;
                };
                __mod__[__id__] = truncate;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/string/truncate", (_M_["platform/string/truncate"] = {}) && _M_);

_M_["platform/string/divideNumber"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = function(n, p) {
                    n = n + "";
                    p = p || 3;
                    var tmp = Math.ceil(n.length / p);
                    var num = "";
                    var left;
                    for (var i = tmp; i > 0; i--) {
                        if (n.length - (i - 1) * p <= 0) left = 0; else left = n.length - (i - 1) * p;
                        num += "," + n.substring(left, n.length - i * p);
                    }
                    num = num.substring(1, num.length);
                    return num;
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/string/divideNumber", (_M_["platform/string/divideNumber"] = {}) && _M_);

_M_["platform/string/formatJSON"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var p = [], push = function(m) {
                    return "\\" + p.push(m) + "\\";
                }, pop = function(m, i) {
                    return p[i - 1];
                }, tabs = function(count) {
                    return new Array(count + 1).join("	");
                };
                var formatJSON = function(json) {
                    p = [];
                    var out = "", indent = 0;
                    json = json.replace(/\\./g, push).replace(/(".*?"|'.*?')/g, push).replace(/\s+/, "");
                    for (var i = 0; i < json.length; i++) {
                        var c = json.charAt(i);
                        switch (c) {
                          case "{":
                          case "[":
                            out += c + "\n" + tabs(++indent);
                            break;

                          case "}":
                          case "]":
                            out += "\n" + tabs(--indent) + c;
                            break;

                          case ",":
                            out += ",\n" + tabs(indent);
                            break;

                          case ":":
                            out += ": ";
                            break;

                          default:
                            out += c;
                            break;
                        }
                    }
                    out = out.replace(/\[[\d,\s]+?\]/g, function(m) {
                        return m.replace(/\s/g, "");
                    }).replace(/\\(\d+)\\/g, pop).replace(/\\(\d+)\\/g, pop);
                    return out;
                };
                __mod__[__id__] = formatJSON;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/string/formatJSON", (_M_["platform/string/formatJSON"] = {}) && _M_);

_M_["platform/string/format"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var formatRegExp = /%[sdj%]/g;
                __mod__[__id__] = function(f) {
                    if (typeof f !== "string") {
                        var objects = [];
                        for (var i = 0; i < arguments.length; i++) {
                            objects.push(inspect(arguments[i]));
                        }
                        return objects.join(" ");
                    }
                    var i = 1;
                    var args = arguments;
                    var len = args.length;
                    var str = String(f).replace(formatRegExp, function(x) {
                        if (i >= len) return x;
                        switch (x) {
                          case "%s":
                            return String(args[i++]);

                          case "%d":
                            return Number(args[i++]);

                          case "%j":
                            return JSON.stringify(args[i++]);

                          case "%%":
                            return "%";

                          default:
                            return x;
                        }
                    });
                    for (var x = args[i]; i < len; x = args[++i]) {
                        if (x === null || typeof x !== "object") {
                            str += " " + x;
                        } else {
                            str += " " + inspect(x);
                        }
                    }
                    return str;
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/string/format", (_M_["platform/string/format"] = {}) && _M_);

_M_["platform/array/getLen"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var getLen = function(o) {
                    return o.length;
                };
                __mod__[__id__] = getLen;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/array/getLen", (_M_["platform/array/getLen"] = {}) && _M_);

_M_["platform/array/isArray"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var isArray = Array.isArray || function(arg) {
                    return Object.prototype.toString.call(arg) == "[object Array]";
                };
                __mod__[__id__] = isArray;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/array/isArray", (_M_["platform/array/isArray"] = {}) && _M_);

_M_["platform/element/element"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _extend = __mod__["platform/object/extend"]();
                var _getLen = __mod__["platform/array/getLen"]();
                var _on = __mod__["platform/event/on"]();
                var _un = __mod__["platform/event/un"]();
                var _fire = __mod__["platform/event/fire"]();
                var _cee = __mod__["platform/event/customElementEvent"]();
                var _Class = __mod__["platform/class"]();
                var _parent = __mod__["platform/element/parent"]();
                var _children = __mod__["platform/element/children"]();
                var _first = __mod__["platform/element/first"]();
                var _last = __mod__["platform/element/last"]();
                var _prev = __mod__["platform/element/prev"]();
                var _next = __mod__["platform/element/next"]();
                var _down = __mod__["platform/element/down"]();
                var _contains = __mod__["platform/element/contains"]();
                var _hasClass = __mod__["platform/element/hasClass"]();
                var _addClass = __mod__["platform/element/addClass"]();
                var _removeClass = __mod__["platform/element/removeClass"]();
                var _html = __mod__["platform/element/html"]();
                var slice = Array.prototype.slice;
                var _css = __mod__["platform/element/css"]();
                var _attr = __mod__["platform/element/attr"]();
                var _removeAttr = __mod__["platform/element/removeAttr"]();
                var _value = __mod__["platform/element/value"]();
                var _left = __mod__["platform/element/left"]();
                var _top = __mod__["platform/element/top"]();
                var _setPosition = __mod__["platform/element/setPosition"]();
                var _getPosition = __mod__["platform/element/getPosition"]();
                var _width = __mod__["platform/element/width"]();
                var _height = __mod__["platform/element/height"]();
                var _delegate = __mod__["platform/element/delegate"]();
                var _undelegate = __mod__["platform/element/undelegate"]();
                var _append = __mod__["platform/element/append"]();
                var _remove = __mod__["platform/element/remove"]();
                var _insertBefore = __mod__["platform/element/insertBefore"]();
                var _show = __mod__["platform/element/show"]();
                var _hide = __mod__["platform/element/hide"]();
                var _disable = __mod__["platform/element/disable"]();
                var isArray = __mod__["platform/array/isArray"]();
                var _isInScreen = __mod__["platform/element/isInScreen"]();
                var _equal = __mod__["platform/element/equal"]();
                var _clone = __mod__["platform/element/clone"]();
                var _prefixes = __mod__["platform/element/prefixes"]();
                var getEleByFun = function(fun) {
                    var els = [];
                    var args = slice.call(arguments, 1);
                    var fullArgs;
                    for (var i = 0; i < this.length; i++) {
                        fullArgs = [ this[i] ].concat(args);
                        els = els.concat(fun.apply(this, fullArgs));
                    }
                    if (els.length) {
                        return new Element(els);
                    } else {
                        return null;
                    }
                };
                var getNotNullEleByFun = function(fun) {
                    var els = [];
                    var args = slice.call(arguments, 1);
                    var fullArgs;
                    for (var i = 0; i < this.length; i++) {
                        fullArgs = [ this[i] ].concat(args);
                        var elem = fun.apply(this, fullArgs);
                        if (!elem) {
                            return null;
                        }
                        els = els.concat(elem);
                    }
                    if (els.length) {
                        return new Element(els);
                    } else {
                        return null;
                    }
                };
                var getResByFun = function(fun) {
                    var args = slice.call(arguments, 1);
                    var res = this.map(function(item) {
                        return fun.apply(this, [ item ].concat(args));
                    });
                    if (res.length == 1) {
                        return res[0];
                    }
                    return res;
                };
                var Element = _Class("Element", {
                    construct: function(els) {
                        if (!isArray(els)) {
                            els = [ els ];
                        }
                        this._els = els;
                        this.length = 0;
                        this.eUid = ++Element.uuid;
                        Array.prototype.push.apply(this, els);
                        return this;
                    },
                    statics: {
                        uuid: 0,
                        isElement: function(el) {
                            if (el && el.length && el.eUid) {
                                return true;
                            }
                            return false;
                        },
                        create: function(options) {
                            var elem = document.createElement(options.tagName);
                            return new Element(elem);
                        }
                    },
                    methods: {
                        getLen: function() {
                            return _getLen(this);
                        },
                        on: function(type, listener) {
                            if (_cee[type]) {
                                this.forEach(function(item) {
                                    _cee[type].on(item, listener);
                                });
                            } else {
                                getResByFun.call(this, _on, type, listener);
                            }
                            return this;
                        },
                        un: function(type, listener) {
                            if (_cee[type]) {
                                this.forEach(function(item) {
                                    _cee[type].un(item, listener);
                                });
                            } else {
                                getResByFun.call(this, _un, type, listener);
                            }
                            return this;
                        },
                        fire: function(type, data) {
                            getResByFun.call(this, _fire, type, data);
                            return this;
                        },
                        children: function() {
                            return getEleByFun.call(this, _children);
                        },
                        parent: function(tagName) {
                            return getNotNullEleByFun.call(this, _parent, tagName);
                        },
                        down: function(selector) {
                            return getEleByFun.call(this, _down, selector);
                        },
                        first: function() {
                            return getEleByFun.call(this, _first);
                        },
                        last: function() {
                            return getEleByFun.call(this, _last);
                        },
                        prev: function() {
                            return getEleByFun.call(this, _prev);
                        },
                        next: function() {
                            return getEleByFun.call(this, _next);
                        },
                        contains: function(el) {
                            if (Element.isElement(el)) {
                                el = el[0];
                            }
                            return getResByFun.call(this, _contains, el);
                        },
                        hasClass: function(selector) {
                            return getResByFun.call(this, _hasClass, selector);
                        },
                        addClass: function(selector) {
                            getResByFun.call(this, _addClass, selector);
                            return this;
                        },
                        removeClass: function(selector) {
                            getResByFun.call(this, _removeClass, selector);
                            return this;
                        },
                        html: function(pos, html) {
                            var args = slice.call(arguments, 0);
                            if (arguments.length === 0) {
                                return _html.apply(this, [ this._els ].concat(args));
                            }
                            _html.apply(this, [ this._els ].concat(args));
                            return this;
                        },
                        css: function(key, value) {
                            if (arguments.length === 1) {
                                return getResByFun.call(this, _css, key);
                            } else {
                                getResByFun.call(this, _css, key, value);
                                return this;
                            }
                        },
                        attr: function(key, value) {
                            if (arguments.length === 1) {
                                return getResByFun.call(this, _attr, key);
                            } else {
                                getResByFun.call(this, _attr, key, value);
                                return this;
                            }
                        },
                        removeAttr: function(key) {
                            getResByFun.call(this, _removeAttr, key);
                            return this;
                        },
                        value: function(value) {
                            if (arguments.length === 0) {
                                return getResByFun.call(this, _value);
                            } else {
                                getResByFun.call(this, _value, value);
                                return this;
                            }
                        },
                        left: function(offsetParent) {
                            if (offsetParent && Element.isElement(offsetParent)) {
                                offsetParent = offsetParent[0];
                            }
                            return getResByFun.call(this, _left, offsetParent);
                        },
                        top: function(offsetParent) {
                            if (offsetParent && Element.isElement(offsetParent)) {
                                offsetParent = offsetParent[0];
                            }
                            return getResByFun.call(this, _top, offsetParent);
                        },
                        setPosition: function(position) {
                            getResByFun.call(this, _setPosition, position);
                            return this;
                        },
                        getPosition: function(position) {
                            return getResByFun.call(this, _getPosition);
                        },
                        width: function() {
                            return getResByFun.call(this, _width);
                        },
                        height: function() {
                            return getResByFun.call(this, _height);
                        },
                        delegate: function(delegate, callback, evt) {
                            getResByFun.call(this, _delegate, delegate, callback, evt);
                            return this;
                        },
                        undelegate: function(delegate, callback, evt) {
                            getResByFun.call(this, _undelegate, delegate, callback, evt);
                            return this;
                        },
                        append: function(child) {
                            if (Element.isElement(child)) {
                                child = child[0];
                            }
                            _append(this._els[0], child);
                            return this;
                        },
                        remove: function(child) {
                            if (Element.isElement(child)) {
                                child = child[0];
                            }
                            _remove(this._els[0], child);
                            return this;
                        },
                        insertBefore: function(child, refer) {
                            if (Element.isElement(child)) {
                                child = child[0];
                            }
                            if (Element.isElement(refer)) {
                                refer = refer[0];
                            }
                            _insertBefore(this._els[0], child, refer);
                            return this;
                        },
                        show: function() {
                            getResByFun.call(this, _show);
                            return this;
                        },
                        hide: function() {
                            getResByFun.call(this, _hide);
                            return this;
                        },
                        disable: function(flag) {
                            if (arguments.length === 0) {
                                return getResByFun.call(this, _disable);
                            } else {
                                getResByFun.call(this, _disable, flag);
                                return this;
                            }
                        },
                        isInScreen: function() {
                            return getResByFun.call(this, _isInScreen);
                        },
                        equal: function(elem) {
                            if (Element.isElement(elem)) {
                                elem = elem[0];
                            }
                            return _equal(this._els[0], elem);
                        },
                        indexOf: function() {
                            return Array.prototype.indexOf.apply(this, arguments);
                        },
                        lastIndexOf: function() {
                            return Array.prototype.lastIndexOf.apply(this, arguments);
                        },
                        filter: function() {
                            return Array.prototype.filter.apply(this, arguments);
                        },
                        map: function() {
                            return Array.prototype.map.apply(this, arguments);
                        },
                        forEach: function() {
                            return Array.prototype.forEach.apply(this, arguments);
                        },
                        some: function() {
                            return Array.prototype.some.apply(this, arguments);
                        },
                        every: function() {
                            return Array.prototype.every.apply(this, arguments);
                        },
                        slice: function() {
                            return Array.prototype.slice.apply(this, arguments);
                        },
                        splice: function() {
                            return Array.prototype.splice.apply(this, arguments);
                        },
                        reduceRight: function() {
                            return Array.prototype.reduceRight.apply(this, arguments);
                        },
                        reduce: function() {
                            return Array.prototype.reduce.apply(this, arguments);
                        },
                        clone: function(deep) {
                            return getResByFun.call(this, _clone, deep);
                        },
                        prefixes: function(props) {
                            return _prefixes(this, props);
                        }
                    }
                });
                __mod__[__id__] = Element;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/element", (_M_["platform/element/element"] = {}) && _M_);

_M_["platform/object/extend"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var extend = function(target, source, fn) {
                    fn = fn || function() {
                        return true;
                    };
                    for (var p in source) {
                        if (source.hasOwnProperty(p) && fn(target[p], source[p])) {
                            target[p] = source[p];
                        }
                    }
                    return target;
                };
                __mod__[__id__] = extend;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/object/extend", (_M_["platform/object/extend"] = {}) && _M_);

_M_["platform/event/on"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _listeners = __mod__["platform/event/lists"]();
                var _ua = __mod__["platform/browser/ua"]();
                var lists = _listeners.domListeners;
                var on = function(element, type, listener) {
                    type = type.replace(/^on/i, "");
                    type = type.replace("mousewheel", _ua.ff ? "DOMMouseScroll" : "mousewheel");
                    var realListener = function(ev) {
                        listener.call(element, ev);
                    }, realType = type;
                    if (element.addEventListener) {
                        element.addEventListener(realType, realListener, false);
                    } else if (element.attachEvent) {
                        element.attachEvent("on" + realType, realListener);
                    }
                    lists[lists.length] = [ element, type, listener, realListener, realType ];
                    return element;
                };
                __mod__[__id__] = on;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/on", (_M_["platform/event/on"] = {}) && _M_);

_M_["platform/event/lists"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var dom = [];
                var custom = {};
                var listeners = {
                    domListeners: dom,
                    customListeners: custom
                };
                __mod__[__id__] = listeners;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/lists", (_M_["platform/event/lists"] = {}) && _M_);

_M_["platform/browser/ua"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _s = {};
                var _ua = navigator.userAgent.toLowerCase();
                var _plug = navigator.plugins;
                var trident = _ua.match(/trident/), iPad = !trident && _ua.match(/(ipad).*os\s([\d_]+)/), iPhone = !trident && !iPad && _ua.match(/(iphone\sos)\s([\d_]+)/), android = _ua.match(/(Android)\s+([\d.]+)/);
                _s.IE11 = /rv\:11/.test(_ua);
                _s.IE = /msie/.test(_ua) || _s.IE11;
                _s.OPERA = /opera/.test(_ua);
                _s.MOZ = /gecko/.test(_ua);
                _s.IE6 = /msie 6/.test(_ua);
                _s.IE7 = /msie 7/.test(_ua);
                _s.IE8 = /msie 8/.test(_ua);
                _s.IE9 = /msie 9/.test(_ua);
                _s.IE10 = /msie 10/.test(_ua);
                _s.EDGE = /edge/.test(_ua);
                _s.SAFARI = /safari/.test(_ua) && !/chrome/.test(_ua);
                _s.mobileSafari = (/iPhone/i.test(navigator.platform) || /iPod/i.test(navigator.platform) || /iPad/i.test(navigator.userAgent)) && !!navigator.appVersion.match(/(?:Version\/)([\w\._]+)/);
                _s.WEBKIT = /webkit/.test(_ua);
                _s.CHROME = /chrome/.test(_ua);
                _s.iPhone = /iphone os/.test(_ua) && !trident;
                _s.iPod = /iPod/i.test(_ua) && !trident;
                _s.android = /android/.test(_ua);
                _s.iPhone4 = /iphone os [45]_/.test(_ua) && !trident;
                _s.iPad = /ipad/.test(_ua) && !trident;
                _s.WP = /windows phone/.test(_ua);
                _s.baidu = /baidu/.test(_ua);
                _s.mbaidu = /baidu/.test(_ua);
                _s.m360 = /360/.test(_ua);
                _s.muc = /uc/.test(_ua);
                _s.mqq = /qq/.test(_ua);
                if (android) {
                    _s.version = android[2];
                }
                if (iPhone) {
                    _s.ios = true;
                    _s.version = iPhone[2].replace(/_/g, ".");
                }
                if (iPad) {
                    _s.ios = true;
                    _s.version = iPad[2].replace(/_/g, ".");
                }
                if (_s.iPod) {
                    _s.ios = true;
                }
                _s.lePad = /lepad_hls/.test(_ua);
                _s.Mac = /macintosh/.test(_ua);
                _s.TT = /tencenttraveler/.test(_ua);
                _s.$360 = /360se/.test(_ua);
                _s.ff = /firefox/.test(_ua);
                _s.uc = /uc/.test(_ua);
                _s.Maxthon = false;
                try {
                    _s.html5Video = !!document.createElement("video").play;
                } catch (e) {
                    _s.html5Video = false;
                }
                try {
                    var t = window.external;
                    _s.Maxthon = t.max_version ? true : false;
                } catch (e) {}
                __mod__[__id__] = _s;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/browser/ua", (_M_["platform/browser/ua"] = {}) && _M_);

_M_["platform/event/un"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _listeners = __mod__["platform/event/lists"]();
                var _ua = __mod__["platform/browser/ua"]();
                var lists = _listeners.domListeners;
                var un = function(element, type, listener) {
                    type = type.replace(/^on/i, "");
                    type = type.replace("mousewheel", _ua.ff ? "DOMMouseScroll" : "mousewheel");
                    var len = lists.length, isRemoveAll = !listener, item, realType, realListener;
                    while (len--) {
                        item = lists[len];
                        if (item[1] === type && item[0] === element && (isRemoveAll || item[2] === listener)) {
                            realType = item[4];
                            realListener = item[3];
                            if (element.removeEventListener) {
                                element.removeEventListener(realType, realListener, false);
                            } else if (element.detachEvent) {
                                element.detachEvent("on" + realType, realListener);
                            }
                            lists.splice(len, 1);
                        }
                    }
                    return element;
                };
                __mod__[__id__] = un;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/un", (_M_["platform/event/un"] = {}) && _M_);

_M_["platform/event/fire"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var create = __mod__["platform/event/create"]();
                var fire = function(element, type, data) {
                    var ev = create(type, data);
                    if (element.dispatchEvent) return element.dispatchEvent(ev); else if (element.fireEvent) return element.fireEvent("on" + type, ev);
                };
                __mod__[__id__] = fire;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/fire", (_M_["platform/event/fire"] = {}) && _M_);

_M_["platform/event/create"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var stopPropagation = __mod__["platform/event/stopPropagation"]();
                var preventDefault = __mod__["platform/event/preventDefault"]();
                var create = function(type, opts) {
                    var evnt;
                    if (document.createEvent) evnt = document.createEvent("HTMLEvents"), evnt.initEvent(type, true, true); else if (document.createEventObject) evnt = document.createEventObject(), 
                    evnt.type = type;
                    var extraData = {};
                    if (opts) for (var name in opts) try {
                        evnt[name] = opts[name];
                    } catch (e) {
                        if (!evnt.extraData) evnt.extraData = extraData;
                        extraData[name] = opts[name];
                    }
                    return evnt;
                };
                __mod__[__id__] = create;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/create", (_M_["platform/event/create"] = {}) && _M_);

_M_["platform/event/stopPropagation"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var stopPropagation = function(event) {
                    if (event.stopPropagation) {
                        event.stopPropagation();
                    } else {
                        event.cancelBubble = true;
                    }
                    return event;
                };
                __mod__[__id__] = stopPropagation;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/stopPropagation", (_M_["platform/event/stopPropagation"] = {}) && _M_);

_M_["platform/event/preventDefault"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var preventDefault = function(event) {
                    if (event.preventDefault) {
                        event.preventDefault();
                    } else {
                        event.returnValue = false;
                    }
                    return event;
                };
                __mod__[__id__] = preventDefault;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/preventDefault", (_M_["platform/event/preventDefault"] = {}) && _M_);

_M_["platform/event/customElementEvent"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var fingerMove = __mod__["platform/event/fingerMove"]();
                var fingerSlide = __mod__["platform/event/fingerSlide"]();
                var mouseenter = __mod__["platform/event/mouseenter"]();
                var mouseleave = __mod__["platform/event/mouseleave"]();
                var transitionEnd = __mod__["platform/event/transitionEnd"]();
                var inclick = __mod__["platform/event/inclick"]();
                var listenersTypeList = {
                    fingermove: fingerMove,
                    fingerslide: fingerSlide,
                    mouseenter: mouseenter,
                    mouseleave: mouseleave,
                    transitionend: transitionEnd,
                    inclick: inclick
                };
                __mod__[__id__] = listenersTypeList;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/customElementEvent", (_M_["platform/event/customElementEvent"] = {}) && _M_);

_M_["platform/event/fingerMove"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _on = __mod__["platform/event/on"]();
                var _un = __mod__["platform/event/un"]();
                var get = __mod__["platform/event/get"]();
                var fingerMove = {
                    lists: [],
                    on: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l];
                        while (l--) {
                            if (this.lists[l].listener == listener) {
                                return this;
                            }
                        }
                        var startX = null, startY = null, moveX = null, moveY = null;
                        var touchstart = function(e) {
                            startX = e.touches[0].pageX;
                            startY = e.touches[0].pageY;
                        };
                        var touchmove = function(e) {
                            get(e).stop();
                            var endX = e.touches[0].pageX;
                            var endY = e.touches[0].pageY;
                            moveX = moveX == null ? startX : moveX;
                            moveY = moveY == null ? startY : moveY;
                            var disX = endX - moveX;
                            var disY = endY - moveY;
                            listener({
                                type: "fingermove",
                                event: e,
                                data: {
                                    x: disX,
                                    y: disY,
                                    pageX: endX,
                                    pageY: endY
                                }
                            });
                            moveX = endX;
                            moveY = endY;
                        };
                        var touchend = function(e) {
                            startX = null;
                            startY = null;
                            moveX = null;
                            moveY = null;
                        };
                        _on(element, "touchstart", touchstart);
                        _on(element, "touchmove", touchmove);
                        _on(element, "touchend", touchend);
                        this.lists.push({
                            listener: listener,
                            touchstart: touchstart,
                            touchmove: touchmove,
                            touchend: touchend
                        });
                        return this;
                    },
                    un: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l];
                        while (l--) {
                            if (this.lists[l].listener == listener) {
                                _un(element, "touchstart", this.lists[l].touchstart);
                                _un(element, "touchmove", this.lists[l].touchmove);
                                _un(element, "touchend", this.lists[l].touchend);
                                this.lists.splice(l, 1);
                            }
                        }
                        return this;
                    }
                };
                __mod__[__id__] = fingerMove;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/fingerMove", (_M_["platform/event/fingerMove"] = {}) && _M_);

_M_["platform/event/get"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var EventArg = __mod__["platform/event/eventArg"]();
                var get = function(event, win) {
                    return new EventArg(event, win);
                };
                __mod__[__id__] = get;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/get", (_M_["platform/event/get"] = {}) && _M_);

_M_["platform/event/eventArg"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var stopPropagation = __mod__["platform/event/stopPropagation"]();
                var preventDefault = __mod__["platform/event/preventDefault"]();
                var stop = __mod__["platform/event/stop"]();
                var extend = __mod__["platform/object/extend"]();
                var EventArg = function(event, win) {
                    win = win || window;
                    event = event || win.event;
                    var doc = win.document;
                    var target = event.target || event.srcElement || win;
                    var fromElement = event.fromElement;
                    while (target && target.nodeType == 3) {
                        target = target.parentNode;
                    }
                    this.target = target;
                    if (!event.relatedTarget && fromElement) {
                        this.relatedTarget = fromElement === event.target ? event.toElement : fromElement;
                    }
                    this.keyCode = event.which || event.keyCode;
                    for (var k in event) {
                        var item = event[k];
                        if ("function" != typeof item) {
                            this[k] = item;
                        }
                    }
                    if (event.type == "mousewheel" || event.type == "DOMMouseScroll") {
                        this.wheelDelta = event.wheelDelta || -event.detail * 40;
                    }
                    if (!this.pageX && this.pageX !== 0) {
                        this.pageX = (event.clientX || 0) + (doc.documentElement.scrollLeft || doc.body.scrollLeft);
                        this.pageY = (event.clientY || 0) + (doc.documentElement.scrollTop || doc.body.scrollTop);
                    }
                    this.timeStamp = event && event.timeStamp || +new Date();
                    this._event = event;
                };
                extend(EventArg.prototype, {
                    preventDefault: function() {
                        preventDefault(this._event);
                        return this;
                    },
                    stopPropagation: function() {
                        stopPropagation(this._event);
                        return this;
                    },
                    stop: function() {
                        stop(this._event);
                        return this;
                    }
                });
                __mod__[__id__] = EventArg;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/eventArg", (_M_["platform/event/eventArg"] = {}) && _M_);

_M_["platform/event/stop"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var stopPropagation = __mod__["platform/event/stopPropagation"]();
                var preventDefault = __mod__["platform/event/preventDefault"]();
                var stop = function(event) {
                    stopPropagation(event);
                    preventDefault(event);
                };
                __mod__[__id__] = stop;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/stop", (_M_["platform/event/stop"] = {}) && _M_);

_M_["platform/event/fingerSlide"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _on = __mod__["platform/event/on"]();
                var _un = __mod__["platform/event/un"]();
                var get = __mod__["platform/event/get"]();
                var fingerSlide = {
                    lists: [],
                    on: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l];
                        while (l--) {
                            if (this.lists[l].listener == listener) {
                                return this;
                            }
                        }
                        var startX = null, startY = null, timeStamp = null;
                        var touchstart = function(e) {
                            startX = e.touches[0].pageX;
                            startY = e.touches[0].pageY;
                        };
                        var touchend = function(e) {
                            get(e).stop();
                            var distanceX = e.changedTouches[0].pageX - startX;
                            var distanceY = e.changedTouches[0].pageY - startY;
                            var time = e.timeStamp - timeStamp;
                            listener({
                                type: "fingerslide",
                                event: e,
                                data: {
                                    x: distanceX,
                                    y: distanceY,
                                    time: time
                                }
                            });
                            startX = null;
                            startY = null;
                            timeStamp = null;
                        };
                        _on(element, "touchstart", touchstart);
                        _on(element, "touchend", touchend);
                        this.lists.push({
                            listener: listener,
                            touchstart: touchstart,
                            touchend: touchend
                        });
                        return this;
                    },
                    un: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l];
                        while (l--) {
                            if (this.lists[l].listener == listener) {
                                _un(element, "touchstart", this.lists[l].touchstart);
                                _un(element, "touchend", this.lists[l].touchend);
                                this.lists.splice(l, 1);
                            }
                        }
                        return this;
                    }
                };
                __mod__[__id__] = fingerSlide;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/fingerSlide", (_M_["platform/event/fingerSlide"] = {}) && _M_);

_M_["platform/event/mouseenter"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _on = __mod__["platform/event/on"]();
                var _un = __mod__["platform/event/un"]();
                var _ua = __mod__["platform/browser/ua"]();
                var _contains = __mod__["platform/element/contains"]();
                var hasNative = _ua.IE || "onmouseenter" in window;
                var mouseenter = {
                    lists: [],
                    on: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l], mouseover;
                        while (l--) {
                            if (this.lists[l].listener == listener && this.lists[l].element == element) {
                                return this;
                            }
                        }
                        if (hasNative) {
                            _on(element, "mouseenter", listener);
                        } else {
                            mouseover = function(e) {
                                var related = e.relatedTarget, current = this, flag;
                                if (related == null) {
                                    flag = true;
                                } else if (!related) {
                                    flag = false;
                                } else {
                                    flag = related != current && !_contains(current, related);
                                }
                                if (flag) {
                                    listener.apply(this, arguments);
                                }
                            };
                            _on(element, "mouseover", mouseover);
                        }
                        this.lists.push({
                            listener: listener,
                            mouseover: mouseover,
                            element: element
                        });
                        return this;
                    },
                    un: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l];
                        while (l--) {
                            if (this.lists[l].listener == listener && this.lists[l].element == element) {
                                if (hasNative) {
                                    _un(element, "mouseenter", listener);
                                } else {
                                    _un(element, "mouseover", this.lists[l].mouseover);
                                }
                                this.lists.splice(l, 1);
                            }
                        }
                        return this;
                    }
                };
                __mod__[__id__] = mouseenter;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/mouseenter", (_M_["platform/event/mouseenter"] = {}) && _M_);

_M_["platform/element/contains"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _sizzle = __mod__["jquery/cmd/sizzle"]();
                var contains = function(a, b) {
                    return _sizzle.contains(a, b);
                };
                __mod__[__id__] = contains;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/contains", (_M_["platform/element/contains"] = {}) && _M_);

_M_["platform/event/mouseleave"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _on = __mod__["platform/event/on"]();
                var _un = __mod__["platform/event/un"]();
                var _ua = __mod__["platform/browser/ua"]();
                var _contains = __mod__["platform/element/contains"]();
                var hasNative = _ua.IE || "onmouseenter" in window;
                var mouseleave = {
                    lists: [],
                    on: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l], mouseout;
                        while (l--) {
                            if (this.lists[l].listener == listener && this.lists[l].element == element) {
                                return this;
                            }
                        }
                        if (hasNative) {
                            _on(element, "mouseleave", listener);
                        } else {
                            mouseout = function(e) {
                                var related = e.relatedTarget, current = this, flag;
                                if (related == null) {
                                    flag = true;
                                } else if (!related) {
                                    flag = false;
                                } else {
                                    flag = related != current && !_contains(current, related);
                                }
                                if (flag) {
                                    listener.apply(this, arguments);
                                }
                            };
                            _on(element, "mouseout", mouseout);
                        }
                        this.lists.push({
                            listener: listener,
                            mouseout: mouseout,
                            element: element
                        });
                        return this;
                    },
                    un: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l];
                        while (l--) {
                            if (this.lists[l].listener == listener && this.lists[l].element == element) {
                                if (hasNative) {
                                    _un(element, "mouseleave", listener);
                                } else {
                                    _un(element, "mouseout", this.lists[l].mouseout);
                                }
                                this.lists.splice(l, 1);
                            }
                        }
                        return this;
                    }
                };
                __mod__[__id__] = mouseleave;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/mouseleave", (_M_["platform/event/mouseleave"] = {}) && _M_);

_M_["platform/event/transitionEnd"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _on = __mod__["platform/event/on"]();
                var _un = __mod__["platform/event/un"]();
                var ua = __mod__["platform/browser/ua"]();
                var mouseenter = {
                    lists: [],
                    on: function(element, listener) {
                        _on(element, this._getType(), listener);
                        return this;
                    },
                    un: function(element, listener) {
                        _un(element, this._getType(), listener);
                        return this;
                    },
                    _getType: function() {
                        var type = "transitionend";
                        if (ua.WEBKIT) {
                            type = "webkitTransitionEnd";
                        }
                        return type;
                    }
                };
                __mod__[__id__] = mouseenter;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/transitionEnd", (_M_["platform/event/transitionEnd"] = {}) && _M_);

_M_["platform/event/inclick"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _on = __mod__["platform/event/on"]();
                var _un = __mod__["platform/event/un"]();
                var get = __mod__["platform/event/get"]();
                var isTouchSupported = function() {
                    try {
                        document.createEvent("TouchEvent");
                        return true;
                    } catch (e) {
                        return false;
                    }
                }();
                var inclick = {
                    lists: [],
                    on: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l];
                        while (l--) {
                            if (this.lists[l].listener == listener && this.lists[l].element == element) {
                                return this;
                            }
                        }
                        var enabled = false, moved = false, prex = 0, prey = 0;
                        var touchstart = function(e) {
                            enabled = true;
                            moved = false;
                            prex = e.pageX || e.touches[0].pageX;
                            prey = e.pageY || e.touches[0].pageY;
                        };
                        var touchmove = function(e) {
                            if (!enabled) {
                                return;
                            }
                            var dx = (e.pageX || e.touches[0].pageX) - prex;
                            var dy = (e.pageY || e.touches[0].pageY) - prey;
                            if (dx * dx > 25 || dy * dy > 25) {
                                moved = true;
                            }
                        };
                        var touchend = function(e) {
                            if (!moved) {
                                listener({
                                    type: "inclick",
                                    data: {
                                        pageX: prex,
                                        pageY: prey
                                    },
                                    event: e
                                });
                            }
                            enabled = false;
                        };
                        _on(element, isTouchSupported ? "touchstart" : "mousedown", touchstart);
                        _on(element, isTouchSupported ? "touchmove" : "mousemove", touchmove);
                        _on(element, isTouchSupported ? "touchend" : "mouseup", touchend);
                        this.lists.push({
                            listener: listener,
                            element: element,
                            touchstart: touchstart,
                            touchmove: touchmove,
                            touchend: touchend
                        });
                        return this;
                    },
                    un: function(element, listener) {
                        var l = this.lists.length, item = this.lists[l];
                        while (l--) {
                            if (this.lists[l].listener == listener && this.lists[l].element == element) {
                                _un(element, isTouchSupported ? "touchstart" : "mousedown", this.lists[l].touchstart);
                                _un(element, isTouchSupported ? "touchmove" : "mousemove", this.lists[l].touchmove);
                                _un(element, isTouchSupported ? "touchend" : "mouseup", this.lists[l].touchend);
                                this.lists.splice(l, 1);
                            }
                        }
                        return this;
                    }
                };
                __mod__[__id__] = inclick;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/inclick", (_M_["platform/event/inclick"] = {}) && _M_);

_M_["platform/class"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _ns = __mod__["platform/lang/namespace"]();
                var _Object = __mod__["platform/baseobject"]();
                var Class = function(name, data) {
                    var ns = data.ns && data.ns + "." + name;
                    if (ns) {
                        try {
                            var exist = new Function("return " + ns)();
                            if (exist) return exist;
                        } catch (e) {}
                    }
                    var superclass = data.extend || _Object;
                    var superproto = function() {};
                    var plugins = data.plugins || [];
                    superproto.prototype = superclass.prototype;
                    var constructor = data.construct || function() {};
                    var properties = data.properties || {};
                    var methods = data.methods || {};
                    var statics = data.statics || {};
                    var proto = new superproto();
                    for (var key in proto) {
                        if (proto.hasOwnProperty(key)) {
                            delete proto[key];
                        }
                    }
                    for (var key in properties) {
                        proto[key] = properties[key];
                    }
                    for (var key in methods) {
                        proto[key] = methods[key];
                    }
                    for (var i = 0; i < plugins.length; i++) {
                        var plugin = plugins[i];
                        for (var key in plugin) {
                            proto[key] = plugin[key];
                        }
                    }
                    proto.constructor = constructor;
                    proto.superclass = superclass;
                    proto.superinstance = new superproto();
                    proto.__NAME__ = name;
                    constructor.prototype = proto;
                    for (var key in statics) {
                        constructor[key] = statics[key];
                    }
                    if (ns) {
                        _ns(ns, constructor);
                    }
                    return constructor;
                };
                __mod__[__id__] = Class;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/class", (_M_["platform/class"] = {}) && _M_);

_M_["platform/lang/namespace"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var namespace = function(name, module, owner) {
                    var packages = name.split("."), len = packages.length - 1, packageName, i = 0;
                    if (!owner) {
                        try {
                            if (!new RegExp("^[a-zA-Z_$][a-zA-Z0-9_$]*$").test(packages[0])) {
                                throw "";
                            }
                            owner = new Function("return " + packages[0])();
                            i = 1;
                        } catch (e) {
                            owner = global;
                        }
                    }
                    for (;i < len; i++) {
                        packageName = packages[i];
                        if (!owner[packageName]) {
                            owner[packageName] = {};
                        }
                        owner = owner[packageName];
                    }
                    if (!owner[packages[len]]) {
                        owner[packages[len]] = module;
                    }
                };
                __mod__[__id__] = namespace;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/lang/namespace", (_M_["platform/lang/namespace"] = {}) && _M_);

_M_["platform/baseobject"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _Object = function() {};
                var proto = new Object();
                proto.superclass = Object;
                proto.__NAME__ = "Object";
                proto.superinstance = new Object();
                var extend = function(target, source) {
                    for (var p in source) {
                        if (source.hasOwnProperty(p)) {
                            target[p] = source[p];
                        }
                    }
                    return target;
                };
                proto.callsuper = function(methodName) {
                    var _this = this;
                    if (!this._realsuper) {
                        this._realsuper = this.superclass;
                    } else {
                        this._realsuper = this._realsuper.prototype.superclass;
                    }
                    if (typeof methodName == "string") {
                        var args = Array.prototype.slice.call(arguments, 1);
                        _this._realsuper.prototype[methodName].apply(_this, args);
                    } else {
                        var args = Array.prototype.slice.call(arguments, 0);
                        _this._realsuper.apply(_this, args);
                    }
                    this._realsuper = null;
                };
                _Object.prototype = proto;
                __mod__[__id__] = _Object;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/baseobject", (_M_["platform/baseobject"] = {}) && _M_);

_M_["platform/element/parent"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var parent = function(el, tagName) {
                    var parent = el.parentElement || el.parentNode || null;
                    while (tagName && parent && parent.tagName && parent.tagName.toUpperCase() != tagName.toUpperCase()) {
                        parent = parent.parentElement || parent.parentNode;
                    }
                    return parent;
                };
                __mod__[__id__] = parent;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/parent", (_M_["platform/element/parent"] = {}) && _M_);

_M_["platform/element/children"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var children = function(el) {
                    for (var children = [], tmpEl = el.firstChild; tmpEl; tmpEl = tmpEl.nextSibling) {
                        if (tmpEl.nodeType == 1) {
                            children.push(tmpEl);
                        }
                    }
                    return children;
                };
                __mod__[__id__] = children;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/children", (_M_["platform/element/children"] = {}) && _M_);

_M_["platform/element/first"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _sibling = __mod__["platform/element/sibling"]();
                var first = function(el) {
                    return _sibling(el, "nextSibling", "firstChild");
                };
                __mod__[__id__] = first;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/first", (_M_["platform/element/first"] = {}) && _M_);

_M_["platform/element/sibling"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var sibling = function(el, direction, start) {
                    for (var node = el[start]; node; node = node[direction]) {
                        if (node.nodeType == 1) {
                            return node;
                        }
                    }
                    return null;
                };
                __mod__[__id__] = sibling;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/sibling", (_M_["platform/element/sibling"] = {}) && _M_);

_M_["platform/element/last"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _sibling = __mod__["platform/element/sibling"]();
                var last = function(el) {
                    return _sibling(el, "previousSibling", "lastChild");
                };
                __mod__[__id__] = last;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/last", (_M_["platform/element/last"] = {}) && _M_);

_M_["platform/element/prev"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _sibling = __mod__["platform/element/sibling"]();
                var prev = function(el) {
                    return _sibling(el, "previousSibling", "previousSibling");
                };
                __mod__[__id__] = prev;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/prev", (_M_["platform/element/prev"] = {}) && _M_);

_M_["platform/element/next"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _sibling = __mod__["platform/element/sibling"]();
                var next = function(el) {
                    return _sibling(el, "nextSibling", "nextSibling");
                };
                __mod__[__id__] = next;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/next", (_M_["platform/element/next"] = {}) && _M_);

_M_["platform/element/down"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _sizzle = __mod__["jquery/cmd/sizzle"]();
                var down = function(context, selector) {
                    var res = _sizzle(selector, context);
                    if (!res) {
                        return null;
                    }
                    return res;
                };
                __mod__[__id__] = down;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/down", (_M_["platform/element/down"] = {}) && _M_);

_M_["platform/element/hasClass"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var hasClass = function(el, selector) {
                    var className = " " + selector + " ";
                    if (el.nodeType === 1 && (" " + el.className + " ").replace(/[\n\t\r]/g, " ").indexOf(className) > -1) {
                        return true;
                    }
                    return false;
                };
                __mod__[__id__] = hasClass;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/hasClass", (_M_["platform/element/hasClass"] = {}) && _M_);

_M_["platform/element/addClass"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var addClass = function(el, value) {
                    var classNames, i, l, setClass;
                    if (value && typeof value === "string") {
                        classNames = value.split(/\s+/);
                        if (el.nodeType === 1) {
                            if (!el.className && classNames.length === 1) {
                                el.className = value;
                            } else {
                                setClass = " " + el.className + " ";
                                for (i = 0, l = classNames.length; i < l; i++) {
                                    if (!~setClass.indexOf(" " + classNames[i] + " ")) {
                                        setClass += classNames[i] + " ";
                                    }
                                }
                                el.className = setClass.trim();
                            }
                        }
                    }
                };
                __mod__[__id__] = addClass;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/addClass", (_M_["platform/element/addClass"] = {}) && _M_);

_M_["platform/element/removeClass"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var removeClass = function(el, value) {
                    var classNames, className, i, l;
                    if (value && typeof value === "string" || value === undefined) {
                        classNames = (value || "").split(/\s+/);
                        if (el.nodeType === 1 && el.className) {
                            if (value) {
                                className = (" " + el.className + " ").replace(/[\n\t\r]/g, " ");
                                for (i = 0, l = classNames.length; i < l; i++) {
                                    className = className.replace(" " + classNames[i] + " ", " ");
                                }
                                el.className = className.trim();
                            } else {
                                el.className = "";
                            }
                        }
                    }
                };
                __mod__[__id__] = removeClass;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/removeClass", (_M_["platform/element/removeClass"] = {}) && _M_);

_M_["platform/element/html"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _html = function(el, pos, html) {
                    if (arguments.length == 1) {
                        return el.innerHTML;
                    }
                    if (arguments.length == 2) {
                        el.innerHTML = arguments[1];
                        return el;
                    }
                    var range, begin;
                    if (el.insertAdjacentHTML) {
                        el.insertAdjacentHTML(pos, html);
                    } else {
                        range = el.ownerDocument.createRange();
                        pos = pos.toUpperCase();
                        if (pos == "AFTERBEGIN" || pos == "BEFOREEND") {
                            range.selectNodeContents(element);
                            range.collapse(pos == "AFTERBEGIN");
                        } else {
                            begin = pos == "BEFOREBEGIN";
                            range[begin ? "setStartBefore" : "setEndAfter"](el);
                            range.collapse(begin);
                        }
                        range.insertNode(range.createContextualFragment(html));
                    }
                    return el;
                };
                var html = function(els, pos, html) {
                    var arr = [];
                    var slice = Array.prototype.slice;
                    args = slice.call(arguments, 1);
                    els.forEach(function(el) {
                        arr.push(_html.apply(this, [ el ].concat(args)));
                    });
                    return arr.length == 1 ? arr[0] : arr;
                };
                __mod__[__id__] = html;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/html", (_M_["platform/element/html"] = {}) && _M_);

_M_["platform/element/css"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var useOpacity = typeof document.createElement("div").style.opacity != "undefined";
                function hyphenate(name) {
                    return name.replace(/[A-Z]/g, function(match) {
                        return "-" + match.toLowerCase();
                    });
                }
                var css = function(el, key, value) {
                    var style;
                    var otherKey;
                    if (arguments.length == 2) {
                        if (global.getComputedStyle) {
                            try {
                                return global.getComputedStyle(el, null).getPropertyValue(hyphenate(key));
                            } catch (e) {
                                return "";
                            }
                        }
                        if (document.defaultView && document.defaultView.getComputedStyle) {
                            var computedStyle = document.defaultView.getComputedStyle(el, null);
                            if (computedStyle) return computedStyle.getPropertyValue(hyphenate(key));
                            if (key == "display") return "none";
                        }
                        if (!useOpacity && key == "opacity") {
                            key = "filter";
                            otherKey = "opacity";
                        }
                        if (el.currentStyle) {
                            style = el.currentStyle[key];
                        } else {
                            style = el.style[key];
                        }
                        if (!useOpacity && otherKey == "opacity") {
                            if (style && style.toLowerCase().indexOf("opacity=") >= 0) {
                                style = parseFloat(style.toLowerCase().match(/opacity=([^)]*)/)[1]) / 100;
                            } else {
                                style = 1;
                            }
                        }
                        return style;
                    } else if (arguments.length == 3) {
                        if (!useOpacity && key == "opacity") {
                            key = "filter";
                            value = "Alpha(Opacity=" + value * 100 + ");";
                        }
                        el.style[key] = value;
                    }
                };
                __mod__[__id__] = css;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/css", (_M_["platform/element/css"] = {}) && _M_);

_M_["platform/element/attr"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var attr = function(element, key, value) {
                    if (arguments.length == 2) {
                        if (element.getAttribute) {
                            var v = element.getAttribute(key);
                            if (typeof v === "number") {
                                v += "";
                            }
                            return v || element[key] || undefined;
                        }
                    } else if (arguments.length == 3) {
                        element.setAttribute(key, value);
                    }
                };
                __mod__[__id__] = attr;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/attr", (_M_["platform/element/attr"] = {}) && _M_);

_M_["platform/element/removeAttr"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var removeAttr = function(element, key) {
                    element.removeAttribute(key);
                };
                __mod__[__id__] = removeAttr;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/removeAttr", (_M_["platform/element/removeAttr"] = {}) && _M_);

_M_["platform/element/value"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var value = function(element, value) {
                    if (arguments.length == 1) {
                        return element.value;
                    } else if (arguments.length == 2) {
                        element.value = value;
                    }
                };
                __mod__[__id__] = value;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/value", (_M_["platform/element/value"] = {}) && _M_);

_M_["platform/element/left"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var getPosition = __mod__["platform/element/getPosition"]();
                var left = function(el, offsetParent) {
                    if (offsetParent) {
                        return getPosition(el).left - getPosition(offsetParent).left;
                    }
                    return getPosition(el).left;
                };
                __mod__[__id__] = left;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/left", (_M_["platform/element/left"] = {}) && _M_);

_M_["platform/element/getPosition"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var getPosition = function(el) {
                    try {
                        var box = el.getBoundingClientRect();
                    } catch (e) {
                        return {};
                    }
                    var doc = el.ownerDocument;
                    var body = doc.body;
                    var html = doc.documentElement;
                    var clientTop = html.clientTop || body.clientTop || 0;
                    var clientLeft = html.clientLeft || body.clientLeft || 0;
                    var top = box.top + (window.pageYOffset || html.scrollTop || body.scrollTop) - clientTop;
                    var left = box.left + (window.pageXOffset || html.scrollLeft || body.scrollLeft) - clientLeft;
                    return {
                        top: top,
                        left: left
                    };
                };
                __mod__[__id__] = getPosition;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/getPosition", (_M_["platform/element/getPosition"] = {}) && _M_);

_M_["platform/element/top"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var getPosition = __mod__["platform/element/getPosition"]();
                var top = function(el, offsetParent) {
                    if (offsetParent) {
                        return getPosition(el).top - getPosition(offsetParent).top;
                    }
                    return getPosition(el).top;
                };
                __mod__[__id__] = top;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/top", (_M_["platform/element/top"] = {}) && _M_);

_M_["platform/element/setPosition"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var css = __mod__["platform/element/css"]();
                var setPosition = function(element, position) {
                    var left = css(element, "marginLeft");
                    var top = css(element, "marginTop");
                    css(element, "left", left ? position.left - parseFloat(left) + "px" : 0);
                    css(element, "top", top ? position.top - parseFloat(top) + "px" : 0);
                    return element;
                };
                __mod__[__id__] = setPosition;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/setPosition", (_M_["platform/element/setPosition"] = {}) && _M_);

_M_["platform/element/width"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var width = function(element) {
                    return element.offsetWidth;
                };
                __mod__[__id__] = width;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/width", (_M_["platform/element/width"] = {}) && _M_);

_M_["platform/element/height"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var height = function(element) {
                    return element.offsetHeight;
                };
                __mod__[__id__] = height;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/height", (_M_["platform/element/height"] = {}) && _M_);

_M_["platform/element/delegate"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var on = __mod__["platform/event/on"]();
                var delegateList = __mod__["platform/element/delegateList"]();
                var attr = __mod__["platform/element/attr"]();
                var getDlgElement = function(ele) {
                    if (!ele) {
                        return null;
                    }
                    return ele.getAttribute && (!!attr(ele, "data-qiyi-delegate") || !!attr(ele, "data-delegate") || !!attr(ele, "j-delegate") || !!attr(ele, "j-dlg")) ? ele : getDlgElement(ele.parentNode);
                };
                var delegate = function(element, delegate, callback, evt, that) {
                    if (!delegate) {
                        return;
                    }
                    callback = callback || function() {};
                    evt = evt || "click";
                    var fn = function(e) {
                        e = global.event || e;
                        var target = e.target || e.srcElement;
                        target = getDlgElement(target);
                        if (target) {
                            var attribute = attr(target, "data-qiyi-delegate") || attr(target, "data-delegate") || attr(target, "j-delegate") || attr(target, "j-dlg");
                            if (attribute && attribute == delegate) {
                                callback.call(that, {
                                    target: target,
                                    event: e
                                });
                                return;
                            }
                        }
                    };
                    delegateList.push([ callback, fn ]);
                    on(element, evt, fn);
                };
                __mod__[__id__] = delegate;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/delegate", (_M_["platform/element/delegate"] = {}) && _M_);

_M_["platform/element/delegateList"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = [];
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/delegateList", (_M_["platform/element/delegateList"] = {}) && _M_);

_M_["platform/element/undelegate"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var un = __mod__["platform/event/un"]();
                var delegateList = __mod__["platform/element/delegateList"]();
                var undelegate = function(element, delegate, callback, evt) {
                    if (!delegate) {
                        return;
                    }
                    var fn = null;
                    evt = evt || "click";
                    var list = delegateList, len = list.length;
                    for (var i = 0; i < len; i++) {
                        if (list[i][0] === callback) {
                            fn = list[i][1];
                        }
                    }
                    if (!fn) {
                        return;
                    }
                    un(element, evt, fn);
                };
                __mod__[__id__] = undelegate;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/undelegate", (_M_["platform/element/undelegate"] = {}) && _M_);

_M_["platform/element/append"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var append = function(el, child) {
                    el.appendChild(child);
                };
                __mod__[__id__] = append;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/append", (_M_["platform/element/append"] = {}) && _M_);

_M_["platform/element/remove"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var remove = function(el, child) {
                    el.removeChild(child);
                };
                __mod__[__id__] = remove;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/remove", (_M_["platform/element/remove"] = {}) && _M_);

_M_["platform/element/insertBefore"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var insertBefore = function(el, child, refer) {
                    el.insertBefore(child, refer);
                };
                __mod__[__id__] = insertBefore;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/insertBefore", (_M_["platform/element/insertBefore"] = {}) && _M_);

_M_["platform/element/show"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var show = function(element) {
                    element.style.display = element.getAttribute("data-private-display") || "block";
                };
                __mod__[__id__] = show;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/show", (_M_["platform/element/show"] = {}) && _M_);

_M_["platform/element/hide"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var hide = function(element) {
                    var display = element.style.display || "";
                    if (display != "none") element.setAttribute("data-private-display", display);
                    element.style.display = "none";
                };
                __mod__[__id__] = hide;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/hide", (_M_["platform/element/hide"] = {}) && _M_);

_M_["platform/element/disable"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var disable = function(elem, flag) {
                    if (arguments.length == 1) {
                        return elem.disabled;
                    } else if (arguments.length == 2) {
                        elem.disabled = flag;
                    }
                };
                __mod__[__id__] = disable;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/disable", (_M_["platform/element/disable"] = {}) && _M_);

_M_["platform/element/isInScreen"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _top = __mod__["platform/element/top"]();
                var _left = __mod__["platform/element/left"]();
                var _width = __mod__["platform/element/width"]();
                var _height = __mod__["platform/element/height"]();
                var _viewHeight = __mod__["platform/page/getViewHeight"]();
                var _viewWidth = __mod__["platform/page/getViewWidth"]();
                var _scrollTop = __mod__["platform/page/getScrollTop"]();
                var _scrollLeft = __mod__["platform/page/getScrollLeft"]();
                var isInScreen = function(elem) {
                    var top = _top(elem);
                    var left = _left(elem);
                    var width = _width(elem);
                    var height = _height(elem);
                    var bottom = top + height;
                    var right = left + width;
                    var centerX = left + width / 2;
                    var centerY = top + height / 2;
                    var viewTop = _scrollTop();
                    var viewLeft = _scrollLeft();
                    var viewRight = viewLeft + _viewWidth();
                    var viewBottom = viewTop + _viewHeight();
                    if (!width && !height) {
                        return false;
                    }
                    if (top >= viewTop && top <= viewBottom && left >= viewLeft && left <= viewRight) {
                        return true;
                    }
                    if (top >= viewTop && top <= viewBottom && right >= viewLeft && right <= viewRight) {
                        return true;
                    }
                    if (bottom >= viewTop && bottom <= viewBottom && left >= viewLeft && left <= viewRight) {
                        return true;
                    }
                    if (bottom >= viewTop && bottom <= viewBottom && right >= viewLeft && right <= viewRight) {
                        return true;
                    }
                    if (centerY >= viewTop && centerY <= viewBottom && centerX >= viewLeft && centerX <= viewRight) {
                        return true;
                    }
                    return false;
                };
                __mod__[__id__] = isInScreen;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/isInScreen", (_M_["platform/element/isInScreen"] = {}) && _M_);

_M_["platform/page/getViewHeight"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var getViewHeight = function(str) {
                    var doc = document, client = doc.compatMode == "BackCompat" ? doc.body : doc.documentElement;
                    return window.innerHeight || client.clientHeight;
                };
                __mod__[__id__] = getViewHeight;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/page/getViewHeight", (_M_["platform/page/getViewHeight"] = {}) && _M_);

_M_["platform/page/getViewWidth"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var getViewWidth = function(str) {
                    var doc = document, client = doc.compatMode == "BackCompat" ? doc.body : doc.documentElement;
                    return window.innerWidth || client.clientWidth;
                };
                __mod__[__id__] = getViewWidth;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/page/getViewWidth", (_M_["platform/page/getViewWidth"] = {}) && _M_);

_M_["platform/page/getScrollTop"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var getScrollTop = function() {
                    var context = global;
                    var doc = context.document;
                    var de = doc.documentElement;
                    return context.pageYOffset || de && de.scrollTop || doc.body.scrollTop;
                };
                __mod__[__id__] = getScrollTop;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/page/getScrollTop", (_M_["platform/page/getScrollTop"] = {}) && _M_);

_M_["platform/page/getScrollLeft"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var getScrollLeft = function() {
                    var context = global;
                    var doc = context.document;
                    var de = doc.documentElement;
                    return context.pageXOffset || de && de.scrollLeft || doc.body.scrollLeft;
                };
                __mod__[__id__] = getScrollLeft;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/page/getScrollLeft", (_M_["platform/page/getScrollLeft"] = {}) && _M_);

_M_["platform/element/equal"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var equal = function(el, elToBeCompared) {
                    return el == elToBeCompared;
                };
                __mod__[__id__] = equal;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/equal", (_M_["platform/element/equal"] = {}) && _M_);

_M_["platform/element/clone"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var clone = function(el, deep) {
                    return el.cloneNode(deep);
                };
                __mod__[__id__] = clone;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/clone", (_M_["platform/element/clone"] = {}) && _M_);

_M_["platform/element/prefixes"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var testBrowser = {
                    browserVendors: [ "", "-webkit-", "-moz-", "-ms-", "-o-", "-khtml-" ],
                    domPrefixes: [ "", "Webkit", "Moz", "ms", "O", "Khtml" ],
                    testDom: function(prop) {
                        var i = this.domPrefixes.length;
                        while (i--) {
                            if (document.body.style[this.domPrefixes[i] + prop] !== undefined) {
                                return true;
                            }
                        }
                        return false;
                    },
                    cssTransitions: function() {
                        if (window.Modernizr && Modernizr.csstransitions !== undefined) {
                            return Modernizr.csstransitions;
                        }
                        return this.testDom("Transition");
                    },
                    cssTransforms3d: function() {
                        if (window.Modernizr && Modernizr.csstransforms3d !== undefined) {
                            return Modernizr.csstransforms3d;
                        }
                        if (document.body.style["perspectiveProperty"] !== undefined) {
                            return true;
                        }
                        return this.testDom("Perspective");
                    }
                };
                var prefixes = function(el, props) {
                    var output = [];
                    for (var prop in props) {
                        if (props.hasOwnProperty(prop)) {
                            var i = testBrowser.browserVendors.length;
                            while (i--) {
                                output[testBrowser.browserVendors[i] + prop] = props[prop];
                                el.css(testBrowser.browserVendors[i] + prop, props[prop]);
                            }
                        }
                    }
                };
                __mod__[__id__] = prefixes;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/prefixes", (_M_["platform/element/prefixes"] = {}) && _M_);

_M_["platform/element/ready"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var ready = function() {
                    var readyBound = false, readyList = [], DOMContentLoaded;
                    if (document.addEventListener) {
                        DOMContentLoaded = function() {
                            document.removeEventListener("DOMContentLoaded", DOMContentLoaded, false);
                            ready();
                        };
                    } else if (document.attachEvent) {
                        DOMContentLoaded = function() {
                            if (document.readyState === "complete") {
                                document.detachEvent("onreadystatechange", DOMContentLoaded);
                                ready();
                            }
                        };
                    }
                    function ready() {
                        if (!ready.isReady) {
                            ready.isReady = true;
                            for (var i = 0, j = readyList.length; i < j; i++) {
                                readyList[i]();
                            }
                        }
                    }
                    function doScrollCheck() {
                        try {
                            document.documentElement.doScroll("left");
                        } catch (e) {
                            setTimeout(doScrollCheck, 1);
                            return;
                        }
                        ready();
                    }
                    function bindReady() {
                        if (readyBound) {
                            return;
                        }
                        readyBound = true;
                        if (document.readyState === "complete") {
                            ready.isReady = true;
                        } else {
                            if (document.addEventListener) {
                                document.addEventListener("DOMContentLoaded", DOMContentLoaded, false);
                                window.addEventListener("load", ready, false);
                            } else if (document.attachEvent) {
                                document.attachEvent("onreadystatechange", DOMContentLoaded);
                                window.attachEvent("onload", ready);
                                var toplevel = false;
                                try {
                                    toplevel = window.frameElement == null;
                                } catch (e) {}
                                if (document.documentElement.doScroll && toplevel) {
                                    doScrollCheck();
                                }
                            }
                        }
                    }
                    bindReady();
                    return function(callback) {
                        ready.isReady ? callback() : readyList.push(callback);
                    };
                }();
                ready.isReady = false;
                __mod__[__id__] = ready;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/element/ready", (_M_["platform/element/ready"] = {}) && _M_);

_M_["platform/page/getWidth"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var getWidth = function() {
                    var context = global;
                    var doc = context.document;
                    var body = doc.body;
                    var html = doc.documentElement;
                    var client = doc.compatMode == "BackCompat" ? body : doc.documentElement;
                    return Math.max(html.scrollWidth, body.scrollWidth, client.clientWidth);
                };
                __mod__[__id__] = getWidth;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/page/getWidth", (_M_["platform/page/getWidth"] = {}) && _M_);

_M_["platform/page/getHeight"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var getHeight = function() {
                    var context = global;
                    var doc = context.document;
                    var body = doc.body;
                    var html = doc.documentElement;
                    var client = doc.compatMode == "BackCompat" ? body : doc.documentElement;
                    return Math.max(html.scrollHeight, body.scrollHeight, client.clientHeight);
                };
                __mod__[__id__] = getHeight;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/page/getHeight", (_M_["platform/page/getHeight"] = {}) && _M_);

_M_["platform/event/customEvent"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var Class = __mod__["platform/class"]();
                var ceon = __mod__["platform/event/ceon"]();
                var ceun = __mod__["platform/event/ceun"]();
                var cefire = __mod__["platform/event/cefire"]();
                var CustomEvent = Class("CustomEvent", {
                    methods: {
                        filter: function(list) {
                            this.filters = list;
                        },
                        on: function(type, listener) {
                            ceon(this, type, listener);
                        },
                        un: function(type, listener) {
                            ceun(this, type, listener);
                        },
                        fire: function(param) {
                            cefire(this, param);
                        }
                    }
                });
                __mod__[__id__] = new CustomEvent();
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/customEvent", (_M_["platform/event/customEvent"] = {}) && _M_);

_M_["platform/event/ceon"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _listeners = __mod__["platform/event/lists"]();
                var lists = _listeners.customListeners;
                var ceon = function(element, type, listener) {
                    type = type.replace(/^on/i, "");
                    var realListener = function(ev) {
                        listener(ev);
                    };
                    type = type.toLowerCase();
                    lists[type] = lists[type] || [];
                    lists[type].push({
                        type: type,
                        listener: listener,
                        realListener: realListener
                    });
                    return element;
                };
                __mod__[__id__] = ceon;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/ceon", (_M_["platform/event/ceon"] = {}) && _M_);

_M_["platform/event/ceun"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _listeners = __mod__["platform/event/lists"]();
                var lists = _listeners.customListeners;
                var ceun = function(element, type, listener) {
                    type = type.replace(/^on/i, "").toLowerCase();
                    var listeners = lists[type];
                    if (listeners) {
                        var len = listeners.length, isRemoveAll = !listener;
                        if (listeners && listeners.length > 0) {
                            if (isRemoveAll == true) {
                                lists[type] = [];
                            } else {
                                listeners.forEach(function(obj, index) {
                                    if (obj.listener === listener) {
                                        listeners.splice(index, 1);
                                    }
                                });
                            }
                        }
                        return element;
                    }
                };
                __mod__[__id__] = ceun;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/ceun", (_M_["platform/event/ceun"] = {}) && _M_);

_M_["platform/event/cefire"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _listeners = __mod__["platform/event/lists"]();
                var lists = _listeners.customListeners;
                var cefire = function(element, ev) {
                    var type = ev.type.replace(/^on/i, "").toLowerCase();
                    if (element.filters && element.filters.indexOf(type) == -1) {
                        return element;
                    }
                    var data = ev.data;
                    var listeners = lists[type];
                    if (listeners && listeners.length > 0) {
                        listeners.forEach(function(obj, index) {
                            try {
                                obj.listener({
                                    type: type,
                                    data: data
                                });
                            } catch (e) {}
                        });
                    }
                    return element;
                };
                __mod__[__id__] = cefire;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/event/cefire", (_M_["platform/event/cefire"] = {}) && _M_);

_M_["platform/fn/abstractMethod"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var abstractMethod = function() {
                    throw "not implemented";
                };
                __mod__[__id__] = abstractMethod;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/fn/abstractMethod", (_M_["platform/fn/abstractMethod"] = {}) && _M_);

_M_["platform/fn/emptyMethod"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var emptyMethod = function() {};
                __mod__[__id__] = emptyMethod;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/fn/emptyMethod", (_M_["platform/fn/emptyMethod"] = {}) && _M_);

_M_["platform/lang/isSameDomain"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _parse = __mod__["platform/url/parse"]();
                var isSameDomain = function(surl, durl) {
                    if (surl.charAt(0) == "/" || durl.charAt(0) == "/") {
                        return true;
                    }
                    var sobj = _parse(surl);
                    var dobj = _parse(durl);
                    if (sobj == null || dobj == null) {
                        return true;
                    }
                    return dobj.host == sobj.host && dobj.protocol == sobj.protocol && dobj.port == sobj.port;
                };
                __mod__[__id__] = isSameDomain;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/lang/isSameDomain", (_M_["platform/lang/isSameDomain"] = {}) && _M_);

_M_["platform/url/parse"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var parse = function(url) {
                    var reHost = /((\w+):)?\/\/([^\/:]+):?(\d*)((?:\/|$)[^?#]*)/;
                    var parts = url.match(reHost);
                    var currentPageProtocol = window.location.protocol.slice(0, -1);
                    if (parts) {
                        var protocol = parts[2] || currentPageProtocol;
                        var host = parts[3];
                        var port = parts[4];
                        var path = parts[5];
                        return {
                            protocol: protocol,
                            host: host,
                            port: port,
                            path: path
                        };
                    }
                    return null;
                };
                __mod__[__id__] = parse;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/url/parse", (_M_["platform/url/parse"] = {}) && _M_);

_M_["platform/object/isObject"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var isObject = function(arg) {
                    return Object.prototype.toString.call(arg) == "[object Object]";
                };
                __mod__[__id__] = isObject;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/object/isObject", (_M_["platform/object/isObject"] = {}) && _M_);

_M_["platform/object/isEmpty"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var isEmpty = function(obj) {
                    for (var key in obj) {
                        return false;
                    }
                    return true;
                };
                __mod__[__id__] = isEmpty;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/object/isEmpty", (_M_["platform/object/isEmpty"] = {}) && _M_);

_M_["platform/object/forEach"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var forEach = function(source, iterator) {
                    var returnValue, key, item;
                    if ("function" == typeof iterator) {
                        for (key in source) {
                            if (source.hasOwnProperty(key)) {
                                item = source[key];
                                returnValue = iterator.call(source, item, key);
                                if (returnValue === false) {
                                    break;
                                }
                            }
                        }
                    }
                    return source;
                };
                __mod__[__id__] = forEach;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/object/forEach", (_M_["platform/object/forEach"] = {}) && _M_);

_M_["platform/object/like"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var like = function(target, source) {
                    for (var p in source) {
                        if (p in target && target[p] != source[p]) {
                            return false;
                        }
                    }
                    return true;
                };
                __mod__[__id__] = like;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/object/like", (_M_["platform/object/like"] = {}) && _M_);

_M_["platform/url/escapeSymbol"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var escapeSymbol = function(source) {
                    return String(source).replace(/[#%&+=\/\\\ \u3000\f\r\n\t]/g, function(all) {
                        return "%" + (256 + all.charCodeAt()).toString(16).substring(1).toUpperCase();
                    });
                };
                __mod__[__id__] = escapeSymbol;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/url/escapeSymbol", (_M_["platform/url/escapeSymbol"] = {}) && _M_);

_M_["platform/url/getQueryValue"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _escapeReg = __mod__["platform/string/escapeReg"]();
                var getQueryValue = function(url, key) {
                    var reg = new RegExp("(^|&|\\?|#)" + _escapeReg(key) + "=([^&#]*)(&|$|#)", "");
                    var match = url.match(reg);
                    if (match) {
                        return match[2];
                    }
                    return "";
                };
                __mod__[__id__] = getQueryValue;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/url/getQueryValue", (_M_["platform/url/getQueryValue"] = {}) && _M_);

_M_["platform/string/escapeReg"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var escapeReg = function(str) {
                    return String(str).replace(new RegExp("([.*+?^=!:${}()|[\\]/\\\\])", "g"), "\\$1");
                };
                __mod__[__id__] = escapeReg;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/string/escapeReg", (_M_["platform/string/escapeReg"] = {}) && _M_);

_M_["platform/url/jsonToQuery"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _isArray = __mod__["platform/array/isArray"]();
                var _forEach = __mod__["platform/object/forEach"]();
                var _escapeSymbol = __mod__["platform/url/escapeSymbol"]();
                var jsonToQuery = function(json, replacer_opt) {
                    var result = [], itemLen, replacer = replacer_opt || function(value) {
                        return _escapeSymbol(value);
                    };
                    _forEach(json, function(item, key) {
                        if (_isArray(item)) {
                            itemLen = item.length;
                            while (itemLen--) {
                                result.push(key + "=" + replacer(item[itemLen], key));
                            }
                        } else {
                            result.push(key + "=" + replacer(item, key));
                        }
                    });
                    return result.join("&");
                };
                __mod__[__id__] = jsonToQuery;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/url/jsonToQuery", (_M_["platform/url/jsonToQuery"] = {}) && _M_);

_M_["platform/url/queryToJson"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _isArray = __mod__["platform/array/isArray"]();
                var queryToJson = function(url) {
                    var query = url.substr(url.lastIndexOf("?") + 1), params = query.split("&"), len = params.length, result = {}, i = 0, key, value, item, param;
                    for (;i < len; i++) {
                        if (!params[i]) {
                            continue;
                        }
                        param = params[i].split("=");
                        key = param.shift();
                        value = param.join("=");
                        item = result[key];
                        if ("undefined" == typeof item) {
                            result[key] = value;
                        } else if (_isArray(item)) {
                            item.push(value);
                        } else {
                            result[key] = [ item, value ];
                        }
                    }
                    return result;
                };
                __mod__[__id__] = queryToJson;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/url/queryToJson", (_M_["platform/url/queryToJson"] = {}) && _M_);

_M_["platform/url/isUrl"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var isUrl = function(url) {
                    var reHost = /^\w+:\/\/[^\/:]+(?::\d{1,5}\/?|\/|$).*$/;
                    return reHost.test(url);
                };
                __mod__[__id__] = isUrl;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/url/isUrl", (_M_["platform/url/isUrl"] = {}) && _M_);

_M_["platform/url/deleteProtocol"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var deleteProtocol = function(url) {
                    var protocol = /^(http:)\/\//;
                    if (protocol.test(url)) {
                        url = url.replace(RegExp.$1, "");
                    }
                    return url;
                };
                __mod__[__id__] = deleteProtocol;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/url/deleteProtocol", (_M_["platform/url/deleteProtocol"] = {}) && _M_);

_M_["platform/http/request"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var request = __mod__["driver/http/request"]();
                __mod__[__id__] = request;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/http/request", (_M_["platform/http/request"] = {}) && _M_);

_M_["driver/http/request"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var ajax = __mod__["driver/http/ajax"]();
                var postmsg = __mod__["driver/http/postmsg"]();
                var jsload = __mod__["driver/http/jsload"]();
                var framework = __mod__["driver/http/framework"]();
                var ijax = __mod__["driver/http/ijax"]();
                var isSameDomain = __mod__["platform/lang/isSameDomain"]();
                var request = function(url, options) {
                    if (options.dataType === "jsonp") {
                        return framework.request(url, options);
                    }
                    if (options.data || options.jsonp) {
                        if (options.data.varname || options.data.cb || options.jsonp) {
                            return jsload.request(url, options);
                        }
                    }
                    if (options.cors || isSameDomain(url, document.location.href)) {
                        if (window.XMLHttpRequest) {
                            var xhr = new XMLHttpRequest();
                            var flag = !("withCredentials" in xhr) && url.indexOf("cache.m.iqiyi.com") !== -1;
                            if (flag) {
                                if (!isSameDomain(url, document.location.href)) {
                                    return postmsg.request(url, options);
                                }
                            }
                        }
                        return ajax.request(url, options);
                    }
                    if (options.ifr) {
                        return ijax.request(url, options);
                    }
                };
                __mod__[__id__] = request;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/http/request", (_M_["driver/http/request"] = {}) && _M_);

_M_["driver/http/ajax"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _jsonToQuery = __mod__["platform/url/jsonToQuery"]();
                var InfoCenter = __mod__["platform/ic/infoCenter"]();
                var ic = new InfoCenter({
                    moduleName: "ajax"
                });
                var ajax = {
                    request: function(url, options) {
                        options = options || {};
                        var data = options.data || "", async = options.async !== false, username = options.username || "", password = options.password || "", method = (options.method || "GET").toUpperCase(), headers = options.headers || {}, timeout = options.timeout || 0, eventHandlers = {}, tick, key, xhr;
                        var withCredentials = options.withCredentials || false;
                        function stateChangeHandler() {
                            if (xhr.readyState == 4) {
                                var stat;
                                try {
                                    stat = xhr.status;
                                } catch (ex) {
                                    ic.error(ex);
                                    fire("failure");
                                    return;
                                }
                                fire(stat);
                                if (stat >= 200 && stat < 300 || stat == 304 || stat == 1223 || stat === 0) {
                                    if (stat === 0) {
                                        try {
                                            ic.error(url + " 本地响应成功, resp: " + xhr.responseText + ", withCredentials: " + xhr.withCredentials + ", onLine: " + navigator.onLine);
                                        } catch (e) {}
                                    }
                                    fire("success");
                                } else {
                                    ic.error(stat);
                                    fire("failure");
                                }
                                window.setTimeout(function() {
                                    if (xhr) {
                                        xhr.onreadystatechange = function() {};
                                    }
                                    if (async) {
                                        xhr = null;
                                    }
                                }, 0);
                            }
                        }
                        function getXHR() {
                            if (window.XMLHttpRequest) {
                                return new XMLHttpRequest();
                            }
                            if (window.ActiveXObject) {
                                try {
                                    return new window.ActiveXObject("Msxml2.XMLHTTP");
                                } catch (e) {
                                    try {
                                        return new window.ActiveXObject("Microsoft.XMLHTTP");
                                    } catch (e1) {}
                                }
                            }
                        }
                        function fire(type) {
                            type = "on" + type;
                            var handler = eventHandlers[type];
                            if (handler) {
                                if (tick) {
                                    window.clearTimeout(tick);
                                }
                                if (type !== "onsuccess") {
                                    handler(xhr);
                                } else {
                                    var resp;
                                    try {
                                        resp = xhr.responseText;
                                    } catch (error) {
                                        ic.error(error);
                                        return handler(xhr);
                                    }
                                    handler(xhr, xhr.responseText);
                                }
                                return true;
                            } else {
                                return false;
                            }
                        }
                        for (key in options) {
                            eventHandlers[key] = options[key];
                        }
                        try {
                            xhr = getXHR();
                            if (Object.prototype.toString.call(data) == "[object Object]") {
                                data = _jsonToQuery(data);
                            }
                            if (method == "GET") {
                                if (data) {
                                    url += (url.indexOf("?") >= 0 ? "&" : "?") + data;
                                    data = null;
                                }
                                if (options["noCache"]) {
                                    url += (url.indexOf("?") >= 0 ? "&" : "?") + "b" + +new Date() + "=1";
                                }
                            }
                            if (username) {
                                xhr.open(method, url, async, username, password);
                            } else {
                                xhr.open(method, url, async);
                            }
                            if (async) {
                                xhr.onreadystatechange = stateChangeHandler;
                            }
                            if (method == "POST") {
                                xhr.setRequestHeader("Content-Type", headers["Content-Type"] || "application/x-www-form-urlencoded");
                            }
                            for (key in headers) {
                                if (headers.hasOwnProperty(key)) {
                                    xhr.setRequestHeader(key, headers[key]);
                                }
                            }
                            if ("withCredentials" in xhr) {
                                xhr.withCredentials = withCredentials;
                            }
                            fire("beforerequest");
                            if (timeout) {
                                tick = setTimeout(function() {
                                    xhr.onreadystatechange = function() {};
                                    ic.error(url + " timeout");
                                    xhr.abort();
                                    if (!fire("timeout")) {
                                        fire("failure");
                                    }
                                }, timeout);
                            }
                            xhr.send(data);
                            if (!async) {
                                stateChangeHandler();
                            }
                        } catch (ex) {
                            ic.error(ex);
                            fire("failure");
                        }
                        return xhr;
                    }
                };
                __mod__[__id__] = ajax;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/http/ajax", (_M_["driver/http/ajax"] = {}) && _M_);

_M_["platform/ic/infoCenter"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var Class = __mod__["platform/class"]();
                var format = __mod__["platform/string/format"]();
                var extend = __mod__["platform/object/extend"]();
                var global = __mod__["driver/global"]();
                var formatDate = __mod__["platform/date/format"]();
                var storageEntity = {};
                var infoStorage = {
                    remove: function(key) {
                        delete storageEntity[key];
                    },
                    read: function(key) {
                        return storageEntity[key];
                    },
                    write: function(key, value) {
                        storageEntity[key] = value;
                    }
                };
                var infoStorageKey = "QInfo";
                var data = [];
                var max = 300;
                var modulesToSave = {};
                var keysToPrint = {
                    moduleName: "",
                    date: "",
                    message: "",
                    tpl: "",
                    level: ""
                };
                var toStr = function(data) {
                    var args = [ data.tpl, data.level, data.moduleName, formatDate(new Date(data.date * 1), "yyyy-MM-dd HH:mm:ss") ];
                    for (var i = 0; i < data.message.length; i++) {
                        args.push(data.message[i]);
                    }
                    var infoString = format.apply(null, args);
                    return infoString;
                };
                var output = {
                    log: function(data) {
                        if (global.console && console.log) {
                            console.log(toStr(data));
                        }
                    },
                    info: function(data) {
                        if (global.console && console.info) {
                            console.info(toStr(data));
                        }
                    },
                    debug: function(data) {
                        if (global.console && console.debug) {
                            console.debug(toStr(data));
                        }
                    },
                    warn: function(data) {
                        if (global.console && console.warn) {
                            console.warn(toStr(data));
                        }
                    },
                    error: function(data) {
                        if (global.console && console.error) {
                            console.error(toStr(data));
                        }
                    },
                    flush: function(data) {
                        this.log(toStr(data));
                    }
                };
                var InfoCenter = Class("InfoCenter", {
                    construct: function(options) {
                        options = options || {};
                        this._moduleName = options.moduleName || "Unknown";
                        this._tmpl = options.tmpl || "[%s][%s][%s] >>> %s";
                        var out = {};
                        extend(out, output);
                        extend(out, options.output || {});
                        this._output = out;
                    },
                    statics: {
                        toStr: toStr,
                        enable: function() {
                            global.enabled = true;
                        },
                        disable: function() {
                            global.enabled = false;
                        },
                        whatToSave: function(moduleNames) {
                            if (typeof moduleNames == "string") {
                                modulesToSave[moduleNames] = true;
                            } else if (moduleNames && moduleNames.length > 0) {
                                moduleNames.forEach(function(moduleName) {
                                    modulesToSave[moduleName] = true;
                                });
                            }
                        },
                        whatToPrint: function(keys) {
                            var map = {};
                            for (var key in keys) {
                                keysToPrint[key] = keys[key];
                            }
                        },
                        setStorage: function(storageInfo) {
                            if (storageInfo.key) {
                                infoStorageKey = storageInfo.key;
                            }
                            infoStorage = storageInfo.storage;
                            if (infoStorage.read(infoStorageKey)) {
                                data = JSON.parse(infoStorage.read(infoStorageKey));
                            } else {
                                data = [];
                            }
                        },
                        setOutput: function(obj) {
                            extend(output, obj || {});
                        },
                        flush: function(options) {
                            options = options || {};
                            options = extend({
                                output: function(datas) {
                                    if (global.console) {
                                        for (var i = 0; i < datas.length; i++) {
                                            datas[i] = toStr(datas[i]);
                                        }
                                        console.log(datas.join("\r\n"));
                                    }
                                }
                            }, options);
                            var filter = options.filter;
                            var flushData = JSON.parse(infoStorage.read(infoStorageKey));
                            if (filter) {
                                flushData = this._filter(filter);
                            }
                            options.output(flushData);
                        },
                        clear: function() {
                            data = [];
                            infoStorage.remove(infoStorageKey);
                            infoStorage.write(infoStorageKey, "[]");
                        },
                        _filter: function(filter) {
                            var level = filter.level;
                            var moduleName = filter.moduleName;
                            var iteration = filter.fn || function() {
                                return true;
                            };
                            var result = [];
                            data.forEach(function(info) {
                                if (level) {
                                    if (level.toUpperCase().indexOf(info.level.toUpperCase()) === -1) {
                                        return;
                                    }
                                }
                                if (moduleName) {
                                    if (moduleName.toUpperCase().indexOf(info.moduleName.toUpperCase()) === -1) {
                                        return;
                                    }
                                }
                                if (!iteration(info)) {
                                    return;
                                }
                                result.push(info);
                            });
                            return result;
                        }
                    },
                    methods: {
                        _formatInfo: function(arr, level) {
                            arr = Array.prototype.slice.call(arr);
                            var result = {};
                            for (var key in keysToPrint) {
                                result[key] = keysToPrint[key];
                            }
                            result.moduleName = this._moduleName;
                            result.date = new Date().getTime();
                            result.message = arr;
                            result.tpl = this._tmpl;
                            result.level = level;
                            return result;
                        },
                        log: function(str) {
                            var infos = this._formatInfo(arguments, "LOG");
                            this._writeLog(infos);
                            if (this._check()) {
                                this._output.log(infos);
                            }
                        },
                        debug: function(str) {
                            var infos = this._formatInfo(arguments, "DEBUG");
                            this._writeLog(infos);
                            if (this._check()) {
                                this._output.debug(infos);
                            }
                        },
                        info: function(str) {
                            var infos = this._formatInfo(arguments, "INFO");
                            this._writeLog(infos);
                            if (this._check()) {
                                this._output.info(infos);
                            }
                        },
                        warn: function(str) {
                            var infos = this._formatInfo(arguments, "WARN");
                            this._writeLog(infos);
                            if (this._check()) {
                                this._output.warn(infos);
                            }
                        },
                        error: function(str) {
                            var infos = this._formatInfo(arguments, "ERROR");
                            this._writeLog(infos);
                            if (this._check()) {
                                this._output.error(infos);
                            }
                        },
                        _writeLog: function(logObj) {
                            if (logObj && modulesToSave[logObj.moduleName]) {
                                if (data.length >= max) {
                                    data.splice(0, 1);
                                }
                                data.push(logObj);
                                this._save();
                            }
                        },
                        _save: function() {
                            infoStorage.remove(infoStorageKey);
                            infoStorage.write(infoStorageKey, JSON.stringify(data));
                        },
                        _check: function() {
                            return global.enabled;
                        }
                    }
                });
                __mod__[__id__] = InfoCenter;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/ic/infoCenter", (_M_["platform/ic/infoCenter"] = {}) && _M_);

_M_["platform/date/format"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var pad = __mod__["platform/number/pad"]();
                var format = function(date, pattern) {
                    if ("string" != typeof pattern) {
                        return date.toString();
                    }
                    function replacer(patternPart, result) {
                        pattern = pattern.replace(patternPart, result);
                    }
                    var year = date.getFullYear(), month = date.getMonth() + 1, date2 = date.getDate(), hours = date.getHours(), minutes = date.getMinutes(), seconds = date.getSeconds();
                    replacer(/yyyy/g, pad(year, 4));
                    replacer(/yy/g, pad(parseInt(year.toString().slice(2), 10), 2));
                    replacer(/MM/g, pad(month, 2));
                    replacer(/M/g, month);
                    replacer(/dd/g, pad(date2, 2));
                    replacer(/d/g, date2);
                    replacer(/HH/g, pad(hours, 2));
                    replacer(/H/g, hours);
                    replacer(/hh/g, pad(hours % 12, 2));
                    replacer(/h/g, hours % 12);
                    replacer(/mm/g, pad(minutes, 2));
                    replacer(/m/g, minutes);
                    replacer(/ss/g, pad(seconds, 2));
                    replacer(/s/g, seconds);
                    return pattern;
                };
                __mod__[__id__] = format;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/date/format", (_M_["platform/date/format"] = {}) && _M_);

_M_["platform/number/pad"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var pad = function(number, length) {
                    var pre = "", negative = number < 0, string = String(Math.abs(number));
                    if (string.length < length) {
                        pre = new Array(length - string.length + 1).join("0");
                    }
                    return (negative ? "-" : "") + pre + string;
                };
                __mod__[__id__] = pad;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/number/pad", (_M_["platform/number/pad"] = {}) && _M_);

_M_["driver/http/postmsg"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _jsonToQuery = __mod__["platform/url/jsonToQuery"]();
                var parse = __mod__["platform/url/parse"]();
                var InfoCenter = __mod__["platform/ic/infoCenter"]();
                var ic = new InfoCenter({
                    moduleName: "PostMessage"
                });
                var iframeList = {};
                var requestQ = {};
                var page = "postmessage.html";
                var handle = function(data) {
                    ic.log("onmessage key: " + data.key);
                    ic.log("onmessage data: " + JSON.stringify(data));
                    var opt = requestQ[data.key];
                    opt[data.type](data.xhr, data.obj);
                };
                if (window.addEventListener) {
                    window.addEventListener("message", function(event) {
                        if (event.origin.indexOf("qiyi.com") !== -1) {
                            try {
                                var data = JSON.parse(event.data);
                                handle(data);
                            } catch (e) {
                                ic.error("postmessage catch err: " + e);
                            }
                        }
                    });
                }
                __mod__[__id__] = {
                    request: function(url, options) {
                        var domain = "http://" + parse(url).host + "/";
                        var src = domain + page;
                        var key = new Date().getTime() + Math.random();
                        options.key = key;
                        ic.log("postMessage, url: " + url + ", key: " + key);
                        requestQ[key] = options;
                        var iframe;
                        if (!iframeList[domain]) {
                            iframe = document.createElement("iframe");
                            document.body.appendChild(iframe);
                            iframe.setAttribute("style", "display:none;");
                            iframe.setAttribute("src", src);
                            iframe.onload = function() {
                                iframe.contentWindow.postMessage(JSON.stringify({
                                    url: url,
                                    options: options
                                }), domain);
                                iframeList[domain] = iframe;
                            };
                        } else {
                            iframe = iframeList[domain];
                            iframe.contentWindow.postMessage(JSON.stringify({
                                url: url,
                                options: options
                            }), domain);
                        }
                    }
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/http/postmsg", (_M_["driver/http/postmsg"] = {}) && _M_);

_M_["driver/http/jsload"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var cache = {};
                var runingList = {};
                function objSort2url(obj, encodeFn) {
                    encodeFn = encodeFn || function(a) {
                        return a;
                    };
                    var i, k, arr = [], l;
                    for (i in obj) {
                        arr.push(i);
                    }
                    arr.sort();
                    l = arr.length;
                    for (i = 0; i < l; i++) {
                        arr[i] = [ arr[i], encodeFn(obj[arr[i]]) ].join("=");
                    }
                    return arr.join("&");
                }
                function parseParam(oSource, oParams) {
                    var key;
                    try {
                        if (typeof oParams != "undefined") {
                            for (key in oSource) {
                                if (oParams[key]) {
                                    oSource[key] = oParams[key];
                                }
                            }
                        }
                    } finally {
                        key = null;
                        return oSource;
                    }
                }
                function createScripts(oOpts, oCFG) {
                    var urls = oOpts.urls;
                    var js = document.createElement("script");
                    js.src = urls.url;
                    js.charset = urls.charset;
                    js.onload = js.onfailure = js.onreadystatechange = function() {
                        if (js && js.readyState && js.readyState != "loaded" && js.readyState != "complete") {
                            return;
                        }
                        oCFG.script_loaded_num++;
                        js.onload = js.onreadystatechange = js.onfailure = null;
                        js.src = "";
                        js.parentNode.removeChild(js);
                        js = null;
                    };
                    document.getElementsByTagName("head")[0].appendChild(js);
                }
                function processUrl(oOpts, oCFG) {
                    var urls = oOpts.urls;
                    var key, url_cls, varname, rnd;
                    var get_hash = oOpts.data;
                    var t;
                    url_cls = urls.url;
                    if (oOpts.jsonp) {
                        varname = oOpts.jsonp.varname;
                        t = objSort2url(get_hash, oOpts.encodeFn);
                        if (t) {
                            url_cls += "?" + t;
                        }
                    } else {
                        if ("varname" in get_hash) {
                            varname = get_hash["varname"];
                            for (key in get_hash) {
                                if (key == "varname") {
                                    continue;
                                }
                                url_cls += get_hash[key] + "/";
                            }
                            if (oOpts.spliter === "0") {
                                url_cls = url_cls.slice(0, -1);
                            }
                        }
                        if ("cb" in get_hash) {
                            varname = get_hash["cb"];
                            t = objSort2url(get_hash, oOpts.encodeFn);
                            if (t) {
                                url_cls += "?" + t;
                            }
                        }
                    }
                    urls.url = url_cls.toString();
                    if (varname) {
                        oCFG.script_var_arr.push(varname);
                    }
                    urls.charset = oOpts.charset || "utf-8";
                }
                function ancestor(aUrls, oOpts) {
                    var _opts = {
                        urls: [],
                        charset: "utf-8",
                        timeout: -1,
                        data: oOpts.data,
                        jsonp: null,
                        spliter: "1",
                        encodeFn: null,
                        memory: false,
                        onsuccess: function(data) {},
                        onfailure: function() {}
                    };
                    var _cfg = {
                        script_loaded_num: 0,
                        is_timeout: false,
                        is_loadcomplete: false,
                        script_var_arr: []
                    };
                    _opts.urls = typeof aUrls == "string" ? {
                        url: aUrls
                    } : aUrls;
                    parseParam(_opts, oOpts);
                    processUrl(_opts, _cfg);
                    if (_opts.memory) {
                        if (cache[_opts.urls.url] && _opts.onsuccess) {
                            _opts.onsuccess(null, cache[_opts.urls.url]);
                            return;
                        }
                        if (runingList[_opts.urls.url]) {
                            runingList[_opts.urls.url].push({
                                onsuccess: _opts.onsuccess || function() {},
                                onfailure: _opts.onfailure || function() {}
                            });
                            return;
                        } else {
                            runingList[_opts.urls.url] = [ {
                                onsuccess: _opts.onsuccess || function() {},
                                onfailure: _opts.onfailure || function() {}
                            } ];
                        }
                    }
                    createScripts(_opts, _cfg);
                    function getData() {
                        var result;
                        if (_opts.noreturn && !_opts.onComplete) {
                            return;
                        }
                        if (_cfg.is_timeout) {
                            return;
                        }
                        var i, data = [];
                        if (_cfg.script_loaded_num == 1) {
                            _cfg.is_loadcomplete = true;
                            for (i = 0; i < _cfg.script_var_arr.length; i++) {
                                var key = _cfg.script_var_arr[i].trim(), o;
                                if (key.indexOf(".") != -1) {
                                    o = eval(key);
                                } else {
                                    o = window[key];
                                }
                                data.push(o);
                            }
                            if (_cfg.script_var_arr.length < 2) {
                                if (typeof data[0] != "undefined" && (!data[0].code || data[0].code == "A00000")) {
                                    if (typeof data[0].data === "object") {
                                        result = typeof data[0].data == "undefined" ? JSON.stringify(data[0]) : JSON.stringify(data[0].data);
                                    } else {
                                        result = JSON.stringify(data[0]);
                                    }
                                    if (_opts.memory) {
                                        cache[_opts.urls.url] = result;
                                        while (runingList[_opts.urls.url].length) {
                                            try {
                                                runingList[_opts.urls.url].shift().onsuccess(null, result);
                                            } catch (e) {}
                                        }
                                        delete runingList[_opts.urls.url];
                                    } else {
                                        _opts.onsuccess(null, result);
                                    }
                                } else {
                                    if (_opts.memory) {
                                        while (runingList[_opts.urls.url].length) {
                                            try {
                                                runingList[_opts.urls.url].shift().onfailure(null, data[0]);
                                            } catch (e) {}
                                        }
                                        delete runingList[_opts.urls.url];
                                    } else {
                                        _opts.onfailure(null, data[0]);
                                    }
                                }
                            } else {
                                if (!data.code || data.code == "A00000") {
                                    result = typeof data.data == "undefined" ? JSON.stringify(data) : JSON.stringify(data.data);
                                    if (_opts.memory) {
                                        cache[_opts.urls.url] = result;
                                        while (runingList[_opts.urls.url].length) {
                                            try {
                                                runingList[_opts.urls.url].shift().onsuccess(null, result);
                                            } catch (e) {}
                                        }
                                        delete runingList[_opts.urls.url];
                                    } else {
                                        _opts.onsuccess(null, result);
                                    }
                                } else {
                                    if (_opts.memory) {
                                        while (runingList[_opts.urls.url].length) {
                                            try {
                                                runingList[_opts.urls.url].shift().onfailure(null, data);
                                            } catch (e) {}
                                        }
                                        delete runingList[_opts.urls.url];
                                    } else {
                                        _opts.onfailure(null, data);
                                    }
                                }
                            }
                            return;
                        }
                        setTimeout(getData, 50);
                    }
                    getData();
                    if (_opts.timeout > 0) {
                        setTimeout(function() {
                            if (!_cfg.is_loadcomplete) {
                                _cfg.is_timeout = true;
                                if (_opts.memory) {
                                    while (runingList[_opts.urls.url].length) {
                                        runingList[_opts.urls.url].shift().onfailure();
                                    }
                                    delete runingList[_opts.urls.url];
                                } else {
                                    _opts.onfailure();
                                }
                            }
                        }, _opts.timeout);
                    }
                }
                var jsload = {};
                jsload.request = function(aUrls, oOpts) {
                    new ancestor(aUrls, oOpts);
                };
                __mod__[__id__] = jsload;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/http/jsload", (_M_["driver/http/jsload"] = {}) && _M_);

_M_["driver/http/framework"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var cacheMapping = {};
                var runMapping = {};
                var jsonp = __mod__["driver/http/jsonp"]();
                var ajax = __mod__["driver/http/ajax"]();
                var jsload = __mod__["driver/http/jsload"]();
                var InfoCenter = __mod__["platform/ic/infoCenter"]();
                var ic = new InfoCenter({
                    moduleName: "framework"
                });
                var hander = {
                    jsload: jsload,
                    jsonp: jsonp,
                    ajax: ajax.request
                };
                var objSort2url = function(obj, encodeFn) {
                    encodeFn = encodeFn || window.encodeURIComponent;
                    var i, arr = [], l;
                    for (i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            arr.push(i);
                        }
                    }
                    arr.sort();
                    l = arr.length;
                    for (i = 0; i < l; i++) {
                        arr[i] = [ arr[i], encodeFn(obj[arr[i]]) ].join("=");
                    }
                    return arr.join("&");
                };
                var request = function(url, params) {
                    var dataType = params.dataType;
                    var data = Q.object.extend({}, params.data);
                    var memoryFlag = params.memory || false;
                    var urlKey = url + objSort2url(data);
                    var successCallback = params.onsuccess;
                    var errorCallback = params.onfailure;
                    if (successCallback) {
                        if (memoryFlag && cacheMapping[urlKey]) {
                            successCallback(null, cacheMapping[urlKey]);
                            return;
                        }
                        if (runMapping[urlKey] && runMapping[urlKey].length > 0) {
                            runMapping[urlKey].push({
                                onsuccess: successCallback || function() {},
                                onfailure: errorCallback || function() {}
                            });
                            return;
                        } else {
                            runMapping[urlKey] = [ {
                                onsuccess: successCallback || function() {},
                                onfailure: errorCallback || function() {}
                            } ];
                        }
                        params.onsuccess = function(data) {
                            if (memoryFlag) {
                                cacheMapping[urlKey] = data;
                            }
                            while (runMapping[urlKey].length) {
                                var callbackFun = runMapping[urlKey].shift();
                                try {
                                    if (!data || !data.code || data.code == "A00000") {
                                        callbackFun.onsuccess.call(window, null, data);
                                    } else {
                                        callbackFun.onfailure.call(window, null, data);
                                    }
                                } catch (e) {
                                    ic.log(e);
                                }
                            }
                        };
                        params.onfailure = function(data) {
                            while (runMapping[urlKey].length) {
                                var callbackFun = runMapping[urlKey].shift();
                                try {
                                    callbackFun.onfailure.call(window, null, data);
                                } catch (e) {
                                    ic.log(e);
                                }
                            }
                        };
                        hander[dataType](url, params);
                    }
                };
                __mod__[__id__] = {
                    request: request
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/http/framework", (_M_["driver/http/framework"] = {}) && _M_);

_M_["driver/http/jsonp"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var __callbacks__ = __mod__["platform/__callbacks__"]();
                var ns = "window.Q.__callbacks__.";
                var qMarkOrAmp = function(url) {
                    return RegExp("\\?").test(url) ? "&" : "?";
                };
                var _createScriptTag = function(url, charset) {
                    var scriptDom = document.createElement("SCRIPT");
                    scriptDom.setAttribute("type", "text/javascript");
                    if (charset) {
                        scriptDom.setAttribute("charset", charset);
                    }
                    scriptDom.setAttribute("src", url);
                    document.getElementsByTagName("head")[0].appendChild(scriptDom);
                    return scriptDom;
                };
                var _removeScriptTag = function(scriptDom) {
                    if (scriptDom.clearAttributes) {
                        scriptDom.clearAttributes();
                    }
                    if (scriptDom && scriptDom.parentNode) {
                        scriptDom.parentNode.removeChild(scriptDom);
                    }
                    scriptDom = null;
                };
                var jsonp = function(url, params) {
                    var timerId;
                    var scriptDom;
                    var jsonpUrl;
                    var data = Q.object.extend({}, params.data);
                    var timeout = params.timeout || 1e4;
                    var successCallback = params.onsuccess;
                    var errorCallback = params.onfailure;
                    var callbackNameValue = params.jsonpCallback || "cb" + Math.floor(Math.random() * 2147483648).toString(36);
                    var callbackName = params.jsonp || "callback";
                    var globalCallbacksStr = params.jsonp ? "" : ns;
                    var globalCallbacks;
                    if (params.jsonp) {
                        globalCallbacks = global;
                    } else {
                        globalCallbacks = __callbacks__;
                    }
                    if (successCallback) {
                        data[callbackName] = globalCallbacksStr + callbackNameValue;
                        globalCallbacks[callbackNameValue] = function(data) {
                            if (timerId) {
                                clearTimeout(timerId);
                            }
                            successCallback(data);
                            delete globalCallbacks[callbackNameValue];
                            _removeScriptTag(scriptDom);
                        };
                        jsonpUrl = url + qMarkOrAmp(url) + Q.url.jsonToQuery(data, window.encodeURIComponent);
                    }
                    scriptDom = _createScriptTag(jsonpUrl, params.charset);
                    timerId = setTimeout(function() {
                        _removeScriptTag(scriptDom);
                        errorCallback();
                    }, timeout);
                };
                __mod__[__id__] = jsonp;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/http/jsonp", (_M_["driver/http/jsonp"] = {}) && _M_);

_M_["driver/http/ijax"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = {
                    arrTaskLists: [],
                    createLoadingIframe: function() {
                        var _self = this;
                        if (this.loadFrames != null) {
                            return false;
                        }
                        var rndId = "loadingIframe_thread" + Math.ceil(Math.random() * 1e4);
                        this.loadFrames = rndId;
                        var html = [ '<iframe id="' + rndId + '" name="' + rndId + '" class="invisible"', ' scrolling="no" src=""', ' allowTransparency="true" style="display:none;" frameborder="0"', " ></iframe>" ].join("");
                        var oIjaxIframeCnt = document.createElement("div");
                        oIjaxIframeCnt.id = "ijax_iframes";
                        oIjaxIframeCnt.innerHTML = html;
                        document.body.appendChild(oIjaxIframeCnt);
                        if (document.getElementById(_self.loadFrames) != null) {
                            _self.loadingIframe = {
                                container: document.getElementById(_self.loadFrames),
                                isBusy: false
                            };
                            _self.loadByList();
                        }
                    },
                    isIjaxReady: function() {
                        if (typeof this.loadingIframe == "undefined") {
                            return false;
                        }
                        if (this.loadingIframe.isBusy === false) {
                            this.loadingIframe.isBusy = true;
                            return this.loadingIframe;
                        }
                        return false;
                    },
                    request: function(url, option) {
                        var oTask = {};
                        oTask.url = url;
                        oTask.option = option || {};
                        this.arrTaskLists.push(oTask);
                        if (this.loadFrames == null) {
                            this.createLoadingIframe();
                        } else {
                            this.loadByList();
                        }
                    },
                    loadByList: function() {
                        if (this.arrTaskLists.length === 0) {
                            return false;
                        }
                        var loadStatus = this.isIjaxReady();
                        if (loadStatus === false) {
                            return false;
                        }
                        var newData = this.arrTaskLists[0];
                        var _self = this;
                        setTimeout(function() {
                            _self.loadData(newData.url, newData.option, loadStatus);
                        }, 10);
                        this.arrTaskLists.shift();
                    },
                    destory: function() {
                        if (this.arrTaskLists.length > 0) {
                            return;
                        }
                        document.getElementById(this.loadFrames).callback = null;
                        document.body.removeChild(document.getElementById("ijax_iframes"));
                        if (document.getElementById("IjaxForm")) {
                            document.getElementById("IjaxForm").action = "";
                            document.getElementById("IjaxForm").target = "";
                            document.body.removeChild(document.getElementById("IjaxForm"));
                        }
                        this.loadFrames = null;
                    },
                    loadData: function(url, option, loader) {
                        var ifm = loader.container;
                        var _self = this, _url = "";
                        ifm.callback = function(res) {
                            res = typeof res == "string" && /\s*{/.test(res) ? eval("(" + res + ")") : res;
                            if (res.code == "A00000" && option.onSuccess) {
                                option.onSuccess(res.data);
                                if (option.autoRemove !== false) {
                                    _self.destory();
                                }
                            } else {
                                option.onError(res);
                            }
                            loader.isBusy = false;
                            _self.loadByList();
                        };
                        if (option.CACHE) {
                            _url = url;
                            for (var key in option.CACHE) {
                                _url += option.CACHE[key] + "/";
                            }
                        } else {
                            _url = url;
                            if (option.GET) {
                                for (var key2 in option.GET) {
                                    _url.setParam(key2, encodeURIComponent(option.GET[key2]));
                                }
                            }
                            if (option.POST) {
                                if (!document.getElementById("IjaxForm")) {
                                    var oIjaxForm = document.createElement("form");
                                    document.body.appendChild(oIjaxForm);
                                    oIjaxForm.id = "IjaxForm";
                                    oIjaxForm.method = "post";
                                    oIjaxForm.target = ifm.id;
                                } else {
                                    document.getElementById("IjaxForm").innerHTML = "";
                                }
                                document.getElementById("IjaxForm").action = _url;
                                for (var oItem in option.POST) {
                                    var oInput = document.createElement("input");
                                    oInput.type = "hidden";
                                    oInput.name = oItem;
                                    oInput.value = option.POST[oItem];
                                    document.getElementById("IjaxForm").appendChild(oInput);
                                }
                                document.getElementById("IjaxForm").submit();
                            }
                        }
                        if (!option.POST) {
                            ifm.contentWindow.location.replace(_url);
                        }
                    }
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/http/ijax", (_M_["driver/http/ijax"] = {}) && _M_);

_M_["platform/http/json"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var request = __mod__["platform/http/request"]();
                __mod__[__id__] = function(url, options) {
                    if (options) {
                        var onsuccess = options.onsuccess;
                        options.onsuccess = function(xhr, data) {
                            var obj = null;
                            if (Object.prototype.toString.call(data) === "[object String]") {
                                data = data.trim();
                                data = data.replace(/^[^\[\{]*([\[\{].*[\]\}]).*?$/, "$1");
                                try {
                                    obj = JSON.parse(data);
                                } catch (e) {}
                            } else {
                                obj = data;
                            }
                            if (!obj) {
                                try {
                                    obj = new Function("return (" + data + ")")();
                                } catch (e) {}
                            }
                            if (onsuccess) {
                                onsuccess(xhr, obj);
                            }
                        };
                    }
                    request(url, options);
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/http/json", (_M_["platform/http/json"] = {}) && _M_);

_M_["platform/http/text"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var request = __mod__["platform/http/request"]();
                __mod__[__id__] = function(url, options) {
                    if (options) {
                        var onsuccess = options.onsuccess;
                        options.onsuccess = function(xhr, data) {
                            if (onsuccess) {
                                onsuccess(xhr, data);
                            }
                        };
                    }
                    request(url, options);
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/http/text", (_M_["platform/http/text"] = {}) && _M_);

_M_["platform/http/req"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var req = __mod__["driver/http/req"]();
                __mod__[__id__] = req;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/http/req", (_M_["platform/http/req"] = {}) && _M_);

_M_["driver/http/req"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var isSameDomain = __mod__["platform/lang/isSameDomain"]();
                var swfp = __mod__["driver/http/swfp"]();
                var ajax = __mod__["driver/http/ajax"]();
                var _ua = __mod__["platform/browser/ua"]();
                var request = function(url, options) {
                    if (isSameDomain(url, document.location.href)) {
                        return ajax.request(url, options);
                    } else {
                        if (_ua.IE6 || _ua.IE7 || _ua.IE8 || _ua.IE9 || document.documentMode < 10) {
                            return swfp.request(url, options);
                        } else {
                            if (options.withCredentials !== false) {
                                options.withCredentials = true;
                            }
                            return ajax.request(url, options);
                        }
                    }
                };
                __mod__[__id__] = request;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/http/req", (_M_["driver/http/req"] = {}) && _M_);

_M_["driver/http/swfp"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var __callbacks__ = __mod__["platform/__callbacks__"]();
                var clear = __mod__["platform/plugins/clearSwf"]();
                var ns = "window.Q.__callbacks__.";
                var fn = function() {};
                var swfp = function(url, options) {
                    var callbackNameValue = "iqiyi__swfp__" + Math.floor(Math.random() * 2147483648).toString(36);
                    options.onsuccess = options.onsuccess || fn;
                    options.onfailure = options.onfailure || fn;
                    options.ontimeout = options.ontimeout || fn;
                    __callbacks__[callbackNameValue] = function(data) {
                        if (data == "A00001") {
                            options.ontimeout();
                        } else if (data == "A00002") {
                            options.onfailure();
                        } else {
                            options.onsuccess({
                                responseText: data
                            }, data);
                        }
                        delete __callbacks__[callbackNameValue];
                    };
                    setTimeout(function() {
                        clear.notice({
                            type: "remote",
                            data: {
                                url: url,
                                method: (options.method || "GET").toUpperCase(),
                                timeout: options.timeout || 0,
                                param: options.data || {},
                                callback: ns + callbackNameValue
                            }
                        });
                    }, 0);
                };
                __mod__[__id__] = {
                    request: function() {
                        var arg = arguments;
                        clear.on("ready", function() {
                            swfp.apply(null, arg);
                        });
                    }
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("driver/http/swfp", (_M_["driver/http/swfp"] = {}) && _M_);

_M_["platform/plugins/clearSwf"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var __callbacks__ = __mod__["platform/__callbacks__"]();
                var swfInsert = __mod__["platform/flash/insert"]();
                var swfVer = __mod__["platform/flash/getVer"]();
                var domReady = __mod__["platform/element/ready"]();
                var _queryToJson = __mod__["platform/url/queryToJson"]();
                var _ua = __mod__["platform/browser/ua"]();
                var swf;
                var id;
                var on = function() {};
                var list = {};
                var ready = false;
                var getUrl = function() {
                    var protocol = window.location.protocol;
                    var customUrl = _queryToJson(window.location.search).clear;
                    var url = customUrl || protocol + "//www.iqiyi.com/player/cupid/common/clear1.swf";
                    url += url.indexOf("?") !== -1 ? "&" : "?";
                    url += "r=" + Math.floor(Math.random() * 2147483648).toString(36);
                    return url;
                };
                if (swfVer[0] == "0") {
                    return;
                }
                __callbacks__["iqiyi_clear_ready"] = function() {
                    if (window.__qlt && window.__qlt.end) {
                        window.__qlt.end("clearPluginReady");
                    }
                    ready = true;
                    var fn;
                    while (list["ready"] && list["ready"].length) {
                        try {
                            fn = list["ready"].shift();
                            fn(instance());
                        } catch (e) {}
                    }
                };
                on = function(type, listener) {
                    type = type.replace(/^on/i, "");
                    type = type.toLowerCase();
                    list[type] = list[type] || [];
                    if (id && ready) {
                        listener(instance());
                    } else {
                        list[type].push(listener);
                    }
                };
                var _specialIE = _ua.IE6 || _ua.IE7 || _ua.IE8 || _ua.IE9 || document.documentMode < 10;
                if (!window.vueVersion && (_specialIE || !window.localStorage)) {
                    domReady(function() {
                        if (window.__qlt && window.__qlt.start) {
                            window.__qlt.start("clearPluginReady");
                        }
                        id = swfInsert(getUrl(), {
                            styles: {
                                overflow: "hidden",
                                position: "absolute",
                                top: "0",
                                left: "0",
                                zIndex: "-999"
                            }
                        });
                    });
                }
                var instance = function() {
                    return document.getElementById(id);
                };
                __mod__[__id__] = {
                    on: on,
                    notice: function(json) {
                        var swf = instance();
                        if (swf && swf.notice) {
                            swf.notice(JSON.stringify(json));
                        } else {}
                    },
                    get: function() {
                        return instance();
                    }
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/plugins/clearSwf", (_M_["platform/plugins/clearSwf"] = {}) && _M_);

_M_["platform/flash/insert"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _create = __mod__["platform/flash/create"]();
                var _list = __mod__["platform/flash/list"]();
                __mod__[__id__] = function(path, opts) {
                    opts.id = opts.id || "swf_" + (new Date() * 1).toString(36);
                    var str = _create(path, opts);
                    var div = document.createElement("div");
                    div.style.display = "none";
                    div.innerHTML = str;
                    var ctn;
                    if (opts.container) {
                        ctn = opts.container[0];
                    } else {
                        ctn = document.body;
                    }
                    ctn.insertBefore(div.firstChild, null);
                    setTimeout(function() {
                        _list.set(opts.id);
                    }, 0);
                    return opts.id;
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/flash/insert", (_M_["platform/flash/insert"] = {}) && _M_);

_M_["platform/flash/create"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _extend = __mod__["platform/object/extend"]();
                var _ua = __mod__["platform/browser/ua"]();
                var _toQuery = __mod__["platform/url/jsonToQuery"]();
                var swf = function(path, opts) {
                    var opt = {
                        id: null,
                        height: 1,
                        width: 1,
                        styles: {},
                        properties: {},
                        params: {
                            quality: "high",
                            allowScriptAccess: "always",
                            wMode: "window",
                            align: "middle",
                            bgcolor: "#000000",
                            swLiveConnect: "true",
                            loop: "true",
                            play: "true",
                            DeviceFont: "false",
                            allowFullScreen: "true",
                            menu: "true"
                        },
                        vars: {}
                    };
                    var id = opts.id || "swf_" + Date.now().toString(36);
                    var params = _extend(opt.params, opts.params || {});
                    var vars = _extend(opt.vars, opts.vars || {});
                    var styles = _extend(opt.styles, opts.styles || {});
                    var properties = function() {
                        _extend(opt.properties, {
                            height: opt.height,
                            width: opt.width
                        }, function(t, s) {
                            if (s) {
                                return true;
                            }
                        });
                        _extend(opt.properties, opts.properties, function(t, s) {
                            if (s) {
                                return true;
                            }
                        });
                        return _extend(opt.properties, {
                            height: opts.height,
                            width: opts.width
                        }, function(t, s) {
                            if (s) {
                                return true;
                            }
                        });
                    }();
                    params.flashVars = _toQuery(vars, function(value) {
                        return value;
                    });
                    if (_ua.IE) {
                        properties.classid = "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000";
                        params.movie = path;
                    } else {
                        properties.type = "application/x-shockwave-flash";
                    }
                    properties.data = path;
                    var build = [];
                    build.push('<object id="', id, '"');
                    for (var property in properties) {
                        build.push(" ", property, '="', properties[property], '"');
                    }
                    build.push(' style="');
                    for (var style in styles) {
                        build.push(style, ":", styles[style], ";");
                    }
                    build.push('"');
                    build.push(">");
                    for (var param in params) {
                        if (params[param]) {
                            build.push('<param name="', param, '" value="', params[param], '" />');
                        }
                    }
                    var _target = "http://mbdapp.iqiyi.com/j/ot/QIYImedia_0_08.exe";
                    try {
                        if (Q && Q.browser && Q.browser.Mac) {
                            _target = "https://itunes.apple.com/cn/app/ai-qi-yi-shi-pin/id586515652?mt=12";
                        }
                    } catch (e) {}
                    var _html = '<div id="qiyi_flash_install" style="height:100%;background: rgb(0, 0, 0); ">' + '<div style="top: 50%; width: 100%; text-align: center; margin-top: -50px; position: absolute;">' + '<p><a style="padding: 10px; color: rgb(255, 255, 255); font-size: 14px;" href="http://www.adobe.com/go/getflashplayer"' + ' target="_blank">主人，没有安装flash player不能播放啊~~请您<span class="green">立即安装</span></a></p>' + '<p style="margin-top: 40px;"><a style="padding: 10px; color: rgb(255, 255, 255); font-size: 14px;" href="' + _target + '" target="_blank">打死也不想装Flash？可以试试我们的<span class="green">桌面客户端</span>，用过的都觉得好！</a></p></div>' + "</div>";
                    build.push(_html);
                    build.push("</object>");
                    return build.join("");
                };
                __mod__[__id__] = swf;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/flash/create", (_M_["platform/flash/create"] = {}) && _M_);

_M_["platform/flash/list"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var list = {};
                __mod__[__id__] = {
                    set: function(id) {
                        if (!(id in list)) {
                            list[id] = document.getElementById(id);
                        } else {
                            throw "flash对象id有重复！";
                        }
                    },
                    get: function(id) {
                        return list[id];
                    },
                    getAll: function() {
                        return list;
                    },
                    remove: function(id) {
                        list[id] = null;
                        delete list[id];
                    }
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/flash/list", (_M_["platform/flash/list"] = {}) && _M_);

_M_["platform/flash/getVer"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var version = function() {
                    var ver;
                    try {
                        ver = navigator.plugins["Shockwave Flash"].description;
                    } catch (e) {
                        try {
                            ver = new ActiveXObject("ShockwaveFlash.ShockwaveFlash").GetVariable("$version");
                        } catch (e) {}
                    }
                    return (ver || "0 r0").match(/\d+/g);
                }();
                __mod__[__id__] = version;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/flash/getVer", (_M_["platform/flash/getVer"] = {}) && _M_);

_M_["platform/http/json2"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var req = __mod__["platform/http/req"]();
                __mod__[__id__] = function(url, options) {
                    if (options) {
                        var onsuccess = options.onsuccess;
                        options.onsuccess = function(xhr, data) {
                            var data = data.trim();
                            var obj = null;
                            data = data.replace(/^[^\[\{]*([\[\{].*[\]\}]).*?$/, "$1");
                            try {
                                obj = JSON.parse(data);
                            } catch (e) {}
                            if (!obj) {
                                try {
                                    obj = new Function("return (" + data + ")")();
                                } catch (e) {}
                            }
                            if (onsuccess) {
                                onsuccess(xhr, obj);
                            }
                        };
                    }
                    req(url, options);
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/http/json2", (_M_["platform/http/json2"] = {}) && _M_);

_M_["platform/http/text2"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var req = __mod__["platform/http/req"]();
                __mod__[__id__] = function(url, options) {
                    if (options) {
                        var onsuccess = options.onsuccess;
                        options.onsuccess = function(xhr, data) {
                            if (onsuccess) {
                                onsuccess(xhr, data);
                            }
                        };
                    }
                    req(url, options);
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/http/text2", (_M_["platform/http/text2"] = {}) && _M_);

_M_["platform/crypto/base64"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var base64 = function(obj) {
                    var a64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", a256 = {
                        indexOf: function(c) {
                            return c.charCodeAt(0);
                        },
                        charAt: String.fromCharCode
                    };
                    function code(s, discard, alpha, beta, w1, w2) {
                        s = String(s);
                        var b = 0, x = "", i, c, bs = 1, sb = 1, length = s.length, tmp;
                        for (i = 0; i < length || !discard && sb > 1; i += 1) {
                            b *= w1;
                            bs *= w1;
                            if (i < length) {
                                c = alpha.indexOf(s.charAt(i));
                                if (c <= -1 || c >= w1) {
                                    throw new RangeError();
                                }
                                sb *= w1;
                                b += c;
                            }
                            while (bs >= w2) {
                                bs /= w2;
                                if (sb > 1) {
                                    tmp = b;
                                    b %= bs;
                                    x += beta.charAt((tmp - b) / bs);
                                    sb /= w2;
                                }
                            }
                        }
                        return x;
                    }
                    obj.btoa = function(s) {
                        s = code(s, false, a256, a64, 256, 64);
                        return s + "====".slice(s.length % 4 || 4);
                    };
                    obj.atob = function(s) {
                        var i;
                        s = String(s).split("=");
                        for (i = s.length - 1; i >= 0; i -= 1) {
                            if (s[i].length % 4 === 1) {
                                throw new RangeError();
                            }
                            s[i] = code(s[i], true, a64, a256, 64, 256);
                        }
                        return s.join("");
                    };
                    return obj;
                }({});
                __mod__[__id__] = base64;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/crypto/base64", (_M_["platform/crypto/base64"] = {}) && _M_);

_M_["platform/crypto/md5"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var md5 = function() {
                    var rotateLeft = function(lValue, iShiftBits) {
                        return lValue << iShiftBits | lValue >>> 32 - iShiftBits;
                    };
                    var addUnsigned = function(lX, lY) {
                        var lX4, lY4, lX8, lY8, lResult;
                        lX8 = lX & 2147483648;
                        lY8 = lY & 2147483648;
                        lX4 = lX & 1073741824;
                        lY4 = lY & 1073741824;
                        lResult = (lX & 1073741823) + (lY & 1073741823);
                        if (lX4 & lY4) {
                            return lResult ^ 2147483648 ^ lX8 ^ lY8;
                        }
                        if (lX4 | lY4) {
                            if (lResult & 1073741824) {
                                return lResult ^ 3221225472 ^ lX8 ^ lY8;
                            } else {
                                return lResult ^ 1073741824 ^ lX8 ^ lY8;
                            }
                        } else {
                            return lResult ^ lX8 ^ lY8;
                        }
                    };
                    var F = function(x, y, z) {
                        return x & y | ~x & z;
                    };
                    var G = function(x, y, z) {
                        return x & z | y & ~z;
                    };
                    var H = function(x, y, z) {
                        return x ^ y ^ z;
                    };
                    var I = function(x, y, z) {
                        return y ^ (x | ~z);
                    };
                    var FF = function(a, b, c, d, x, s, ac) {
                        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
                        return addUnsigned(rotateLeft(a, s), b);
                    };
                    var GG = function(a, b, c, d, x, s, ac) {
                        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
                        return addUnsigned(rotateLeft(a, s), b);
                    };
                    var HH = function(a, b, c, d, x, s, ac) {
                        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
                        return addUnsigned(rotateLeft(a, s), b);
                    };
                    var II = function(a, b, c, d, x, s, ac) {
                        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
                        return addUnsigned(rotateLeft(a, s), b);
                    };
                    var convertToWordArray = function(string) {
                        var lWordCount;
                        var lMessageLength = string.length;
                        var lNumberOfWordsTempOne = lMessageLength + 8;
                        var lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - lNumberOfWordsTempOne % 64) / 64;
                        var lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16;
                        var lWordArray = Array(lNumberOfWords - 1);
                        var lBytePosition = 0;
                        var lByteCount = 0;
                        while (lByteCount < lMessageLength) {
                            lWordCount = (lByteCount - lByteCount % 4) / 4;
                            lBytePosition = lByteCount % 4 * 8;
                            lWordArray[lWordCount] = lWordArray[lWordCount] | string.charCodeAt(lByteCount) << lBytePosition;
                            lByteCount++;
                        }
                        lWordCount = (lByteCount - lByteCount % 4) / 4;
                        lBytePosition = lByteCount % 4 * 8;
                        lWordArray[lWordCount] = lWordArray[lWordCount] | 128 << lBytePosition;
                        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
                        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
                        return lWordArray;
                    };
                    var wordToHex = function(lValue) {
                        var WordToHexValue = "", WordToHexValueTemp = "", lByte, lCount;
                        for (lCount = 0; lCount <= 3; lCount++) {
                            lByte = lValue >>> lCount * 8 & 255;
                            WordToHexValueTemp = "0" + lByte.toString(16);
                            WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2);
                        }
                        return WordToHexValue;
                    };
                    var uTF8Encode = function(string) {
                        string = string.replace(/\x0d\x0a/g, "\n");
                        var output = "";
                        for (var n = 0; n < string.length; n++) {
                            var c = string.charCodeAt(n);
                            if (c < 128) {
                                output += String.fromCharCode(c);
                            } else if (c > 127 && c < 2048) {
                                output += String.fromCharCode(c >> 6 | 192);
                                output += String.fromCharCode(c & 63 | 128);
                            } else {
                                output += String.fromCharCode(c >> 12 | 224);
                                output += String.fromCharCode(c >> 6 & 63 | 128);
                                output += String.fromCharCode(c & 63 | 128);
                            }
                        }
                        return output;
                    };
                    return function(string) {
                        string += "";
                        var x = Array();
                        var k, AA, BB, CC, DD, a, b, c, d;
                        var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
                        var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
                        var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
                        var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
                        string = uTF8Encode(string);
                        x = convertToWordArray(string);
                        a = 1732584193;
                        b = 4023233417;
                        c = 2562383102;
                        d = 271733878;
                        for (k = 0; k < x.length; k += 16) {
                            AA = a;
                            BB = b;
                            CC = c;
                            DD = d;
                            a = FF(a, b, c, d, x[k + 0], S11, 3614090360);
                            d = FF(d, a, b, c, x[k + 1], S12, 3905402710);
                            c = FF(c, d, a, b, x[k + 2], S13, 606105819);
                            b = FF(b, c, d, a, x[k + 3], S14, 3250441966);
                            a = FF(a, b, c, d, x[k + 4], S11, 4118548399);
                            d = FF(d, a, b, c, x[k + 5], S12, 1200080426);
                            c = FF(c, d, a, b, x[k + 6], S13, 2821735955);
                            b = FF(b, c, d, a, x[k + 7], S14, 4249261313);
                            a = FF(a, b, c, d, x[k + 8], S11, 1770035416);
                            d = FF(d, a, b, c, x[k + 9], S12, 2336552879);
                            c = FF(c, d, a, b, x[k + 10], S13, 4294925233);
                            b = FF(b, c, d, a, x[k + 11], S14, 2304563134);
                            a = FF(a, b, c, d, x[k + 12], S11, 1804603682);
                            d = FF(d, a, b, c, x[k + 13], S12, 4254626195);
                            c = FF(c, d, a, b, x[k + 14], S13, 2792965006);
                            b = FF(b, c, d, a, x[k + 15], S14, 1236535329);
                            a = GG(a, b, c, d, x[k + 1], S21, 4129170786);
                            d = GG(d, a, b, c, x[k + 6], S22, 3225465664);
                            c = GG(c, d, a, b, x[k + 11], S23, 643717713);
                            b = GG(b, c, d, a, x[k + 0], S24, 3921069994);
                            a = GG(a, b, c, d, x[k + 5], S21, 3593408605);
                            d = GG(d, a, b, c, x[k + 10], S22, 38016083);
                            c = GG(c, d, a, b, x[k + 15], S23, 3634488961);
                            b = GG(b, c, d, a, x[k + 4], S24, 3889429448);
                            a = GG(a, b, c, d, x[k + 9], S21, 568446438);
                            d = GG(d, a, b, c, x[k + 14], S22, 3275163606);
                            c = GG(c, d, a, b, x[k + 3], S23, 4107603335);
                            b = GG(b, c, d, a, x[k + 8], S24, 1163531501);
                            a = GG(a, b, c, d, x[k + 13], S21, 2850285829);
                            d = GG(d, a, b, c, x[k + 2], S22, 4243563512);
                            c = GG(c, d, a, b, x[k + 7], S23, 1735328473);
                            b = GG(b, c, d, a, x[k + 12], S24, 2368359562);
                            a = HH(a, b, c, d, x[k + 5], S31, 4294588738);
                            d = HH(d, a, b, c, x[k + 8], S32, 2272392833);
                            c = HH(c, d, a, b, x[k + 11], S33, 1839030562);
                            b = HH(b, c, d, a, x[k + 14], S34, 4259657740);
                            a = HH(a, b, c, d, x[k + 1], S31, 2763975236);
                            d = HH(d, a, b, c, x[k + 4], S32, 1272893353);
                            c = HH(c, d, a, b, x[k + 7], S33, 4139469664);
                            b = HH(b, c, d, a, x[k + 10], S34, 3200236656);
                            a = HH(a, b, c, d, x[k + 13], S31, 681279174);
                            d = HH(d, a, b, c, x[k + 0], S32, 3936430074);
                            c = HH(c, d, a, b, x[k + 3], S33, 3572445317);
                            b = HH(b, c, d, a, x[k + 6], S34, 76029189);
                            a = HH(a, b, c, d, x[k + 9], S31, 3654602809);
                            d = HH(d, a, b, c, x[k + 12], S32, 3873151461);
                            c = HH(c, d, a, b, x[k + 15], S33, 530742520);
                            b = HH(b, c, d, a, x[k + 2], S34, 3299628645);
                            a = II(a, b, c, d, x[k + 0], S41, 4096336452);
                            d = II(d, a, b, c, x[k + 7], S42, 1126891415);
                            c = II(c, d, a, b, x[k + 14], S43, 2878612391);
                            b = II(b, c, d, a, x[k + 5], S44, 4237533241);
                            a = II(a, b, c, d, x[k + 12], S41, 1700485571);
                            d = II(d, a, b, c, x[k + 3], S42, 2399980690);
                            c = II(c, d, a, b, x[k + 10], S43, 4293915773);
                            b = II(b, c, d, a, x[k + 1], S44, 2240044497);
                            a = II(a, b, c, d, x[k + 8], S41, 1873313359);
                            d = II(d, a, b, c, x[k + 15], S42, 4264355552);
                            c = II(c, d, a, b, x[k + 6], S43, 2734768916);
                            b = II(b, c, d, a, x[k + 13], S44, 1309151649);
                            a = II(a, b, c, d, x[k + 4], S41, 4149444226);
                            d = II(d, a, b, c, x[k + 11], S42, 3174756917);
                            c = II(c, d, a, b, x[k + 2], S43, 718787259);
                            b = II(b, c, d, a, x[k + 9], S44, 3951481745);
                            a = addUnsigned(a, AA);
                            b = addUnsigned(b, BB);
                            c = addUnsigned(c, CC);
                            d = addUnsigned(d, DD);
                        }
                        var tempValue = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
                        return tempValue.toLowerCase();
                    };
                }();
                __mod__[__id__] = md5;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/crypto/md5", (_M_["platform/crypto/md5"] = {}) && _M_);

_M_["platform/crypto/rsa"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var $w = {};
                var RSAUtils;
                if (typeof $w.RSAUtils === "undefined") {
                    RSAUtils = $w.RSAUtils = {};
                }
                var biRadixBase = 2;
                var biRadixBits = 16;
                var bitsPerDigit = biRadixBits;
                var biRadix = 1 << 16;
                var biHalfRadix = biRadix >>> 1;
                var biRadixSquared = biRadix * biRadix;
                var maxDigitVal = biRadix - 1;
                var maxInteger = 9999999999999998;
                var maxDigits;
                var ZERO_ARRAY;
                var bigZero, bigOne;
                var BigInt = $w.BigInt = function(flag) {
                    if (typeof flag === "boolean" && flag === true) {
                        this.digits = null;
                    } else {
                        this.digits = ZERO_ARRAY.slice(0);
                    }
                    this.isNeg = false;
                };
                RSAUtils.setMaxDigits = function(value) {
                    maxDigits = value;
                    ZERO_ARRAY = new Array(maxDigits);
                    for (var iza = 0; iza < ZERO_ARRAY.length; iza++) {
                        ZERO_ARRAY[iza] = 0;
                    }
                    bigZero = new BigInt();
                    bigOne = new BigInt();
                    bigOne.digits[0] = 1;
                };
                RSAUtils.setMaxDigits(20);
                var dpl10 = 15;
                RSAUtils.biFromNumber = function(i) {
                    var result = new BigInt();
                    result.isNeg = i < 0;
                    i = Math.abs(i);
                    var j = 0;
                    while (i > 0) {
                        result.digits[j++] = i & maxDigitVal;
                        i = Math.floor(i / biRadix);
                    }
                    return result;
                };
                var lr10 = RSAUtils.biFromNumber(1e15);
                RSAUtils.biFromDecimal = function(s) {
                    var isNeg = s.charAt(0) == "-";
                    var i = isNeg ? 1 : 0;
                    var result;
                    while (i < s.length && s.charAt(i) == "0") {
                        ++i;
                    }
                    if (i == s.length) {
                        result = new BigInt();
                    } else {
                        var digitCount = s.length - i;
                        var fgl = digitCount % dpl10;
                        if (fgl == 0) {
                            fgl = dpl10;
                        }
                        result = RSAUtils.biFromNumber(Number(s.substr(i, fgl)));
                        i += fgl;
                        while (i < s.length) {
                            result = RSAUtils.biAdd(RSAUtils.biMultiply(result, lr10), RSAUtils.biFromNumber(Number(s.substr(i, dpl10))));
                            i += dpl10;
                        }
                        result.isNeg = isNeg;
                    }
                    return result;
                };
                RSAUtils.biCopy = function(bi) {
                    var result = new BigInt(true);
                    result.digits = bi.digits.slice(0);
                    result.isNeg = bi.isNeg;
                    return result;
                };
                RSAUtils.reverseStr = function(s) {
                    var result = "";
                    for (var i = s.length - 1; i > -1; --i) {
                        result += s.charAt(i);
                    }
                    return result;
                };
                var hexatrigesimalToChar = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z" ];
                RSAUtils.biToString = function(x, radix) {
                    var b = new BigInt();
                    b.digits[0] = radix;
                    var qr = RSAUtils.biDivideModulo(x, b);
                    var result = hexatrigesimalToChar[qr[1].digits[0]];
                    while (RSAUtils.biCompare(qr[0], bigZero) == 1) {
                        qr = RSAUtils.biDivideModulo(qr[0], b);
                        digit = qr[1].digits[0];
                        result += hexatrigesimalToChar[qr[1].digits[0]];
                    }
                    return (x.isNeg ? "-" : "") + RSAUtils.reverseStr(result);
                };
                RSAUtils.biToDecimal = function(x) {
                    var b = new BigInt();
                    b.digits[0] = 10;
                    var qr = RSAUtils.biDivideModulo(x, b);
                    var result = String(qr[1].digits[0]);
                    while (RSAUtils.biCompare(qr[0], bigZero) == 1) {
                        qr = RSAUtils.biDivideModulo(qr[0], b);
                        result += String(qr[1].digits[0]);
                    }
                    return (x.isNeg ? "-" : "") + RSAUtils.reverseStr(result);
                };
                var hexToChar = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f" ];
                RSAUtils.digitToHex = function(n) {
                    var mask = 15;
                    var result = "";
                    for (i = 0; i < 4; ++i) {
                        result += hexToChar[n & mask];
                        n >>>= 4;
                    }
                    return RSAUtils.reverseStr(result);
                };
                RSAUtils.biToHex = function(x) {
                    var result = "";
                    var n = RSAUtils.biHighIndex(x);
                    for (var i = RSAUtils.biHighIndex(x); i > -1; --i) {
                        result += RSAUtils.digitToHex(x.digits[i]);
                    }
                    return result;
                };
                RSAUtils.charToHex = function(c) {
                    var ZERO = 48;
                    var NINE = ZERO + 9;
                    var littleA = 97;
                    var littleZ = littleA + 25;
                    var bigA = 65;
                    var bigZ = 65 + 25;
                    var result;
                    if (c >= ZERO && c <= NINE) {
                        result = c - ZERO;
                    } else if (c >= bigA && c <= bigZ) {
                        result = 10 + c - bigA;
                    } else if (c >= littleA && c <= littleZ) {
                        result = 10 + c - littleA;
                    } else {
                        result = 0;
                    }
                    return result;
                };
                RSAUtils.hexToDigit = function(s) {
                    var result = 0;
                    var sl = Math.min(s.length, 4);
                    for (var i = 0; i < sl; ++i) {
                        result <<= 4;
                        result |= RSAUtils.charToHex(s.charCodeAt(i));
                    }
                    return result;
                };
                RSAUtils.biFromHex = function(s) {
                    var result = new BigInt();
                    var sl = s.length;
                    for (var i = sl, j = 0; i > 0; i -= 4, ++j) {
                        result.digits[j] = RSAUtils.hexToDigit(s.substr(Math.max(i - 4, 0), Math.min(i, 4)));
                    }
                    return result;
                };
                RSAUtils.biFromString = function(s, radix) {
                    var isNeg = s.charAt(0) == "-";
                    var istop = isNeg ? 1 : 0;
                    var result = new BigInt();
                    var place = new BigInt();
                    place.digits[0] = 1;
                    for (var i = s.length - 1; i >= istop; i--) {
                        var c = s.charCodeAt(i);
                        var digit = RSAUtils.charToHex(c);
                        var biDigit = RSAUtils.biMultiplyDigit(place, digit);
                        result = RSAUtils.biAdd(result, biDigit);
                        place = RSAUtils.biMultiplyDigit(place, radix);
                    }
                    result.isNeg = isNeg;
                    return result;
                };
                RSAUtils.biDump = function(b) {
                    return (b.isNeg ? "-" : "") + b.digits.join(" ");
                };
                RSAUtils.biAdd = function(x, y) {
                    var result;
                    if (x.isNeg != y.isNeg) {
                        y.isNeg = !y.isNeg;
                        result = RSAUtils.biSubtract(x, y);
                        y.isNeg = !y.isNeg;
                    } else {
                        result = new BigInt();
                        var c = 0;
                        var n;
                        for (var i = 0; i < x.digits.length; ++i) {
                            n = x.digits[i] + y.digits[i] + c;
                            result.digits[i] = n % biRadix;
                            c = Number(n >= biRadix);
                        }
                        result.isNeg = x.isNeg;
                    }
                    return result;
                };
                RSAUtils.biSubtract = function(x, y) {
                    var result;
                    if (x.isNeg != y.isNeg) {
                        y.isNeg = !y.isNeg;
                        result = RSAUtils.biAdd(x, y);
                        y.isNeg = !y.isNeg;
                    } else {
                        result = new BigInt();
                        var n, c;
                        c = 0;
                        for (var i = 0; i < x.digits.length; ++i) {
                            n = x.digits[i] - y.digits[i] + c;
                            result.digits[i] = n % biRadix;
                            if (result.digits[i] < 0) result.digits[i] += biRadix;
                            c = 0 - Number(n < 0);
                        }
                        if (c == -1) {
                            c = 0;
                            for (var i = 0; i < x.digits.length; ++i) {
                                n = 0 - result.digits[i] + c;
                                result.digits[i] = n % biRadix;
                                if (result.digits[i] < 0) result.digits[i] += biRadix;
                                c = 0 - Number(n < 0);
                            }
                            result.isNeg = !x.isNeg;
                        } else {
                            result.isNeg = x.isNeg;
                        }
                    }
                    return result;
                };
                RSAUtils.biHighIndex = function(x) {
                    var result = x.digits.length - 1;
                    while (result > 0 && x.digits[result] == 0) {
                        --result;
                    }
                    return result;
                };
                RSAUtils.biNumBits = function(x) {
                    var n = RSAUtils.biHighIndex(x);
                    var d = x.digits[n];
                    var m = (n + 1) * bitsPerDigit;
                    var result;
                    for (result = m; result > m - bitsPerDigit; --result) {
                        if ((d & 32768) != 0) break;
                        d <<= 1;
                    }
                    return result;
                };
                RSAUtils.biMultiply = function(x, y) {
                    var result = new BigInt();
                    var c;
                    var n = RSAUtils.biHighIndex(x);
                    var t = RSAUtils.biHighIndex(y);
                    var u, uv, k;
                    for (var i = 0; i <= t; ++i) {
                        c = 0;
                        k = i;
                        for (j = 0; j <= n; ++j, ++k) {
                            uv = result.digits[k] + x.digits[j] * y.digits[i] + c;
                            result.digits[k] = uv & maxDigitVal;
                            c = uv >>> biRadixBits;
                        }
                        result.digits[i + n + 1] = c;
                    }
                    result.isNeg = x.isNeg != y.isNeg;
                    return result;
                };
                RSAUtils.biMultiplyDigit = function(x, y) {
                    var n, c, uv;
                    result = new BigInt();
                    n = RSAUtils.biHighIndex(x);
                    c = 0;
                    for (var j = 0; j <= n; ++j) {
                        uv = result.digits[j] + x.digits[j] * y + c;
                        result.digits[j] = uv & maxDigitVal;
                        c = uv >>> biRadixBits;
                    }
                    result.digits[1 + n] = c;
                    return result;
                };
                RSAUtils.arrayCopy = function(src, srcStart, dest, destStart, n) {
                    var m = Math.min(srcStart + n, src.length);
                    for (var i = srcStart, j = destStart; i < m; ++i, ++j) {
                        dest[j] = src[i];
                    }
                };
                var highBitMasks = [ 0, 32768, 49152, 57344, 61440, 63488, 64512, 65024, 65280, 65408, 65472, 65504, 65520, 65528, 65532, 65534, 65535 ];
                RSAUtils.biShiftLeft = function(x, n) {
                    var digitCount = Math.floor(n / bitsPerDigit);
                    var result = new BigInt();
                    RSAUtils.arrayCopy(x.digits, 0, result.digits, digitCount, result.digits.length - digitCount);
                    var bits = n % bitsPerDigit;
                    var rightBits = bitsPerDigit - bits;
                    for (var i = result.digits.length - 1, i1 = i - 1; i > 0; --i, --i1) {
                        result.digits[i] = result.digits[i] << bits & maxDigitVal | (result.digits[i1] & highBitMasks[bits]) >>> rightBits;
                    }
                    result.digits[0] = result.digits[i] << bits & maxDigitVal;
                    result.isNeg = x.isNeg;
                    return result;
                };
                var lowBitMasks = [ 0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535 ];
                RSAUtils.biShiftRight = function(x, n) {
                    var digitCount = Math.floor(n / bitsPerDigit);
                    var result = new BigInt();
                    RSAUtils.arrayCopy(x.digits, digitCount, result.digits, 0, x.digits.length - digitCount);
                    var bits = n % bitsPerDigit;
                    var leftBits = bitsPerDigit - bits;
                    for (var i = 0, i1 = i + 1; i < result.digits.length - 1; ++i, ++i1) {
                        result.digits[i] = result.digits[i] >>> bits | (result.digits[i1] & lowBitMasks[bits]) << leftBits;
                    }
                    result.digits[result.digits.length - 1] >>>= bits;
                    result.isNeg = x.isNeg;
                    return result;
                };
                RSAUtils.biMultiplyByRadixPower = function(x, n) {
                    var result = new BigInt();
                    RSAUtils.arrayCopy(x.digits, 0, result.digits, n, result.digits.length - n);
                    return result;
                };
                RSAUtils.biDivideByRadixPower = function(x, n) {
                    var result = new BigInt();
                    RSAUtils.arrayCopy(x.digits, n, result.digits, 0, result.digits.length - n);
                    return result;
                };
                RSAUtils.biModuloByRadixPower = function(x, n) {
                    var result = new BigInt();
                    RSAUtils.arrayCopy(x.digits, 0, result.digits, 0, n);
                    return result;
                };
                RSAUtils.biCompare = function(x, y) {
                    if (x.isNeg != y.isNeg) {
                        return 1 - 2 * Number(x.isNeg);
                    }
                    for (var i = x.digits.length - 1; i >= 0; --i) {
                        if (x.digits[i] != y.digits[i]) {
                            if (x.isNeg) {
                                return 1 - 2 * Number(x.digits[i] > y.digits[i]);
                            } else {
                                return 1 - 2 * Number(x.digits[i] < y.digits[i]);
                            }
                        }
                    }
                    return 0;
                };
                RSAUtils.biDivideModulo = function(x, y) {
                    var nb = RSAUtils.biNumBits(x);
                    var tb = RSAUtils.biNumBits(y);
                    var origYIsNeg = y.isNeg;
                    var q, r;
                    if (nb < tb) {
                        if (x.isNeg) {
                            q = RSAUtils.biCopy(bigOne);
                            q.isNeg = !y.isNeg;
                            x.isNeg = false;
                            y.isNeg = false;
                            r = biSubtract(y, x);
                            x.isNeg = true;
                            y.isNeg = origYIsNeg;
                        } else {
                            q = new BigInt();
                            r = RSAUtils.biCopy(x);
                        }
                        return [ q, r ];
                    }
                    q = new BigInt();
                    r = x;
                    var t = Math.ceil(tb / bitsPerDigit) - 1;
                    var lambda = 0;
                    while (y.digits[t] < biHalfRadix) {
                        y = RSAUtils.biShiftLeft(y, 1);
                        ++lambda;
                        ++tb;
                        t = Math.ceil(tb / bitsPerDigit) - 1;
                    }
                    r = RSAUtils.biShiftLeft(r, lambda);
                    nb += lambda;
                    var n = Math.ceil(nb / bitsPerDigit) - 1;
                    var b = RSAUtils.biMultiplyByRadixPower(y, n - t);
                    while (RSAUtils.biCompare(r, b) != -1) {
                        ++q.digits[n - t];
                        r = RSAUtils.biSubtract(r, b);
                    }
                    for (var i = n; i > t; --i) {
                        var ri = i >= r.digits.length ? 0 : r.digits[i];
                        var ri1 = i - 1 >= r.digits.length ? 0 : r.digits[i - 1];
                        var ri2 = i - 2 >= r.digits.length ? 0 : r.digits[i - 2];
                        var yt = t >= y.digits.length ? 0 : y.digits[t];
                        var yt1 = t - 1 >= y.digits.length ? 0 : y.digits[t - 1];
                        if (ri == yt) {
                            q.digits[i - t - 1] = maxDigitVal;
                        } else {
                            q.digits[i - t - 1] = Math.floor((ri * biRadix + ri1) / yt);
                        }
                        var c1 = q.digits[i - t - 1] * (yt * biRadix + yt1);
                        var c2 = ri * biRadixSquared + (ri1 * biRadix + ri2);
                        while (c1 > c2) {
                            --q.digits[i - t - 1];
                            c1 = q.digits[i - t - 1] * (yt * biRadix | yt1);
                            c2 = ri * biRadix * biRadix + (ri1 * biRadix + ri2);
                        }
                        b = RSAUtils.biMultiplyByRadixPower(y, i - t - 1);
                        r = RSAUtils.biSubtract(r, RSAUtils.biMultiplyDigit(b, q.digits[i - t - 1]));
                        if (r.isNeg) {
                            r = RSAUtils.biAdd(r, b);
                            --q.digits[i - t - 1];
                        }
                    }
                    r = RSAUtils.biShiftRight(r, lambda);
                    q.isNeg = x.isNeg != origYIsNeg;
                    if (x.isNeg) {
                        if (origYIsNeg) {
                            q = RSAUtils.biAdd(q, bigOne);
                        } else {
                            q = RSAUtils.biSubtract(q, bigOne);
                        }
                        y = RSAUtils.biShiftRight(y, lambda);
                        r = RSAUtils.biSubtract(y, r);
                    }
                    if (r.digits[0] == 0 && RSAUtils.biHighIndex(r) == 0) r.isNeg = false;
                    return [ q, r ];
                };
                RSAUtils.biDivide = function(x, y) {
                    return RSAUtils.biDivideModulo(x, y)[0];
                };
                RSAUtils.biModulo = function(x, y) {
                    return RSAUtils.biDivideModulo(x, y)[1];
                };
                RSAUtils.biMultiplyMod = function(x, y, m) {
                    return RSAUtils.biModulo(RSAUtils.biMultiply(x, y), m);
                };
                RSAUtils.biPow = function(x, y) {
                    var result = bigOne;
                    var a = x;
                    while (true) {
                        if ((y & 1) != 0) result = RSAUtils.biMultiply(result, a);
                        y >>= 1;
                        if (y == 0) break;
                        a = RSAUtils.biMultiply(a, a);
                    }
                    return result;
                };
                RSAUtils.biPowMod = function(x, y, m) {
                    var result = bigOne;
                    var a = x;
                    var k = y;
                    while (true) {
                        if ((k.digits[0] & 1) != 0) result = RSAUtils.biMultiplyMod(result, a, m);
                        k = RSAUtils.biShiftRight(k, 1);
                        if (k.digits[0] == 0 && RSAUtils.biHighIndex(k) == 0) break;
                        a = RSAUtils.biMultiplyMod(a, a, m);
                    }
                    return result;
                };
                $w.BarrettMu = function(m) {
                    this.modulus = RSAUtils.biCopy(m);
                    this.k = RSAUtils.biHighIndex(this.modulus) + 1;
                    var b2k = new BigInt();
                    b2k.digits[2 * this.k] = 1;
                    this.mu = RSAUtils.biDivide(b2k, this.modulus);
                    this.bkplus1 = new BigInt();
                    this.bkplus1.digits[this.k + 1] = 1;
                    this.modulo = BarrettMu_modulo;
                    this.multiplyMod = BarrettMu_multiplyMod;
                    this.powMod = BarrettMu_powMod;
                };
                function BarrettMu_modulo(x) {
                    var $dmath = RSAUtils;
                    var q1 = $dmath.biDivideByRadixPower(x, this.k - 1);
                    var q2 = $dmath.biMultiply(q1, this.mu);
                    var q3 = $dmath.biDivideByRadixPower(q2, this.k + 1);
                    var r1 = $dmath.biModuloByRadixPower(x, this.k + 1);
                    var r2term = $dmath.biMultiply(q3, this.modulus);
                    var r2 = $dmath.biModuloByRadixPower(r2term, this.k + 1);
                    var r = $dmath.biSubtract(r1, r2);
                    if (r.isNeg) {
                        r = $dmath.biAdd(r, this.bkplus1);
                    }
                    var rgtem = $dmath.biCompare(r, this.modulus) >= 0;
                    while (rgtem) {
                        r = $dmath.biSubtract(r, this.modulus);
                        rgtem = $dmath.biCompare(r, this.modulus) >= 0;
                    }
                    return r;
                }
                function BarrettMu_multiplyMod(x, y) {
                    var xy = RSAUtils.biMultiply(x, y);
                    return this.modulo(xy);
                }
                function BarrettMu_powMod(x, y) {
                    var result = new BigInt();
                    result.digits[0] = 1;
                    var a = x;
                    var k = y;
                    while (true) {
                        if ((k.digits[0] & 1) != 0) result = this.multiplyMod(result, a);
                        k = RSAUtils.biShiftRight(k, 1);
                        if (k.digits[0] == 0 && RSAUtils.biHighIndex(k) == 0) break;
                        a = this.multiplyMod(a, a);
                    }
                    return result;
                }
                var RSAKeyPair = function(encryptionExponent, decryptionExponent, modulus) {
                    var $dmath = RSAUtils;
                    this.e = $dmath.biFromHex(encryptionExponent);
                    this.d = $dmath.biFromHex(decryptionExponent);
                    this.m = $dmath.biFromHex(modulus);
                    this.chunkSize = 2 * $dmath.biHighIndex(this.m);
                    this.radix = 16;
                    this.barrett = new $w.BarrettMu(this.m);
                };
                RSAUtils.getKeyPair = function(encryptionExponent, decryptionExponent, modulus) {
                    return new RSAKeyPair(encryptionExponent, decryptionExponent, modulus);
                };
                if (typeof $w.twoDigit === "undefined") {
                    $w.twoDigit = function(n) {
                        return (n < 10 ? "0" : "") + String(n);
                    };
                }
                RSAUtils.encryptedString = function(key, s) {
                    var a = [];
                    var sl = s.length;
                    var i = 0;
                    while (i < sl) {
                        a[i] = s.charCodeAt(i);
                        i++;
                    }
                    while (a.length % key.chunkSize != 0) {
                        a[i++] = 0;
                    }
                    var al = a.length;
                    var result = "";
                    var j, k, block;
                    for (i = 0; i < al; i += key.chunkSize) {
                        block = new BigInt();
                        j = 0;
                        for (k = i; k < i + key.chunkSize; ++j) {
                            block.digits[j] = a[k++];
                            block.digits[j] += a[k++] << 8;
                        }
                        var crypt = key.barrett.powMod(block, key.e);
                        var text = key.radix == 16 ? RSAUtils.biToHex(crypt) : RSAUtils.biToString(crypt, key.radix);
                        result += text + " ";
                    }
                    return result.substring(0, result.length - 1);
                };
                RSAUtils.decryptedString = function(key, s) {
                    var blocks = s.split(" ");
                    var result = "";
                    var i, j, block;
                    for (i = 0; i < blocks.length; ++i) {
                        var bi;
                        if (key.radix == 16) {
                            bi = RSAUtils.biFromHex(blocks[i]);
                        } else {
                            bi = RSAUtils.biFromString(blocks[i], key.radix);
                        }
                        block = key.barrett.powMod(bi, key.d);
                        for (j = 0; j <= RSAUtils.biHighIndex(block); ++j) {
                            result += String.fromCharCode(block.digits[j] & 255, block.digits[j] >> 8);
                        }
                    }
                    if (result.charCodeAt(result.length - 1) == 0) {
                        result = result.substring(0, result.length - 1);
                    }
                    return result;
                };
                RSAUtils.setMaxDigits(130);
                __mod__[__id__] = $w;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/crypto/rsa", (_M_["platform/crypto/rsa"] = {}) && _M_);

_M_["platform/date/formatSeconds"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                __mod__[__id__] = function(s) {
                    if (isNaN(s)) {
                        return "00:00:00";
                    }
                    var h = s >= 3600 ? Math.floor(s / 3600) : 0;
                    var m = s % 3600 >= 60 ? Math.floor(s % 3600 / 60) : 0;
                    m = m >= 10 ? m : "0" + m;
                    s = m >= 0 ? s % 3600 % 60 : s;
                    s = s >= 10 ? s : "0" + s;
                    return h > 0 ? (h > 9 ? h : "0" + h) + ":" + m + ":" + s : m + ":" + s;
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/date/formatSeconds", (_M_["platform/date/formatSeconds"] = {}) && _M_);

_M_["platform/setQC005"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var get = __mod__["platform/cookie/get"]();
                var set = __mod__["platform/cookie/set"]();
                var json = __mod__["platform/http/json2"]();
                var generate = function(uid) {
                    if (!uid) {
                        var chars = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f" ];
                        var nums = "";
                        for (var i = 0; i < 32; i++) {
                            var id = Math.floor(Math.random() * 16);
                            nums += chars[id];
                        }
                        uid = nums;
                    }
                    set("QC005", uid, {
                        path: "/",
                        domain: "iqiyi.com",
                        expires: 365 * 24 * 3600 * 1e3
                    });
                };
                var setNewUser = function(isNewuser) {
                    set("QC173", isNewuser, {
                        path: "/",
                        domain: "iqiyi.com",
                        expires: 365 * 24 * 3600 * 1e3
                    });
                };
                if (!get("QC005")) {
                    var localStorageQC005 = window.localStorage && localStorage.getItem("QC005");
                    if (localStorageQC005) {
                        set("QC005", localStorageQC005, {
                            path: "/",
                            domain: "iqiyi.com",
                            expires: 365 * 24 * 3600 * 1e3
                        });
                    } else {
                        json("//data.video.iqiyi.com/uid", {
                            dataType: "jsonp",
                            onsuccess: function(xhr, data) {
                                if (data && data.uid) {
                                    generate(data.uid);
                                } else {
                                    generate();
                                }
                                setNewUser(1);
                            },
                            onfailure: function() {
                                generate();
                                setNewUser(1);
                            }
                        });
                    }
                } else {
                    setNewUser(0);
                }
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/setQC005", (_M_["platform/setQC005"] = {}) && _M_);

_M_["platform/cookie/get"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var getRaw = __mod__["platform/cookie/getRaw"]();
                var get = function(key) {
                    var value = getRaw(key);
                    if ("string" == typeof value) {
                        value = decodeURIComponent(value);
                        return value;
                    }
                    return null;
                };
                __mod__[__id__] = get;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/cookie/get", (_M_["platform/cookie/get"] = {}) && _M_);

_M_["platform/cookie/getRaw"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var isValidKey = __mod__["platform/cookie/isValidKey"]();
                var getRaw = function(key) {
                    if (isValidKey(key)) {
                        var reg = new RegExp("(^| )" + key + "=([^;]*)(;|$)"), result = reg.exec(document.cookie);
                        if (result) {
                            return result[2] || null;
                        }
                    }
                    return null;
                };
                __mod__[__id__] = getRaw;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/cookie/getRaw", (_M_["platform/cookie/getRaw"] = {}) && _M_);

_M_["platform/cookie/isValidKey"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var isValidKey = function(key) {
                    return new RegExp('^[^\\x00-\\x20\\x7f\\(\\)<>@,;:\\\\\\"\\[\\]\\?=\\{\\}\\/\\u0080-\\uffff]+$').test(key);
                };
                __mod__[__id__] = isValidKey;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/cookie/isValidKey", (_M_["platform/cookie/isValidKey"] = {}) && _M_);

_M_["platform/cookie/set"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var setRaw = __mod__["platform/cookie/setRaw"]();
                var set = function(key, value, options) {
                    setRaw(key, encodeURIComponent(value), options);
                };
                __mod__[__id__] = set;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/cookie/set", (_M_["platform/cookie/set"] = {}) && _M_);

_M_["platform/cookie/setRaw"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var isValidKey = __mod__["platform/cookie/isValidKey"]();
                var setRaw = function(key, value, options) {
                    if (!isValidKey(key)) {
                        return;
                    }
                    options = options || {};
                    var expires = options.expires;
                    if ("number" == typeof options.expires) {
                        expires = new Date();
                        expires.setTime(expires.getTime() + options.expires);
                    }
                    document.cookie = key + "=" + value + (options.path ? "; path=" + options.path : "") + (expires ? "; expires=" + expires.toGMTString() : "") + (options.domain ? "; domain=" + options.domain : "") + (options.secure ? "; secure" : "");
                };
                __mod__[__id__] = setRaw;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/cookie/setRaw", (_M_["platform/cookie/setRaw"] = {}) && _M_);

_M_["platform/plugins/template"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var Class = __mod__["platform/class"]();
                var extend = __mod__["platform/object/extend"]();
                __mod__[__id__] = Class("Template", {
                    construct: function(template, opt) {
                        this.template = template + "";
                        this.filter = "\\";
                        this._isNesting = /([\s\S])?\$[^{]*?\{(?:(?![{}]).|\{(?:(?![{}]).)*\})*\}/;
                        this._regPattern = /([\s\S]?)\$(\w*){((?:(?:\$\w*){(?:(?:\$\w*)?{(?:(?:\$\w*)?{(?:(?:\$\w*)?{(?:(?:\$\w*)?{(?:(?:\$\w*)?{[^{}]*}|[^{}])*}|[^{}])*}|[^{}])*}|[^{}])*}|[^{}])*}|[^{}])*)?}/g;
                        this._funs = {};
                        this._tmp_cache = {};
                        this.params = {};
                        this.self_params = {};
                        if (opt) {
                            for (var n in opt) {
                                if (opt.hasOwnProperty(n)) {
                                    if (typeof opt[n] == "function") {
                                        this._funs[n] = opt[n];
                                    } else {
                                        this.self_params[n] = opt[n];
                                    }
                                }
                            }
                        }
                    },
                    methods: {
                        evaluate: function(obj, opt) {
                            var _template = "";
                            if (typeof obj == "object") {
                                this._tmp_cache = {};
                                this.params = obj;
                                obj && extend(this.params, this.self_params);
                                obj && extend(this.params, opt);
                                var _this = this;
                                _template = this.template.replace(this._regPattern, function(all, filter, name, content) {
                                    if (new RegExp("^\\" + _this.filter, "").test(all)) {
                                        return all.split("" + _this.filter)[1];
                                    }
                                    if (_this._isNesting.test(content)) {
                                        content = content.replace(_this._regPattern, arguments.callee);
                                    }
                                    var args = content ? content.split(",") : [];
                                    for (var cat = 0, len = args.length; cat < len; cat++) {
                                        args[cat] = _this.trim(args[cat]);
                                    }
                                    switch (name) {
                                      case "":
                                        return filter + _this.get(args[0]);

                                      case "trim":
                                        if (len == 2 && args[1] && args[1].toLowerCase() == "html") {
                                            var d = _this.get(args[0]);
                                            return filter + (d ? _this.trimHTML(d) : "");
                                        } else {
                                            d = _this.get(args[0]);
                                            return filter + (d ? _this.trim(d) : "");
                                        }

                                      case "encode":
                                        var e = _this.get(args[0]);
                                        return filter + (e && _this.encode(e));

                                      case "time":
                                        if (!/\d*/g.test(args[0])) {
                                            throw new Error("error(Template): time format is incorrect");
                                        }
                                        var ti = _this.get(args[0]) || 0;
                                        return filter + (ti ? _this.time_format(ti) : "");

                                      case "date":
                                        if (!args[1]) {
                                            throw new Error("error(Template): date format argument[1] is null");
                                        }
                                        var d = _this.get(args[0]);
                                        if (!/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g.test(d)) {
                                            throw new Error("error(Template): date format is incorrect");
                                        }
                                        return filter + (d ? _this.date_format(d, args[1]) : "");

                                      case "evalstr":
                                        var ev;
                                        try {
                                            ev = _this.get(args[0]);
                                        } catch (err) {
                                            throw new Error("error(Template): evalstr error");
                                        }
                                        return filter + eval(ev);

                                      case "cache":
                                        if (obj[args[1]]) {
                                            throw new Error("error(Template): cache key the same with params key is not allowed");
                                        }
                                        args[0] && (_this._tmp_cache[args[1]] = args[0]) || obj[args[0]] && (_this._tmp_cache[args[1]] = obj[args[0]]);
                                        return filter;

                                      case "fixed":
                                        var f = _this.get(args[0]);
                                        if (args[1]) {
                                            return filter + (f && _this.fixed(f, args[1]) || "");
                                        } else {
                                            return filter + f;
                                        }

                                      case "img":
                                        var im = _this.get(args[0]);
                                        return filter + im.setImgSize(args[1]);

                                      case "arr":
                                        var ar = args.slice(0, args.length - 1).join();
                                        var ar = /\[[^\]]*\]/.test(ar) ? ar : _this.get(args[0]);
                                        if (typeof ar == "string") {
                                            try {
                                                ar = eval("(" + ar + ")");
                                            } catch (err) {
                                                throw new Error("error(Template): array format error");
                                            }
                                        }
                                        var idx = args[args.length - 1] ? args[args.length - 1] : 0;
                                        return filter + (ar[idx] || "");

                                      case "obj":
                                        var ob = args.slice(0, args.length - 1).join();
                                        var ob = /{[^}]*}/.test(ob) ? ob : _this.get(args[0]);
                                        if (typeof ob == "string") {
                                            try {
                                                ob = eval("(" + ob + ")");
                                            } catch (err) {
                                                throw new Error("error(Template): object format error");
                                            }
                                        }
                                        var key = args[1];
                                        return filter + (key && ob[key] || "");

                                      case "pick":
                                        try {
                                            switch (len) {
                                              case 2:
                                                var p = _this.get(args[0]);
                                                return filter + eval(p + "? '" + args[1] + "' : ''");

                                              case 3:
                                                p = _this.get(args[0]);
                                                return filter + eval(p + "? '" + args[1] + "':'" + args[2] + "'");

                                              case 4:
                                                p = _this.get(args[0]);
                                                return filter + (p ? p == args[1] ? args[2] : args[3] : "");

                                              default:
                                                throw new Error("error(Template): the parameter num is incorrect");
                                            }
                                        } catch (err) {
                                            switch (len) {
                                              case 2:
                                                var p = _this.get(args[0]);
                                                return filter + eval("'" + p + "'? '" + args[1] + "' : ''");

                                              case 3:
                                                p = _this.get(args[0]);
                                                return filter + eval("'" + p + "'? '" + args[1] + "':'" + args[2] + "'");

                                              default:
                                                throw new Error("error(Template): the parameter num is incorrect");
                                            }
                                        }

                                      default:
                                        if (/^f_/.test(name)) {
                                            var f_name = name && name.split("f_")[1];
                                            if (!(f_name && _this._funs[f_name])) {
                                                throw new Error("error(Template): function " + f_name + " is not exists");
                                            }
                                            return filter + _this._funs[f_name].apply(_this, args);
                                        }
                                    }
                                });
                            }
                            return _template;
                        },
                        get: function(key) {
                            if (key in this.params) return this.params[key];
                            if (key in this._tmp_cache) return this._tmp_cache[key];
                            return "";
                        },
                        encode: function(value) {
                            return encodeURIComponent(value);
                        },
                        trim: function(value) {
                            return value.trim();
                        },
                        trimHTML: function(value) {
                            return value.trimHtml();
                        },
                        fixed: function(value, len) {
                            return value.trancate(len);
                        },
                        date_format: function(datestr, reg) {
                            var tmp = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(datestr);
                            var Y = tmp[1], M = tmp[2], D = tmp[3], h = tmp[4], m = tmp[5], s = tmp[6];
                            reg = reg || "hh:mm:ss";
                            /ss/.test(reg) && (reg = reg.replace(/ss/, s)), /mm/.test(reg) && (reg = reg.replace(/mm/, m)), 
                            /hh/.test(reg) && (reg = reg.replace(/hh/, h)), /MM/.test(reg) && (reg = reg.replace(/MM/, M)), 
                            /DD/.test(reg) && (reg = reg.replace(/DD/, D)), /YYYY/.test(reg) && (reg = reg.replace(/YYYY/, Y)), 
                            /YY/.test(reg) && (reg = reg.replace(/YY/, Y.substring(2)));
                            return reg;
                        },
                        time_format: function(time) {
                            var m = Math.floor(time / 60), s = time % 60;
                            if (s < 10) {
                                s = "0" + s;
                            }
                            if (m > 60) {
                                var h = Math.floor(m / 60);
                                m = m % 60;
                                if (h < 10) {
                                    h = "0" + h;
                                }
                                if (m < 10) {
                                    m = "0" + m;
                                }
                                return h + ":" + m + ":" + s;
                            } else {
                                if (m < 10) {
                                    m = "0" + m;
                                }
                                return m + ":" + s;
                            }
                        }
                    }
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/plugins/template", (_M_["platform/plugins/template"] = {}) && _M_);

_M_["platform/plugins/mustache"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var Mustache = {};
                Mustache.name = "mustache.js";
                Mustache.version = "0.7.0";
                Mustache.tags = [ "{{", "}}" ];
                var whiteRe = /\s*/;
                var spaceRe = /\s+/;
                var nonSpaceRe = /\S/;
                var eqRe = /\s*=/;
                var curlyRe = /\s*\}/;
                var tagRe = /#|\^|\/|>|\{|&|=|!/;
                function testRe(re, string) {
                    return RegExp.prototype.test.call(re, string);
                }
                function isWhitespace(string) {
                    return !testRe(nonSpaceRe, string);
                }
                var isArray = Array.isArray || function(obj) {
                    return Object.prototype.toString.call(obj) === "[object Array]";
                };
                function escapeRe(string) {
                    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
                }
                var entityMap = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                    "/": "&#x2F;"
                };
                function escapeHtml(string) {
                    return String(string).replace(/[&<>"'\/]/g, function(s) {
                        return entityMap[s];
                    });
                }
                Mustache.escape = escapeHtml;
                function Scanner(string) {
                    this.string = string;
                    this.tail = string;
                    this.pos = 0;
                }
                Scanner.prototype.eos = function() {
                    return this.tail === "";
                };
                Scanner.prototype.scan = function(re) {
                    var match = this.tail.match(re);
                    if (match && match.index === 0) {
                        this.tail = this.tail.substring(match[0].length);
                        this.pos += match[0].length;
                        return match[0];
                    }
                    return "";
                };
                Scanner.prototype.scanUntil = function(re) {
                    var match, pos = this.tail.search(re);
                    switch (pos) {
                      case -1:
                        match = this.tail;
                        this.pos += this.tail.length;
                        this.tail = "";
                        break;

                      case 0:
                        match = "";
                        break;

                      default:
                        match = this.tail.substring(0, pos);
                        this.tail = this.tail.substring(pos);
                        this.pos += pos;
                    }
                    return match;
                };
                function Context(view, parent) {
                    this.view = view;
                    this.parent = parent;
                    this.clearCache();
                }
                Context.make = function(view) {
                    return view instanceof Context ? view : new Context(view);
                };
                Context.prototype.clearCache = function() {
                    this._cache = {};
                };
                Context.prototype.push = function(view) {
                    return new Context(view, this);
                };
                Context.prototype.lookup = function(name) {
                    var value = this._cache[name];
                    if (!value) {
                        if (name === ".") {
                            value = this.view;
                        } else {
                            var context = this;
                            while (context) {
                                if (name.indexOf(".") > 0) {
                                    var names = name.split("."), i = 0;
                                    value = context.view;
                                    while (value && i < names.length) {
                                        value = value[names[i++]];
                                    }
                                } else {
                                    value = context.view[name];
                                }
                                if (value != null) {
                                    break;
                                }
                                context = context.parent;
                            }
                        }
                        this._cache[name] = value;
                    }
                    if (typeof value === "function") {
                        value = value.call(this.view);
                    }
                    return value;
                };
                function Writer() {
                    this.clearCache();
                }
                Writer.prototype.clearCache = function() {
                    this._cache = {};
                    this._partialCache = {};
                };
                Writer.prototype.compile = function(template, tags) {
                    return this._compile(this._cache, template, template, tags);
                };
                Writer.prototype.compilePartial = function(name, template, tags) {
                    return this._compile(this._partialCache, name, template, tags);
                };
                Writer.prototype.render = function(template, view, partials) {
                    return this.compile(template)(view, partials);
                };
                Writer.prototype._compile = function(cache, key, template, tags) {
                    if (!cache[key]) {
                        var tokens = Mustache.parse(template, tags);
                        var fn = compileTokens(tokens);
                        var self = this;
                        cache[key] = function(view, partials) {
                            if (partials) {
                                if (typeof partials === "function") {
                                    self._loadPartial = partials;
                                } else {
                                    for (var name in partials) {
                                        self.compilePartial(name, partials[name]);
                                    }
                                }
                            }
                            return fn(self, Context.make(view), template);
                        };
                    }
                    return cache[key];
                };
                Writer.prototype._section = function(name, context, text, callback) {
                    var value = context.lookup(name);
                    switch (typeof value) {
                      case "object":
                        if (isArray(value)) {
                            var buffer = "";
                            for (var i = 0, len = value.length; i < len; ++i) {
                                buffer += callback(this, context.push(value[i]));
                            }
                            return buffer;
                        }
                        return value ? callback(this, context.push(value)) : "";

                      case "function":
                        var self = this;
                        var scopedRender = function(template) {
                            return self.render(template, context);
                        };
                        return value.call(context.view, text, scopedRender) || "";

                      default:
                        if (value) {
                            return callback(this, context);
                        }
                    }
                    return "";
                };
                Writer.prototype._inverted = function(name, context, callback) {
                    var value = context.lookup(name);
                    if (!value || isArray(value) && value.length === 0) {
                        return callback(this, context);
                    }
                    return "";
                };
                Writer.prototype._partial = function(name, context) {
                    if (!(name in this._partialCache) && this._loadPartial) {
                        this.compilePartial(name, this._loadPartial(name));
                    }
                    var fn = this._partialCache[name];
                    return fn ? fn(context) : "";
                };
                Writer.prototype._name = function(name, context) {
                    var value = context.lookup(name);
                    if (typeof value === "function") {
                        value = value.call(context.view);
                    }
                    return value == null ? "" : String(value);
                };
                Writer.prototype._escaped = function(name, context) {
                    return Mustache.escape(this._name(name, context));
                };
                function sectionBounds(token) {
                    var start = token[3];
                    var end = start;
                    var tokens;
                    while ((tokens = token[4]) && tokens.length) {
                        token = tokens[tokens.length - 1];
                        end = token[3];
                    }
                    return [ start, end ];
                }
                function compileTokens(tokens) {
                    var subRenders = {};
                    function subRender(i, tokens, template) {
                        if (!subRenders[i]) {
                            var fn = compileTokens(tokens);
                            subRenders[i] = function(writer, context) {
                                return fn(writer, context, template);
                            };
                        }
                        return subRenders[i];
                    }
                    function renderFunction(writer, context, template) {
                        var buffer = "";
                        var token, sectionText;
                        for (var i = 0, len = tokens.length; i < len; ++i) {
                            token = tokens[i];
                            switch (token[0]) {
                              case "#":
                                sectionText = template.slice.apply(template, sectionBounds(token));
                                buffer += writer._section(token[1], context, sectionText, subRender(i, token[4], template));
                                break;

                              case "^":
                                buffer += writer._inverted(token[1], context, subRender(i, token[4], template));
                                break;

                              case ">":
                                buffer += writer._partial(token[1], context);
                                break;

                              case "&":
                                buffer += writer._name(token[1], context);
                                break;

                              case "name":
                                buffer += writer._escaped(token[1], context);
                                break;

                              case "text":
                                buffer += token[1];
                                break;
                            }
                        }
                        return buffer;
                    }
                    return renderFunction;
                }
                function nestTokens(tokens) {
                    var tree = [];
                    var collector = tree;
                    var sections = [];
                    var token, section;
                    for (var i = 0; i < tokens.length; ++i) {
                        token = tokens[i];
                        switch (token[0]) {
                          case "#":
                          case "^":
                            token[4] = [];
                            sections.push(token);
                            collector.push(token);
                            collector = token[4];
                            break;

                          case "/":
                            if (sections.length === 0) {
                                throw new Error("Unopened section: " + token[1]);
                            }
                            section = sections.pop();
                            if (section[1] !== token[1]) {
                                throw new Error("Unclosed section: " + section[1]);
                            }
                            if (sections.length > 0) {
                                collector = sections[sections.length - 1][4];
                            } else {
                                collector = tree;
                            }
                            break;

                          default:
                            collector.push(token);
                        }
                    }
                    section = sections.pop();
                    if (section) {
                        throw new Error("Unclosed section: " + section[1]);
                    }
                    return tree;
                }
                function escapeTags(tags) {
                    if (tags.length !== 2) {
                        throw new Error("Invalid tags: " + tags.join(" "));
                    }
                    return [ new RegExp(escapeRe(tags[0]) + "\\s*"), new RegExp("\\s*" + escapeRe(tags[1])) ];
                }
                Mustache.parse = function(template, tags) {
                    tags = tags || Mustache.tags;
                    var tagRes = escapeTags(tags);
                    var scanner = new Scanner(template);
                    var tokens = [], spaces = [], hasTag = false, nonSpace = false;
                    function stripSpace() {
                        if (hasTag && !nonSpace) {
                            while (spaces.length) {
                                tokens.splice(spaces.pop(), 1);
                            }
                        } else {
                            spaces = [];
                        }
                        hasTag = false;
                        nonSpace = false;
                    }
                    var start, type, value, chr;
                    while (!scanner.eos()) {
                        start = scanner.pos;
                        value = scanner.scanUntil(tagRes[0]);
                        if (value) {
                            tokens.push([ "text", value, start, start + value.length ]);
                        }
                        start = scanner.pos;
                        if (!scanner.scan(tagRes[0])) {
                            break;
                        }
                        hasTag = true;
                        type = scanner.scan(tagRe) || "name";
                        scanner.scan(whiteRe);
                        if (type === "=") {
                            value = scanner.scanUntil(eqRe);
                            scanner.scan(eqRe);
                            scanner.scanUntil(tagRes[1]);
                        } else if (type === "{") {
                            var closeRe = new RegExp("\\s*" + escapeRe("}" + tags[1]));
                            value = scanner.scanUntil(closeRe);
                            scanner.scan(curlyRe);
                            scanner.scanUntil(tagRes[1]);
                            type = "&";
                        } else {
                            value = scanner.scanUntil(tagRes[1]);
                        }
                        if (!scanner.scan(tagRes[1])) {
                            throw new Error("Unclosed tag at " + scanner.pos);
                        }
                        tokens.push([ type, value, start, scanner.pos ]);
                        if (type === "name" || type === "{" || type === "&") {
                            nonSpace = true;
                        }
                        if (type === "=") {
                            tags = value.split(spaceRe);
                            tagRes = escapeTags(tags);
                        }
                    }
                    return nestTokens(tokens);
                };
                var _writer = new Writer();
                Mustache.clearCache = function() {
                    return _writer.clearCache();
                };
                Mustache.compile = function(template, tags) {
                    return _writer.compile(template, tags);
                };
                Mustache.compilePartial = function(name, template, tags) {
                    return _writer.compilePartial(name, template, tags);
                };
                Mustache.render = function(template, view, partials) {
                    return _writer.render(template, view, partials);
                };
                Mustache.Scanner = Scanner;
                Mustache.Context = Context;
                Mustache.Writer = Writer;
                __mod__[__id__] = Mustache;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/plugins/mustache", (_M_["platform/plugins/mustache"] = {}) && _M_);

_M_["platform/plugins/artTemplate"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var template = function(id, content) {
                    return template[typeof content === "object" ? "render" : "compile"].apply(template, arguments);
                };
                (function(exports, global) {
                    "use strict";
                    exports.version = "2.0.1";
                    exports.openTag = "<%";
                    exports.closeTag = "%>";
                    exports.isEscape = true;
                    exports.isCompress = false;
                    exports.parser = null;
                    exports.render = function(id, data) {
                        var cache = _getCache(id);
                        if (cache === undefined) {
                            return _debug({
                                id: id,
                                name: "Render Error",
                                message: "No Template"
                            });
                        }
                        return cache(data);
                    };
                    exports.compile = function(id, source) {
                        var params = arguments;
                        var isDebug = params[2];
                        var anonymous = "anonymous";
                        var Render;
                        if (typeof source !== "string") {
                            isDebug = params[1];
                            source = params[0];
                            id = anonymous;
                        }
                        try {
                            Render = _compile(source, isDebug);
                        } catch (e) {
                            e.id = id || source;
                            e.name = "Syntax Error";
                            return _debug(e);
                        }
                        function render(data) {
                            try {
                                return new Render(data) + "";
                            } catch (e) {
                                if (!isDebug) {
                                    return exports.compile(id, source, true)(data);
                                }
                                e.id = id || source;
                                e.name = "Render Error";
                                e.source = source;
                                return _debug(e);
                            }
                        }
                        render.prototype = Render.prototype;
                        render.toString = function() {
                            return Render.toString();
                        };
                        if (id !== anonymous) {
                            _cache[id] = render;
                        }
                        return render;
                    };
                    exports.helper = function(name, helper) {
                        exports.prototype[name] = helper;
                    };
                    exports.onerror = function(e) {
                        var content = "[template]:\n" + e.id + "\n\n[name]:\n" + e.name;
                        if (e.message) {
                            content += "\n\n[message]:\n" + e.message;
                        }
                        if (e.line) {
                            content += "\n\n[line]:\n" + e.line;
                            content += "\n\n[source]:\n" + e.source.split(/\n/)[e.line - 1].replace(/^[\s\t]+/, "");
                        }
                        if (e.temp) {
                            content += "\n\n[temp]:\n" + e.temp;
                        }
                        if (global.console) {
                            global.console.error(content);
                        }
                    };
                    var _cache = {};
                    var _getCache = function(id) {
                        var cache = _cache[id];
                        if (cache === undefined && "document" in global) {
                            var elem = document.getElementById(id);
                            if (elem) {
                                var source = elem.value || elem.innerHTML;
                                return exports.compile(id, source.replace(/^\s*|\s*$/g, ""));
                            }
                        } else if (_cache.hasOwnProperty(id)) {
                            return cache;
                        }
                    };
                    var _debug = function(e) {
                        exports.onerror(e);
                        function error() {
                            return error + "";
                        }
                        error.toString = function() {
                            return "{Template Error}";
                        };
                        return error;
                    };
                    var _compile = function() {
                        exports.prototype = {
                            $render: exports.render,
                            $escape: function(content) {
                                return typeof content === "string" ? content.replace(/&(?![\w#]+;)|[<>"']/g, function(s) {
                                    return {
                                        "<": "&#60;",
                                        ">": "&#62;",
                                        '"': "&#34;",
                                        "'": "&#39;",
                                        "&": "&#38;"
                                    }[s];
                                }) : content;
                            },
                            $string: function(value) {
                                if (typeof value === "string" || typeof value === "number") {
                                    return value;
                                } else if (typeof value === "function") {
                                    return value();
                                } else {
                                    return "";
                                }
                            }
                        };
                        var arrayforEach = Array.prototype.forEach || function(block, thisObject) {
                            var len = this.length >>> 0;
                            for (var i = 0; i < len; i++) {
                                if (i in this) {
                                    block.call(thisObject, this[i], i, this);
                                }
                            }
                        };
                        var forEach = function(array, callback) {
                            arrayforEach.call(array, callback);
                        };
                        var KEYWORDS = "break,case,catch,continue,debugger,default,delete,do,else,false" + ",finally,for,function,if,in,instanceof,new,null,return,switch,this" + ",throw,true,try,typeof,var,void,while,with" + ",abstract,boolean,byte,char,class,const,double,enum,export,extends" + ",final,float,goto,implements,import,int,interface,long,native" + ",package,private,protected,public,short,static,super,synchronized" + ",throws,transient,volatile" + ",arguments,let,yield" + ",undefined";
                        var REMOVE_RE = /\/\*(?:.|\n)*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|'[^']*'|"[^"]*"|[\s\t\n]*\.[\s\t\n]*[$\w\.]+/g;
                        var SPLIT_RE = /[^\w$]+/g;
                        var KEYWORDS_RE = new RegExp([ "\\b" + KEYWORDS.replace(/,/g, "\\b|\\b") + "\\b" ].join("|"), "g");
                        var NUMBER_RE = /\b\d[^,]*/g;
                        var BOUNDARY_RE = /^,+|,+$/g;
                        var getVariable = function(code) {
                            code = code.replace(REMOVE_RE, "").replace(SPLIT_RE, ",").replace(KEYWORDS_RE, "").replace(NUMBER_RE, "").replace(BOUNDARY_RE, "");
                            code = code ? code.split(/,+/) : [];
                            return code;
                        };
                        return function(source, isDebug) {
                            var openTag = exports.openTag;
                            var closeTag = exports.closeTag;
                            var parser = exports.parser;
                            var code = source;
                            var tempCode = "";
                            var line = 1;
                            var uniq = {
                                $data: true,
                                $helpers: true,
                                $out: true,
                                $line: true
                            };
                            var helpers = exports.prototype;
                            var prototype = {};
                            var variables = "var $helpers=this," + (isDebug ? "$line=0," : "");
                            var isNewEngine = "".trim;
                            var replaces = isNewEngine ? [ "$out='';", "$out+=", ";", "$out" ] : [ "$out=[];", "$out.push(", ");", "$out.join('')" ];
                            var concat = isNewEngine ? "if(content!==undefined){$out+=content;return content}" : "$out.push(content);";
                            var print = "function(content){" + concat + "}";
                            var include = "function(id,data){" + "if(data===undefined){data=$data}" + "var content=$helpers.$render(id,data);" + concat + "}";
                            forEach(code.split(openTag), function(code, i) {
                                code = code.split(closeTag);
                                var $0 = code[0];
                                var $1 = code[1];
                                if (code.length === 1) {
                                    tempCode += html($0);
                                } else {
                                    tempCode += logic($0);
                                    if ($1) {
                                        tempCode += html($1);
                                    }
                                }
                            });
                            code = tempCode;
                            if (isDebug) {
                                code = "try{" + code + "}catch(e){" + "e.line=$line;" + "throw e" + "}";
                            }
                            code = "'use strict';" + variables + replaces[0] + code + "return new String(" + replaces[3] + ")";
                            try {
                                var Render = new Function("$data", code);
                                Render.prototype = prototype;
                                return Render;
                            } catch (e) {
                                e.temp = "function anonymous($data) {" + code + "}";
                                throw e;
                            }
                            function html(code) {
                                line += code.split(/\n/).length - 1;
                                if (exports.isCompress) {
                                    code = code.replace(/[\n\r\t\s]+/g, " ");
                                }
                                code = code.replace(/('|\\)/g, "\\$1").replace(/\r/g, "\\r").replace(/\n/g, "\\n");
                                code = replaces[1] + "'" + code + "'" + replaces[2];
                                return code + "\n";
                            }
                            function logic(code) {
                                var thisLine = line;
                                if (parser) {
                                    code = parser(code);
                                } else if (isDebug) {
                                    code = code.replace(/\n/g, function() {
                                        line++;
                                        return "$line=" + line + ";";
                                    });
                                }
                                if (code.indexOf("=") === 0) {
                                    var isEscape = code.indexOf("==") !== 0;
                                    code = code.replace(/^=*|[\s;]*$/g, "");
                                    if (isEscape && exports.isEscape) {
                                        var name = code.replace(/\s*\([^\)]+\)/, "");
                                        if (!helpers.hasOwnProperty(name) && !/^(include|print)$/.test(name)) {
                                            code = "$escape($string(" + code + "))";
                                        }
                                    } else {
                                        code = "$string(" + code + ")";
                                    }
                                    code = replaces[1] + code + replaces[2];
                                }
                                if (isDebug) {
                                    code = "$line=" + thisLine + ";" + code;
                                }
                                getKey(code);
                                return code + "\n";
                            }
                            function getKey(code) {
                                code = getVariable(code);
                                forEach(code, function(name) {
                                    if (!uniq.hasOwnProperty(name)) {
                                        setValue(name);
                                        uniq[name] = true;
                                    }
                                });
                            }
                            function setValue(name) {
                                var value;
                                if (name === "print") {
                                    value = print;
                                } else if (name === "include") {
                                    prototype["$render"] = helpers["$render"];
                                    value = include;
                                } else {
                                    value = "$data." + name;
                                    if (helpers.hasOwnProperty(name)) {
                                        prototype[name] = helpers[name];
                                        if (name.indexOf("$") === 0) {
                                            value = "$helpers." + name;
                                        } else {
                                            value = value + "===undefined?$helpers." + name + ":" + value;
                                        }
                                    }
                                }
                                variables += name + "=" + value + ",";
                            }
                        };
                    }();
                })(template, global);
                __mod__[__id__] = template;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/plugins/artTemplate", (_M_["platform/plugins/artTemplate"] = {}) && _M_);

_M_["platform/plugins/adCompatible"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var _ua = __mod__["platform/browser/ua"]();
                var _extend = __mod__["platform/object/extend"]();
                global.lib = global.lib || {};
                global.lib.swf = global.lib.swf || {};
                global.lib.swf.openAdPostWindow = function(url, data, name, debugTime) {
                    if (debugTime != undefined) {
                        var cTime = new Date();
                        data = data.replace('"ib":"' + debugTime + '"', '"ib":"' + String(cTime.getTime() + Number(debugTime)) + '"');
                    }
                    var tempForm = document.createElement("form");
                    tempForm.id = "tempForm";
                    tempForm.method = "post";
                    tempForm.action = url;
                    tempForm.target = "_blank";
                    var hideInput = document.createElement("input");
                    hideInput.type = "hidden";
                    hideInput.name = "data";
                    hideInput.value = data;
                    tempForm.appendChild(hideInput);
                    document.body.appendChild(tempForm);
                    tempForm.submit();
                    document.body.removeChild(tempForm);
                };
                global.lib.Mac = _ua.Mac;
                global.lib.box = global.lib.box || {
                    version: "1.0.0",
                    toString: function() {
                        return "[Object lib.box(version " + this.version + ")]";
                    }
                };
                _extend(global.lib.box, {
                    getDocumentHeight: function(context) {
                        context = context || window;
                        var doc = context.document;
                        var scrollHeight = doc.compatMode != "CSS1Compat" ? doc.body.scrollHeight : doc.documentElement.scrollHeight;
                        var h = Math.max(scrollHeight, this.getViewportHeight(context));
                        return h;
                    },
                    getDocumentWidth: function(context) {
                        context = context || window;
                        var doc = context.document;
                        var scrollWidth = doc.compatMode != "CSS1Compat" ? doc.body.scrollWidth : doc.documentElement.scrollWidth;
                        var w = Math.max(scrollWidth, this.getViewportWidth(context));
                        return w;
                    },
                    getViewportHeight: function(context) {
                        context = context || window;
                        var doc = context.document;
                        var de = doc.documentElement;
                        return context.innerHeight || de && de.clientHeight + (de.style.borderTopWidth == "" ? 0 : de.style.borderTopWidth) + (de.style.borderBottomWidth == "" ? 0 : de.style.borderBottomWidth) || doc.body.clientHeight;
                    },
                    getViewportWidth: function(context) {
                        context = context || window;
                        var doc = context.document;
                        var de = doc.documentElement;
                        return context.innerWidth || de && de.clientWidth + (de.style.borderLeftWidth == "" ? 0 : de.style.borderLeftWidth) + (de.style.borderRightWidth == "" ? 0 : de.style.borderRightWidth) || doc.body.clientWidth;
                    },
                    getPageScrollTop: function(context) {
                        context = context || window;
                        var doc = context.document;
                        var de = doc.documentElement;
                        return context.pageYOffset || de && de.scrollTop || doc.body.scrollTop;
                    },
                    getPageScrollLeft: function(context) {
                        context = context || window;
                        var doc = context.document;
                        var de = doc.documentElement;
                        return context.pageXOffset || de && de.scrollLeft || doc.body.scrollLeft;
                    },
                    getPosition: function(el) {
                        try {
                            var box = el.getBoundingClientRect();
                        } catch (e) {
                            lib.log("getPosition failed.");
                            return {
                                top: 9999,
                                left: 9999
                            };
                        }
                        var doc = el.ownerDocument, body = doc.body, html = doc.documentElement, clientTop = html.clientTop || body.clientTop || 0, clientLeft = html.clientLeft || body.clientLeft || 0, top = box.top + (self.pageYOffset || html.scrollTop || body.scrollTop) - clientTop, left = box.left + (self.pageXOffset || html.scrollLeft || body.scrollLeft) - clientLeft;
                        return {
                            top: top,
                            left: left
                        };
                    }
                });
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/plugins/adCompatible", (_M_["platform/plugins/adCompatible"] = {}) && _M_);

_M_["platform/plugins/pingbackCompatible"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                global.lib = global.lib || {};
                global.lib.swf = global.lib.swf || {};
                global.lib.swf.postServerUID = function(str) {
                    global.lib.qa_postServerUID = str;
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/plugins/pingbackCompatible", (_M_["platform/plugins/pingbackCompatible"] = {}) && _M_);

_M_["platform/plugins/clearSwfCompatible"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var global = __mod__["driver/global"]();
                var _clearSwf = __mod__["platform/plugins/clearSwf"]();
                global.lib = global.lib || {};
                global.lib.action = global.lib.action || {};
                global.lib.action.ClearSwf = global.lib.action.ClearSwf || {};
                global.lib.action.ClearSwf.get = function() {
                    return _clearSwf.get();
                };
                global.lib.action.ClearSwf.load = function() {};
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/plugins/clearSwfCompatible", (_M_["platform/plugins/clearSwfCompatible"] = {}) && _M_);

_M_["platform/flash/html"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _create = __mod__["platform/flash/create"]();
                var _list = __mod__["platform/flash/list"]();
                __mod__[__id__] = function(path, opts) {
                    if (!opts.container) {
                        throw "must need container!";
                    }
                    opts.id = opts.id || "swf_" + Date.now().toString(36);
                    var str = _create(path, opts);
                    opts.container.innerHTML = str;
                    setTimeout(function() {
                        _list.set(opts.id);
                    }, 0);
                    return opts.id;
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/flash/html", (_M_["platform/flash/html"] = {}) && _M_);

_M_["platform/flash/remove"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _list = __mod__["platform/flash/list"]();
                var _ua = __mod__["platform/browser/ua"]();
                var remove = function(id) {
                    var obj = _list.get(id);
                    if (obj && obj.nodeName.toLowerCase() == "object") {
                        obj.style.display = "none";
                        if (_ua.IE) {
                            (function() {
                                if (obj.readyState == 4 || obj.readyState == "complete") {
                                    for (var i in obj) {
                                        if (typeof obj[i] == "function") {
                                            obj[i] = null;
                                        }
                                    }
                                    _list.remove(id);
                                    if (obj.parentNode) {
                                        obj.parentNode.removeChild(obj);
                                    }
                                } else {
                                    setTimeout(arguments.callee, 10);
                                }
                            })();
                        } else {
                            _list.remove(id);
                            if (obj.parentNode) {
                                obj.parentNode.removeChild(obj);
                            }
                        }
                    }
                };
                __mod__[__id__] = remove;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/flash/remove", (_M_["platform/flash/remove"] = {}) && _M_);

_M_["platform/flash/write"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _create = __mod__["platform/flash/create"]();
                var _list = __mod__["platform/flash/list"]();
                __mod__[__id__] = function(path, opts) {
                    opts.id = opts.id || "swf_" + Date.now().toString(36);
                    var str = _create(path, opts);
                    document.write(str);
                    setTimeout(function() {
                        _list.set(opts.id);
                    }, 0);
                    return opts.id;
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/flash/write", (_M_["platform/flash/write"] = {}) && _M_);

_M_["platform/cookie/remove"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var setRaw = __mod__["platform/cookie/setRaw"]();
                var remove = function(key, options) {
                    options = options || {};
                    options.expires = new Date(0);
                    setRaw(key, "", options);
                };
                __mod__[__id__] = remove;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/cookie/remove", (_M_["platform/cookie/remove"] = {}) && _M_);

_M_["platform/log/server"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var defaultUrl = location.protocol + "//jsmsg.video.qiyi.com/m.gif";
                var serverLogimgList = {};
                var server = function(param, options) {
                    var url = defaultUrl;
                    if (typeof options == "string") {
                        url = options;
                        options = null;
                    }
                    options = options || {
                        cache: false
                    };
                    if (options.url) {
                        url = options.url;
                    }
                    if (param) {
                        var img = new Image();
                        var key = "slog_" + Math.floor(Math.random() * 2147483648).toString(36);
                        serverLogimgList[key] = img;
                        img.onload = img.onerror = img.onabort = function() {
                            img.onload = img.onerror = img.onabort = null;
                            serverLogimgList[key] = null;
                            delete serverLogimgList[key];
                            img = null;
                        };
                        var params = [];
                        if (options.cache === false) {
                            param._ = Math.round(Math.random() * 2147483647);
                        }
                        for (var pname in param) {
                            params.push(pname + "=" + encodeURIComponent(param[pname]));
                        }
                        try {
                            img.src = url + "?" + params.join("&");
                        } catch (e) {}
                    }
                };
                __mod__[__id__] = server;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/log/server", (_M_["platform/log/server"] = {}) && _M_);

_M_["platform/log/log"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var log = function() {
                    if (window.console) {}
                };
                __mod__[__id__] = log;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/log/log", (_M_["platform/log/log"] = {}) && _M_);

_M_["platform/anim/create"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var Class = __mod__["platform/class"]();
                var $ = __mod__["platform/dollar"]();
                var element = __mod__["platform/element/element"]();
                var extend = __mod__["platform/object/extend"]();
                var emptyMethod = __mod__["platform/fn/emptyMethod"]();
                var tween = __mod__["platform/anim/tween"]();
                var isArray = __mod__["platform/array/isArray"]();
                var Anim = Class("Anim", {
                    construct: function(options) {
                        this.opt = extend({
                            duration: 1e3,
                            onStart: emptyMethod,
                            onDone: emptyMethod,
                            onCompute: emptyMethod,
                            interval: 10,
                            ease: "",
                            els: null
                        }, options || {});
                        this.ease();
                        for (var i = 0, l = this.opt.els.length; i < l; i++) {
                            if (!element.isElement(this.opt.els[i])) {
                                throw new Error("all element must be isElement");
                            }
                        }
                        this.els = this.opt.els;
                        this.info = {};
                    },
                    properties: {
                        counter: 0
                    },
                    methods: {
                        getAnim: function(len, from, to) {
                            var temp = [];
                            for (var i = 0; i < len; i++) {
                                temp.push(this.tweenFunc(i, from, to, len));
                            }
                            return temp;
                        },
                        getAnimInfo: function() {
                            this.interval = this.opt.duration / this.opt.interval;
                            var info = null;
                            for (var o in this.info) {
                                if (this.info[o].from == undefined) {
                                    this.info[o].from = this.getDefaultFrom(this.els[0], o);
                                }
                                if (o == "opacity") {
                                    this.info[o].unit = "";
                                } else {
                                    this.info[o].unit = "px";
                                }
                                this.info[o].animArray = this.getAnim(this.interval, this.info[o].from, this.info[o].to - this.info[o].from);
                            }
                        },
                        getDefaultFrom: function(el, type) {
                            return parseInt(el.css(type)) || 0;
                        },
                        onCompute: function() {
                            for (var o in this.info) {
                                for (var i = 0, l = this.els.length; i < l; i++) {
                                    this.els[i].css(o, this.info[o].animArray[this.counter] + this.info[o].unit);
                                }
                            }
                            this.counter++;
                        },
                        compute: function() {
                            if (this.counter >= this.interval) {
                                clearTimeout(this.iTimer);
                                this.done();
                                this.counter = 0;
                                return;
                            }
                            this.onCompute();
                            this.iTimer = setTimeout(function() {
                                this.compute();
                            }.bind(this), this.opt.interval);
                        },
                        ease: function(ease) {
                            if (!ease) {
                                this.tweenFunc = tween.Linear;
                                return this;
                            }
                            var type = ease.split(".");
                            if (type.length != 2) {
                                this.tweenFunc = tween.Linear;
                            } else {
                                this.tweenFunc = tween[type[0]][type[1]];
                            }
                            return this;
                        },
                        duration: function(duration) {
                            this.opt.duration = duration;
                            return this;
                        },
                        delay: function(interval) {
                            this.opt.interval = interval;
                            return this;
                        },
                        done: function() {
                            for (var o in this.info) {
                                for (var i = 0, l = this.els.length; i < l; i++) {
                                    this.els[i].css(o, this.info[o].to + this.info[o].unit);
                                }
                            }
                            this.info = {};
                            if (this.opt.onDone) this.opt.onDone();
                        },
                        from: function(type, number) {
                            if (!this.info[type]) {
                                this.info[type] = {};
                            }
                            this.info[type].from = number;
                            return this;
                        },
                        to: function(type, number) {
                            if (!this.info[type]) {
                                this.info[type] = {};
                            }
                            this.info[type].to = number;
                            return this;
                        },
                        go: function() {
                            this.getAnimInfo();
                            this.inAnim = true;
                            if (this.iTimer) {
                                clearTimeout(this.iTimer);
                            }
                            this.compute();
                            return this;
                        },
                        stop: function() {
                            this.pause();
                            this.counter = 0;
                            return this;
                        },
                        pause: function() {
                            if (this.inAnim) {
                                clearTimeout(this.iTimer);
                            }
                            this.getAnimInfo();
                            return this;
                        },
                        resume: function() {
                            this.compute();
                        },
                        onDone: function(func) {
                            this.opt.onDone = func;
                            return this;
                        }
                    }
                });
                __mod__[__id__] = function(els, opt) {
                    return new Anim({
                        els: isArray(els) ? els : [ els ]
                    });
                };
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/anim/create", (_M_["platform/anim/create"] = {}) && _M_);

_M_["platform/dollar"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var _$ = __mod__["jquery/cmd/sizzle"]();
                var _Element = __mod__["platform/element/element"]();
                var isWindow = function(win) {
                    return win && typeof win === "object" && "setInterval" in win;
                };
                var init = function(selector, context) {
                    if (!selector) {
                        return null;
                    }
                    if (_Element.isElement(selector)) {
                        return selector;
                    }
                    if (typeof selector === "string") {
                        var ele = _$(selector, context);
                        if (ele.length > 0) {
                            return new _Element(ele);
                        } else {
                            return null;
                        }
                    } else if (selector.nodeType === 9 || selector.nodeType === 1 || isWindow(selector)) {
                        return new _Element([ selector ]);
                    }
                    return null;
                };
                __mod__[__id__] = init;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/dollar", (_M_["platform/dollar"] = {}) && _M_);

_M_["platform/anim/tween"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var tween = {
                    Linear: function(t, b, c, d) {
                        return c * t / d + b;
                    },
                    Quad: {
                        easeIn: function(t, b, c, d) {
                            return c * (t /= d) * t + b;
                        },
                        easeOut: function(t, b, c, d) {
                            return -c * (t /= d) * (t - 2) + b;
                        },
                        easeInOut: function(t, b, c, d) {
                            if ((t /= d / 2) < 1) return c / 2 * t * t + b;
                            return -c / 2 * (--t * (t - 2) - 1) + b;
                        }
                    },
                    Cubic: {
                        easeIn: function(t, b, c, d) {
                            return c * (t /= d) * t * t + b;
                        },
                        easeOut: function(t, b, c, d) {
                            return c * ((t = t / d - 1) * t * t + 1) + b;
                        },
                        easeInOut: function(t, b, c, d) {
                            if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
                            return c / 2 * ((t -= 2) * t * t + 2) + b;
                        }
                    },
                    Quart: {
                        easeIn: function(t, b, c, d) {
                            return c * (t /= d) * t * t * t + b;
                        },
                        easeOut: function(t, b, c, d) {
                            return -c * ((t = t / d - 1) * t * t * t - 1) + b;
                        },
                        easeInOut: function(t, b, c, d) {
                            if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
                            return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
                        }
                    },
                    Quint: {
                        easeIn: function(t, b, c, d) {
                            return c * (t /= d) * t * t * t * t + b;
                        },
                        easeOut: function(t, b, c, d) {
                            return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
                        },
                        easeInOut: function(t, b, c, d) {
                            if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
                            return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
                        }
                    },
                    Sine: {
                        easeIn: function(t, b, c, d) {
                            return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
                        },
                        easeOut: function(t, b, c, d) {
                            return c * Math.sin(t / d * (Math.PI / 2)) + b;
                        },
                        easeInOut: function(t, b, c, d) {
                            return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
                        }
                    },
                    Expo: {
                        easeIn: function(t, b, c, d) {
                            return t == 0 ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
                        },
                        easeOut: function(t, b, c, d) {
                            return t == d ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
                        },
                        easeInOut: function(t, b, c, d) {
                            if (t == 0) return b;
                            if (t == d) return b + c;
                            if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
                            return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
                        }
                    },
                    Circ: {
                        easeIn: function(t, b, c, d) {
                            return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
                        },
                        easeOut: function(t, b, c, d) {
                            return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
                        },
                        easeInOut: function(t, b, c, d) {
                            if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
                            return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
                        }
                    },
                    Elastic: {
                        easeIn: function(t, b, c, d, a, p) {
                            if (t == 0) return b;
                            if ((t /= d) == 1) return b + c;
                            if (!p) p = d * .3;
                            if (!a || a < Math.abs(c)) {
                                a = c;
                                var s = p / 4;
                            } else var s = p / (2 * Math.PI) * Math.asin(c / a);
                            return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * 2 * Math.PI / p)) + b;
                        },
                        easeOut: function(t, b, c, d, a, p) {
                            if (t == 0) return b;
                            if ((t /= d) == 1) return b + c;
                            if (!p) p = d * .3;
                            if (!a || a < Math.abs(c)) {
                                a = c;
                                var s = p / 4;
                            } else var s = p / (2 * Math.PI) * Math.asin(c / a);
                            return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * 2 * Math.PI / p) + c + b;
                        },
                        easeInOut: function(t, b, c, d, a, p) {
                            if (t == 0) return b;
                            if ((t /= d / 2) == 2) return b + c;
                            if (!p) p = d * .3 * 1.5;
                            if (!a || a < Math.abs(c)) {
                                a = c;
                                var s = p / 4;
                            } else var s = p / (2 * Math.PI) * Math.asin(c / a);
                            if (t < 1) return -.5 * a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * 2 * Math.PI / p) + b;
                            return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * 2 * Math.PI / p) * .5 + c + b;
                        }
                    },
                    Back: {
                        easeIn: function(t, b, c, d, s) {
                            if (s == undefined) s = 1.70158;
                            return c * (t /= d) * t * ((s + 1) * t - s) + b;
                        },
                        easeOut: function(t, b, c, d, s) {
                            if (s == undefined) s = 1.70158;
                            return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
                        },
                        easeInOut: function(t, b, c, d, s) {
                            if (s == undefined) s = 1.70158;
                            if ((t /= d / 2) < 1) return c / 2 * t * t * (((s *= 1.525) + 1) * t - s) + b;
                            return c / 2 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2) + b;
                        }
                    },
                    Bounce: {
                        easeIn: function(t, b, c, d) {
                            return c - tween.Bounce.easeOut(d - t, 0, c, d) + b;
                        },
                        easeOut: function(t, b, c, d) {
                            if ((t /= d) < 1 / 2.75) {
                                return c * 7.5625 * t * t + b;
                            } else if (t < 2 / 2.75) {
                                return c * (7.5625 * (t -= 1.5 / 2.75) * t + .75) + b;
                            } else if (t < 2.5 / 2.75) {
                                return c * (7.5625 * (t -= 2.25 / 2.75) * t + .9375) + b;
                            } else {
                                return c * (7.5625 * (t -= 2.625 / 2.75) * t + .984375) + b;
                            }
                        },
                        easeInOut: function(t, b, c, d) {
                            if (t < d / 2) return tween.Bounce.easeIn(t * 2, 0, c, d) * .5 + b; else return tween.Bounce.easeOut(t * 2 - d, 0, c, d) * .5 + c * .5 + b;
                        }
                    }
                };
                __mod__[__id__] = tween;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/anim/tween", (_M_["platform/anim/tween"] = {}) && _M_);

_M_["platform/browser/supportFixed"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var ua = __mod__["platform/browser/ua"]();
                var suppordFixed = ua.ios && parseFloat(ua.version) >= 5 || ua.android && parseFloat(ua.version) > 2.1;
                __mod__[__id__] = suppordFixed;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/browser/supportFixed", (_M_["platform/browser/supportFixed"] = {}) && _M_);

_M_["platform/browser/getOS"] = function(id, module) {
    return function() {
        if (!module[id].executed) {
            var exports = function(__id__, __mod__) {
                var getOS = function() {
                    var sUserAgent = navigator.userAgent;
                    var isWin = /win/i.test(navigator.platform);
                    var isMac = /mac/i.test(navigator.platform);
                    if (isMac) {
                        return "Mac";
                    }
                    var isUnix = navigator.platform == "X11" && !isWin && !isMac;
                    if (isUnix) {
                        return "Unix";
                    }
                    if (isWin) {
                        var isWin2K = sUserAgent.indexOf("Windows NT 5.0") > -1 || sUserAgent.indexOf("Windows 2000") > -1;
                        if (isWin2K) {
                            return "Win2000";
                        }
                        var isWinXP = sUserAgent.indexOf("Windows NT 5.1") > -1 || sUserAgent.indexOf("Windows XP") > -1;
                        if (isWinXP) {
                            return "WinXP";
                        }
                        var isWin2003 = sUserAgent.indexOf("Windows NT 5.2") > -1 || sUserAgent.indexOf("Windows 2003") > -1;
                        if (isWin2003) {
                            return "Win2003";
                        }
                        var isWinVista = sUserAgent.indexOf("Windows NT 6.0") > -1 || sUserAgent.indexOf("Windows Vista") > -1;
                        if (isWinVista) {
                            return "WinVista";
                        }
                        var isWin7 = sUserAgent.indexOf("Windows NT 6.1") > -1 || sUserAgent.indexOf("Windows 7") > -1;
                        if (isWin7) {
                            return "Win7";
                        }
                        return "Win";
                    }
                    return "None";
                };
                __mod__[__id__] = getOS;
            }(id, module);
            if (exports == undefined) {
                exports = module[id];
            }
            module[id] = function() {
                return exports;
            };
            module[id].executed = true;
        }
        return module[id]();
    };
}("platform/browser/getOS", (_M_["platform/browser/getOS"] = {}) && _M_);

if (typeof define !== "undefined") {
    define("lib", [], function(require, exports, module) {
        module.exports = _M_["lib"]();
    });
}

_M_["lib"]();
//Qiyi plugin
(function(host, global) {
    global.Qiyi = global.Qiyi || {};
    var backupQ = global.Q;
    var Q = global.Q = global.Qiyi;

    //20150708: 由于seamJS2.1版本未更新1.2版本中的一个issue（firstModuleInPackage）,因此需要下面临时解决方案。广告同学会检测下值。
    define.isQiyi = true;

    //hack 解决IE下面不支持自定义标签（会自动闭合，不匹配闭合标签）的问题，qchunk为点击地图所需自定义元素
    try{
        document.createElement("qchunk");
    }catch(e){
    }

    var siteDomain = (function(w){
        var domainLevel = 2;
        var domains = w.location.hostname.split(".");
        domains = domains.slice(domains.length - domainLevel);
        return domains.join(".");
    })(global);

    Q.siteDomain = siteDomain;

    try{
        global.document.domain = siteDomain;
    }catch(e){}

    //生成videoevent
    Q.videoEventID = global.videoEventID = (function(){
        return Q.crypto.md5(+(new Date())+ Math.round(Math.random() * 2147483647)+ '');
    })();
    Q.getVideoEventID = global.getVideoEventID = function(){
        Q.videoEventID = global.videoEventID = Q.crypto.md5(+(new Date())+
            Math.round(Math.random() * 2147483647)+ '');
    };
    //生成webevent
    Q.webEventID = global.webEventID = (function(){
        return Q.crypto.md5(+(new Date())+ Math.round(Math.random() * 2147483647)+ '');
    })();

    //START----------页面的性能统计pingback代码开始-----------------START//
    var perf = {},
        perfCookieKey = "TQC002",
        perfCookieOptions = {
            domain: ".iqiyi.com",
            path: "/",
            expire: 365 * 24 * 3600 * 1000
        },
        performanceLog,
        lastPerformanceLog = Q.cookie.get(perfCookieKey);

    var perfKeyMap = {
        "coreReady":"tm1",
        "playerReady": "tm2",
        "clearPluginReady": "tm3",
        "playerAuthReady": "tm4",
        "domReady": "tm5",
        "resourceReady": "tm6",
        "jobLoadReady": "tm7",
        "jobCheckReady": "tm8",
        "jobInitReady":"tm9",
        "jobExecReady": "tm10",
        "qaLoadReady": "tm11",
        "comscoreLoadReady": "tm13",
        "playIfRes":"tm14",
        "adIfRes":"tm15"
    };
    var startedKeyMap = {};
    var addedKeyMap = {}; //记录已经added的key，已经added的不能重复add
    var perfKeys = ["tm1", "tm2", "tm3", "tm4", "tm5", "tm6", "tm7", "tm8", "tm9",
        "tm10", "tm11","tm13","tm14","tm15"];
    var remainingPerfKeys;

    perf.queryToJson = function(query){
        var params = query.split("&"),
            len = params.length,
            result = {},
            i = 0, key, value, item, param;
        for (;i < len; i++) {
            if (!params[i]) {
                continue;
            }
            param = params[i].split("=");
            key = param.shift();
            value = param.join("=");
            item = result[key];
            if ("undefined" == typeof item) {
                result[key] = value;
            } else if (Q.array.isArray(item)) {
                item.push(value);
            } else {
                result[key] = [ item, value ];
            }
        }
        return result;
    };
    perf.jsonToQuery = Q.url.jsonToQuery;

    perf.get = function(key){
        if(key){
            key = perfKeyMap[key] || key;
            return performanceLog && performanceLog[key];
        }
        return performanceLog;
    };
    perf.send = function(query){
        var img = new Image();
        img.onload = function(){
            img.onload = null;
            img = null;
        };
        img.src = '//msg.qy.net/tmpstats.gif?' + query + "&_=" + (+new Date());
    };
    perf.QOEWhiteList = {
        '//www.iqiyi.com/': true,
        '//www.iqiyi.com/dianshiju/': true,
        '//www.iqiyi.com/dianying/': true,
        '//vip.iqiyi.com/': true
    };
    perf.QOEWhitePGC = '//www.iqiyi.com/v_[a-z0-9]+.html';//http://www.iqiyi.com/v_19rrlt6iw8.html
    perf.QOEWhiteUGC = '//www.iqiyi.com/w_[a-z0-9]+.html';//http://www.iqiyi.com/w_19rt378555.html
    
    //检查是否需要发送QOE统计
    perf.checkQOE = function(performanceLog){
        var _purl = performanceLog.purl;
        if(!_purl){
            return false;
        }
        var _index = _purl.indexOf('?');
        _purl = _index > 0 ? _purl.substring(0, _index) : _purl;
        var _m = _purl.match(perf.QOEWhitePGC);
        if(!perf.QOEWhiteList[_purl] && !_m){
            return false;
        }
        //得到一个随机数，取值范围为[0~100）。取1/100的量来做QOE统计。
        return Math.round(Math.random()*100) == 5;
    };
    perf.sendQOEPingback = function(performanceLog){
        var plog = performanceLog;
        var qoeParam = [
            // 'type=qoe',
            // 'pla=' + (plog.pla || ""), //平台：pcweb发11，h5发22
            //'uid=' + (plog.uid || ""), //匿名用户id
            //'ppuid=' + (plog.ppuid || ""),//登录用户id
            // 'brs=' + (plog.brs || ""),
            'groupname=www_page_' + (Q.PageInfo.jobName || plog.purl)//页面类型
            // 'purl=' + (plog.purl || "")//页面url
        ];
        var performance = window.performance;
        if (!performance) {
            return;
        }
        var timing = performance.timing;
        if (!timing) {
            return;
        }
        var delta = function(prop){
            var val = timing[prop];
            if(val && !isNaN(val)){
                return val - timing.navigationStart;
            }
            return 0;
        };
        qoeParam.push('htmlloaded=' + delta('responseStart'));//文档加载完成时间
        qoeParam.push('lib=' + plog.tm1.split(',')[0]);//lib文件加载时间
        qoeParam.push('jobloaded=' + plog.tm7.split(',')[0]);//job文件加载时间
        qoeParam.push('qa=' + plog.tm11.split(',')[0]);//qa文件加载时间
        qoeParam.push('comscore=' + plog.tm13.split(',')[0]);//comscore文件加载时间
        // qoeParam.push('hm=');//hm文件加载时间
        // qoeParam.push('iwt=');//iwt文件加载时间
        qoeParam.push('jobcheck=' + plog.tm8.split(',')[0]);//job文件逻辑检查时间
        qoeParam.push('jobinit=' + plog.tm9.split(',')[0]);//job文件初始化时间
        qoeParam.push('jobexe=' + plog.tm10.split(',')[0]);//job文件执行时间

        var img = new Image();
        img.onload = function(){
            img.onload = null;
            img = null;
        };
        img.src = '//activity.m.iqiyi.com/qoe.gif?' + qoeParam.join('&') + "&_=" + (+new Date());
    };
    perf.init = function(){
        perf.lastPerformanceLog = performanceLog || lastPerformanceLog;
        performanceLog = {};
        performanceLog.type = "jspfmc140109";
        performanceLog.pla = '';
        if(siteDomain.match(/pps/)){
            performanceLog.pla = '20';
        }
        if(Q.browser && Q.browser.iPad){
            performanceLog.pla += "21";
        }else{
            performanceLog.pla += "11";
        }
        perf.perfStart = global.__qlt && global.__qlt.statisticsStart || +new Date();
        performanceLog.uid = Q.cookie.get("QC005") || Q.cookie.get("QC006") || "";
        performanceLog.ppuid = Q.cookie.get("P00003") || "";
        performanceLog.brs = (function(){
            var brs = ["IE6", "IE7", "IE8", "IE9", "IE10", "IE11", "IE", "CHROME", "SAFARI",
             "OPERA", "ff"];
            for(var i = 0, ilen = brs.length; i < ilen; i++){
                if(Q.browser[brs[i]] === true){
                    return brs[i];
                }
            }
            return navigator.userAgent;
        })();
        if(global.__qlt){
            global.__qlt.brs = performanceLog.brs || "";
        }

        performanceLog.pgtype = global.__qlt && global.__qlt.pgtype || "";// TODO cms

        var i = location.href.indexOf("#");
        performanceLog.purl = i == -1 ? location.href : location.href.substring(0, i);
        performanceLog.cid = global.__qlt && global.__qlt.cid || "";//频道id，cms
        performanceLog.tmplt = global.__qlt && global.__qlt.tmplt || ""; //模板字段
        if(Q.browser && Q.browser.iPad){
            perfKeys.splice(perfKeys.indexOf("tm3"), 1);//pad不需要clearSwf
        }
        // 影视大全各频道页type
        var ys_p = [
            'ysdq-hm',    //影视大全首页
            'ysdq-cnl',   //影视大全频道首页
            'ysdq-lst',   //影视大全list页
            'ysdq-alb',   //影视大全专辑页
            'ysdq-str'    //影视大全明星页
        ];
        if(performanceLog.pgtype == "home" || performanceLog.pgtype == "index"){//频道首页不需要播放器ready，不需要鉴权
            perfKeys.splice(perfKeys.indexOf("tm2"), 1);
            perfKeys.splice(perfKeys.indexOf("tm4"), 1);
            perfKeys.splice(perfKeys.indexOf("tm5"), 1);
            perfKeys.splice(perfKeys.indexOf("tm14"), 1);
            perfKeys.splice(perfKeys.indexOf("tm15"), 1);
        }else if(performanceLog.pgtype == "play"){
            if(!Q.browser.iPad){//只有pad 上的播放页 需要鉴权
                perfKeys.splice(perfKeys.indexOf("tm4"), 1);
                perfKeys.splice(perfKeys.indexOf("tm5"), 1);
                perfKeys.splice(perfKeys.indexOf("tm14"), 1);
                perfKeys.splice(perfKeys.indexOf("tm15"), 1);
            }
        } else if (ys_p.indexOf(performanceLog.pgtype) != -1){
            // 影视大全性能统计
            perfKeys.splice(perfKeys.indexOf("tm2"), 1);
            perfKeys.splice(perfKeys.indexOf("tm4"), 1);
            perfKeys.splice(perfKeys.indexOf("tm13"), 1);
            perfKeys.splice(perfKeys.indexOf("tm14"), 1);
            perfKeys.splice(perfKeys.indexOf("tm15"), 1);
        }
        remainingPerfKeys = perfKeys.length;
        //把perf和performanceLog挂到window.__qlt命名空间上
        if(global.__qlt){
            global.__qlt.performanceLog = performanceLog;
            for(var p in perf){
                if(perf.hasOwnProperty(p)){
                    global.__qlt[p] = perf[p];
                }
            }
            var savePerfLogToCookie = function(e){
                if(remainingPerfKeys > 0 && performanceLog){
                    Q.cookie.set(perfCookieKey, perf.jsonToQuery(performanceLog), perfCookieOptions);
                }
            };
            if(Q.browser && Q.browser.iPad){//pad的safari没有onbeforeunload事件
                Q.$(window).on("unload", savePerfLogToCookie);
            }else{
                Q.$(window).on("beforeunload", savePerfLogToCookie);
            }
        }
    };

    perf.clear = function(){
        Q.cookie.remove(perfCookieKey, {domain: perfCookieOptions.domain, path: perfCookieOptions.path});
    };

    perf.start = function(key){
        if(!key){
            return;
        }
        key = perfKeyMap[key] || key;
        if(startedKeyMap[key]){
            return;
        }
        startedKeyMap[key] = true;
        performanceLog[key] = +new Date() - perf.perfStart;
        
    };

    perf.end = function(key){
        if(!key){
            return;
        }
        var endTimestamp = +new Date() - perf.perfStart,
            mappedKey = perfKeyMap[key],
            startTimestamp = mappedKey && performanceLog[mappedKey];
        if(mappedKey && startTimestamp){
            delete performanceLog[mappedKey];//此时mappedKey存的是startTimestamp,把他先删掉再添加
        }else{
            startTimestamp = performanceLog[key];
        }

        var val;
        if(startTimestamp){
            val = endTimestamp - startTimestamp;
            val = val + "," + startTimestamp;
        }else{
            val = endTimestamp + "";
        }

        perf.add(key, val);
        
    };

    perf.add = function(key, val){
        if(addedKeyMap[key]) {
            return;
        }
        addedKeyMap[key] = true;

        if(!key){
            return;
        }

        try{
            var mappedKey = perfKeyMap[key];
            var checkRemaining = false;
            if(mappedKey && !performanceLog[mappedKey]){
                remainingPerfKeys--;
                checkRemaining = true;
            }
            mappedKey = mappedKey || key;
            if(!val){
                val = (+new Date()) - perf.perfStart;
                val = val + ",0";
            }
            performanceLog[mappedKey] = val;
            if(checkRemaining && remainingPerfKeys === 0){
                perf.send(perf.jsonToQuery(performanceLog));
                //QOE项目，目前仅针对大首页发送QOE统计 @zhengwen
                if(perf.checkQOE(performanceLog)){
                    perf.sendQOEPingback(performanceLog);
                }
                
                perf.clear();
                if(window.__qlt){
                    window.__qlt.lastPerformanceLog = lastPerformanceLog = performanceLog;
                    window.__qlt.performanceLog = performanceLog = {};
                }
            }
        }catch(e){
            if(global.console){
                global.console.error(e);
            }
        }
        
    };

    //一上来先检查上一个页面的performanceLog,发送到服务器，清空，并初始化当前页面的performanceLog
    (function checkLastPerformenceLog(){
        if(lastPerformanceLog){
            try{
                perf.send(lastPerformanceLog);
            }catch(e){
                lastPerformanceLog = e;
                if(global.console && global.console.error){
                    global.console.error(e);
                }
            }
        }
        perf.clear();
        if(!global.__qlt){
            return;
        }
        perf.init();
        //START-------- W3C Navigation Timing pingback代码开始 -------START//
        if(!window.performance || !window.addEventListener){
            return;
        }
        window.addEventListener("load", function () {
            window.setTimeout(function () {
                var performance = window.performance;
                if (!performance) {
                    return;
                }
                var timing = performance.timing;
                if (!timing) {
                    return;
                }
                try {
                    //@note by liuyongsheng 2015-01-05
                    //wiki http://wiki.qiyi.domain/pages/viewpage.action?pageId=18423355
                    var plog = performanceLog;
                    if(!performanceLog.purl){
                        plog = lastPerformanceLog;
                    }
                    var param = [
                        'type=jspfmc150104',
                        'pla=' + (plog.pla || ""),
                        'uid=' + (plog.uid || ""),
                        'ppuid=' + (plog.ppuid || ""),
                        'brs=' + (plog.brs || ""),
                        'pgtype=' + (plog.pgtype || ""),
                        'purl=' + (plog.purl || ""),
                        'cid=' + (plog.cid || ""),
                        'tmplt=' + (plog.tmplt || "")
                    ];
                    
                    var delta = function(prop){
                        var val = timing[prop];
                        if(val && !isNaN(val)){
                            return val - timing.navigationStart;
                        }
                        return 0;
                    };
                    var tms = [
                        'tm1=' + delta('unloadEventStart'),
                        'tm2=' + delta('unloadEventEnd'),
                        'tm3=' + delta('redirectStart'),
                        'tm4=' + delta('redirectEnd'),
                        'tm5=' + delta('fetchStart'),
                        'tm6=' + delta('domainLookupStart'),
                        'tm7=' + delta('domainLookupEnd'),
                        'tm8=' + delta('connectStart'),
                        'tm9=' + delta('connectEnd'),
                        'tm10=' + delta('secureConnectionStart'),
                        'tm11=' + delta('requestStart'),
                        'tm12=' + delta('responseStart'),
                        'tm13=' + delta('responseEnd'),
                        'tm14=' + delta('domLoading'),
                        'tm15=' + delta('domInteractive'),
                        'tm16=' + delta('domContentLoadedEventStart'),
                        'tm17=' + delta('domContentLoadedEventEnd'),
                        'tm18=' + delta('domComplete'),
                        'tm19=' + delta('loadEventStart'),
                        'tm20=' + delta('loadEventEnd')
                    ];
                    param = param.concat(tms);
                    perf.send(param.join("&"));
                    perf.clear();
                } catch (e) {
                }
            }, 1);
        }, false);
        //END  -------- W3C Navigation Timing pingback代码结束 -------END  //
    })();//end of checkLastPerformenceLog

    //END-----------页面的性能统计pingback代码结束------------------------END//
    var verurl, liburl, protocol = window.location.protocol;
    if(protocol === "file:"){
        protocol = "http:";//方便本地文件系统中打开页面时，js能正确加载
    }
    Q.noConflict = function() {
        global.Q = backupQ;
    };
    Q.libReady = function(callback) {
        liburl = Q.liburl || (protocol + '//static.iqiyi.com/js/lib/lib');
        callback();
    };
    Q.PageInfo = {};
    var targets = ['onload','domready','jsloaded','jobdone'];
    var lefts = ['onload','domready','jsloaded','jobdone'];
    var loadtime = {};
    var serverLogimgList = {};
    Q.LoadTime = {
        add:function(data){
            if(typeof data == 'string'){
                targets[data] = true;
                lefts[data] = true;
            }
            else if(Q.array.isArray(data)){
                data.forEach(function(name){
                    if(targets.indexOf(name) == -1){
                        targets.push(name);
                        lefts.push(name);
                    }
                });
            }
        },
        reset:function(arr){
            //可以用定制的指标数组覆盖默认指标数组
            arr = arr || targets;
            lefts = [];
            loadtime = {};
            lefts = lefts.concat(arr);
        },
        loaded:function(name){
            var index = lefts.indexOf(name);
            if(index != -1 && Q.PageInfo && Q.PageInfo.page_begin){
                var time = new Date();
                loadtime[name] = time - Q.PageInfo.page_begin;
                lefts.splice(index,1);
            }
            if(lefts.length === 0){
                this._log(loadtime);
            }
        },
        _log:function(param){
            //暂时只发手机端数据
            if(Q.browser && (Q.browser.WP || Q.browser.android || Q.browser.iPhone)){
                var url = '//msg.qy.net/b';
                if(param){
                    param.t = '11';
                    param.ct = 'h5inttest';
                    param.pf = '2';
                    param.p = '20';
                    param.p1 = '201';
                    var pmap = {
                        'domready':'tm1',
                        'onload':'tm2',
                        'jsloaded':'tm3',
                        'jobdone':'tm4'
                    };
                    var img = new Image();
                    var key = 'slog_' + Math.floor(Math.random() * 2147483648).toString(36);
                    serverLogimgList[key] = img;
                    img.onload = img.onerror = img.onabort = function(){
                        img.onload = img.onerror = img.onabort = null;
                        serverLogimgList[key] = null;
                        delete serverLogimgList[key];
                        img = null;
                    };
                    var params = [];
                    param.rn = Math.round(Math.random() * 2147483647);
                    for(var pname in param){
                        var pvalue = param[pname];
                        if(pmap[pname]){
                            pname = pmap[pname];
                        }
                        params.push(pname + '=' + encodeURIComponent(pvalue));
                    }
                    img.src = url + '?' + params.join('&');
                }
            }
        }
    };
    Q.loadTemplate = function(){};
    Q.load = function(jobName, callback, jobVersion) {
        var projectName = Q.projectName || '';
        var rnd = parseInt(Math.random()*1E10,10).toString(36);
        var _version = typeof callback === "string" ? callback : jobVersion;
        var verurl = Q.verurl || (protocol + '//static.iqiyi.com/js/' + Q.projectName + '/' + jobName + '_ver' + 
            (_version ? ("." + _version) : "") + '.js?' + rnd);
        if(!projectName) {
            throw new Error('未指定projectName');
        }
        seajs.config({
            base: protocol + '//static.iqiyi.com/js/' + projectName
        });
        Q.libReady(function(lib) {
            if(window.__qlt && window.__qlt.start){
                window.__qlt.start("jobLoadReady");
            }
            seajs.use(verurl, function(ver) {
                var loadJobExist = ver && ver.loadJob && (typeof ver.loadJob == "function");
                if(loadJobExist){
                    ver.loadJob(jobName, function(pageJob) {
                        if(!pageJob){
                            Q.http.json('//static.iqiyi.com/server_id', {
                                "data": {},
                                "method": "GET",
                                "dataType": "jsonp",
                                "onsuccess": function(xhr, response){
                                    var _sverIP = '';
                                    if(response && response.code == "A00000"){
                                        _sverIP = response.data || '';
                                    }
                                    var param = {
                                        type: '508251_js',
                                        pla: '11',
                                        svrip: _sverIP, //请求服务器ip的地址
                                        jsurl: jobName, //出错的js文件名
                                        tn: Math.random()
                                    };
                                    Q.log.server(param, '//msg.qy.net/tmpstats.gif');
                                },
                                onfailure: function(xhr, response){}
                            });
                        }

                        if(window.__qlt && window.__qlt.end){
                            window.__qlt.end("jobLoadReady");
                        }
                        Q.LoadTime.loaded('jsloaded');
                        Q().ready(function(){
                            if(pageJob && pageJob.addJobs) {
                                pageJob.addJobs();
                            }
                            if(pageJob && pageJob.start) {
                                pageJob.start();
                                Q.LoadTime.loaded('jobdone');
                            }
                        });
                    });
                    Q.loadTemplate = function(templateName, callback){
                        ver.loadTemplate.apply(ver, arguments);
                    };
                }
               
            });
        });
    };

    if(window.addEventListener) {
        window.addEventListener('load', function() {
            if(window.__qlt && window.__qlt.add){
                window.__qlt.add("resourceReady");
            }
            Q.isWindowLoaded = true;
        }, false);
    }
    else if(window.attachEvent) {
        window.attachEvent('onload', function() {
            if(window.__qlt && window.__qlt.add){
                window.__qlt.add("resourceReady");
            }
            Q.isWindowLoaded = true;
        });
    }
    //jobdone从job提到这里
    var JOB_DONE = false;
    var doneList = Q.external.jobdone ? Q.external.jobdone.doneList : [];
    
    Q.event.customEvent.on("jobdone", function () {
        JOB_DONE = true;
        if(doneList.length){
            while(doneList.length){
                (doneList.shift())();
            }
        }
    });
    //对外统一提供jobdone接口
    Q.external.jobdone = function (fn) {
        fn = fn || function(){};
        if(JOB_DONE){
            fn();
        }
        else{
            doneList.push(fn);
        }
        return JOB_DONE;
    };

    //为了避免将Q的接口暴露在页面上，为customEvent再做一层封装
    Q.firstFrameLoaded = function(callback){
        Q.event.customEvent.on('swf_followUpNextLoad', callback);
    };

})(seajs, this);

(function(global){
    global.Q = global.Q || {};
    global.Q.player = global.Q.player || {};

    /*flash加载完成标志位*/
    global.Q.player.loadSuccess = global.Q.player.loadSuccess || false;

    Q.event.customEvent.on("swf_playerLoadSuccess", function (data) {
        if(window.__qlt && window.__qlt.end){
            window.__qlt.end("playerReady");
        }
        global.Q.player.loadSuccess = true;
    });

    //Bug 102498 - 【提升主站DAU-最终播放页提速】最终播放页页面结构异步加载
    //缓存播放器发送的数据, 为后面“手机看”功能使用
    var _sData = global.Q.player._sData;
    Q.event.customEvent.on("swf_playerStateChange", function(sdata) {
        var _type = sdata && sdata.data && sdata.data.state;
        var privateVideo = sdata.privateVideo;
        if (_type == 'DataReady' || _type == 'Error') {
            _sData = sdata;
        }
    });
    
    Q.player.getVideoStatus = function(){
        return _sData;
    };

    var nav = global.navigator;

    /*初始hash有很多参数，这个是滚动到相应地方的功能*/
    Q.$(window).on("load", function(){
        var tempHash = global.location.hash;
        var hashParam = Q.url.queryToJson(tempHash.substring(1));
        if(hashParam.scrollTo){
            global.location.hash ='#'+hashParam.scrollTo;
            global.location.hash = tempHash;
        }
    });

    /*demandPb pingback 广告库存那边的需求*/
    global.Q.player.demandPb = function(){
        var pf,p,p1;
        if(Q.browser.android || Q.browser.iPhone || Q.browser.WP || Q.browser.ios){
            pf = 2;
            p = 20;
            p1 = 202;
        }
        else{
            pf = 1;
            p = 10;
            p1 = 101;
        }
        var pu = Q.cookie.get("P00003") || '';
        var jsuid = Q.cookie.get("QC006") || '';

        if(Q.log && Q.log.server){
            Q.log.server({
                t:"11",
                ct:'uwantplay',
                pf:pf,
                p:p,
                p1:p1,
                u:jsuid,
                pu:pu
            }, '//msg.qy.net/b');
        }
    };

    /*播放器触发前端发送pingback*/
    Q.event.customEvent.on("swf_requestJSSendPB", function (data) {
        if(data.PBType === '1'){
            /*demandPb pingback 广告库存那边的需求*/
            global.Q.player.demandPb();
        }
    });

    /*新的as3 js广播交互函数*/
    var noticeList = Q.__callbacks__.iqiyi_player_notice ?
        Q.__callbacks__.iqiyi_player_notice.list : {};

    Q.__callbacks__.iqiyi_player_notice = function (data) {
        try {
            var ev = JSON.parse(data);
            ev.type = 'swf_' + ev.type;
            setTimeout(function(){
                try{
                    var list = Q.__callbacks__.iqiyi_player_notice.list;
                    Q.event.customEvent.fire(ev);
                    list[ev.type] = [ev];
                }
                catch(e){}
            },0);
        } catch (e) {
            return;
        }
    };

    Q.__callbacks__.iqiyi_player_notice.list = noticeList;

    /*老的as3 js广播交互函数*/
    global.lib = global.lib || {};
    global.lib.swf = global.lib.swf || {};
    global.lib.swf.notice = global.lib.swf.notice || function () {};
    var lib_swf_notice = global.lib.swf.notice;
    var swfNoticeList = global.lib.swf.notice.list || {};
    global.lib.swf.notice = function (data) {
        lib_swf_notice(data);
        try {
            var ev = JSON.parse(data);
            ev.type = 'swf_' + ev.type;
            setTimeout(function () {
                try {
                    var list = global.lib.swf.notice.list;
                    Q.event.customEvent.fire(ev);
                    list[ev.type] = [ev];
                }
                catch (e) {
                }
            }, 0);
        } catch (e) {
            return;
        }
        //对flash事件增加swf前缀，以便于js的自定义事件区分开，防止事件冲突
    };

    global.lib.swf.notice.list = swfNoticeList;

    var outsite = (function(){
        var wList = []; //跨域白名单。e.g. ['jd.com']
        var res;
        try{
            res = !window.parent.location.href;
        }
        catch(e){
            if(wList.length === 0){
                res = true;
            }
            while(wList.length){
                if(document.referrer.indexOf(wList.pop()) === -1){
                    res = true;
                    break;
                }
            }
        }
        return res + '';
    })();

    var wMode = (function(){
        //safari IE chrome@xp &  naapi@chrome 使用透明（因为iframe垫片无效）
//        var PPAPIflash = (function(m){
//            try{
//                var type = 'application/x-shockwave-flash';
//                var name = m && m[type] && m[type].enabledPlugin && m[type].enabledPlugin.filename;
//                if(name == "pepflashplayer.dll" || name == "libpepflashplayer.so"){
//                    return 1;
//                }
//            }catch(e){}
//            return 0;
//        })(nav.mimeTypes);
//
//        if(Q.browser.ff || Q.browser.SAFARI || Q.browser.IE
//          || (Q.browser.CHROME && (Q.browser.getOS()=="WinXP" || !PPAPIflash))){
//            return 'Opaque';
//        }
        //else{
            return 'Opaque';
       // }
    })();

    global.Q.player.wMode = wMode;

    //object.extend快捷函数
    var shortcutFn = function(t,s){
        if(s){
            return true;
        }
    };

    //字符串防xss安全函数
    var safely = function(str){
        return str.replace(/([<>])/g,'');
    };

    //创建video标签
    var createH5 = function(isLivePlayer, opt,vars){
        var wrapper = opt.container;
        var video = Q.element.Element.create({tagName:'video'});
        wrapper.insertBefore(video,null);

        //--------为了加快速度的hack------start
        var ic = new Q.ic.InfoCenter({
            moduleName: 'Q_player_create'
        });
        Q.ic.InfoCenter.whatToSave('Q_player_create');
        var errors = {
            'A00004': '数据不存在',
            'A00001': '参数错误',
            'A00010': '调用passport获取用户信息失败',
            'A00011': '调用会员鉴权接口失败',
            'A00013': 'IP限制'
        };
        var status = {
            'A00012': '需要前端请求广告mixer接口',
            'A00015': '会员鉴权成功',
            'A00000': '不请求广告直接播放'
        };
        video[0].getPreloader = function(fn){
            var srcData = video[0].srcData;
            if(srcData){
                delete video[0].srcData;
                fn(srcData);
                delete video[0].getPreloader;
            }
            else{
                video[0].getPreloader.cb = fn;
            }
        };
        if(window.__qlt && window.__qlt.start){
            window.__qlt.start("playerAuthReady");
        }
        var cupid;
        if(Q.PageInfo){
            cupid = Q.PageInfo.adPlayerId;
        }
        var data = {
            'uid': Q.cookie.get('P00003') || '',
            'cupid': cupid || '',
            'type' : (Q.browser.iPad || Q.browser.iPhone || navigator.userAgent.match(/miuivideo\//i)) ? 'm3u8' : 'mp4'
        };
        if (Q.cookie.get('QC004') === '0') {
            Q.object.extend(data, {nolimit: 1});
        }

        //判断页面是否存在 weorjjigh，若存在则传参(tvid)，接收返回对象，
        //将此对象传给tmts接口
        var pageOpt = {};

        Q.object.extend(data, pageOpt);

        // 点播和直播播放器获取播放地址的接口不同
        if (isLivePlayer) {
            var programId = vars.tvId || '';
            var channelId = vars.channelId || '';
            var liveType;

            //判断页面是否存在 cmd5xtmts，若存在接收返回对象，
            //将此对象传给tmts接口
            var auth;
            try {
                if (window.cmd5xlive) {
                    auth = window.cmd5xlive();
                }
            } catch (e) {
            }

            var liveFail = function(code) {
                var errorTmpl = '<div class="vip-popup" style="top:0;left: 0;"><div class="vip-popup-inner">' +
                    '<p>很抱歉</p><p>{{error}}</p>' +
                    ((code && code.charAt(0) !== 'L') ? ('<span class="errorCode">错误代码: ' + code + '</span>') : '') +
                '</div></div>';

                // http://wiki.qiyi.domain/pages/viewpage.action?pageId=52049111
                var errorMsg = '';
                switch (code) {
                case 'A00001':
                case 'A00002':
                case 'A00003':
                case 'A00004':
                case 'A00005':
                    errorMsg = '找不到视频啦，请观看其他精彩视频';
                    break;
                case 'A00110':
                    errorMsg = '由于版权限制，当前视频无法观看';
                    break;
                case 'A00111':
                    errorMsg = '由于版权限制，您所在的地区暂时无法观看该视频';
                    break;
                case 'L00001':
                    errorMsg = '直播尚未开始，敬请期待！';
                    break;
                case 'L00002':
                    errorMsg = '直播已结束，感谢关注！';
                    break;
                case 'L00003':
                    errorMsg = '没有直播流啦，请观看其他精彩视频';
                    break;
                case 'L00004':
                    errorMsg = '直播信息出错啦，请观看其他精彩视频';
                    break;
                case 'E00000':
                    errorMsg = '网络请求超时或者网络出错啦';
                    break;
                }

                var temp = document.createElement('div');
                temp.innerHTML = errorTmpl.replace(/\{\{error}}/ig, errorMsg);
                wrapper.insertBefore(temp.firstChild, null);
                temp = null;
            };

            // 获取直播状态
            var getLiveStatus = function(progress) {
                var status = 'unknown';

                if (!isNaN(progress)) {
                    if (progress === 2) {
                        status = 'living';
                    } else if (progress > 2) {
                        status = 'liveend';
                    } else {
                        status = 'livebefore';
                    }
                }

                return status;
            };

            var url = '//live.video.iqiyi.com/jp/live';
            var options = {
                lp: programId,
                lc: channelId,
                v: 0,
                src: Q.browser.iPad ? '03020031010000000000' : '02020031010000000000',
                t: new Date().getTime(),
                uid: Q.cookie.get('P00003') || '',
                rateVers: 'PAD_WEB_QIYI'
            };

            if (auth) {
                Q.object.extend(options, auth);
            }

            ic.log('[预加载]我要提前去请求直播src咯!');
            Q.ajax({
                url: url,
                data: options,
                dataType: 'jsonp',
                timeout: 20 * 1000,
                beforeSend: function(xhr, settings) {
                    var parse = function(url) {
                        var reHost = /(\w+):\/\/([^\/:]+):?(\d*)((?:\/|$)[^?#]*)/;
                        var parts = url.match(reHost);
                        if (parts) {
                            var protocol = parts[1];
                            var host = parts[2];
                            var port = parts[3];
                            var path = parts[4];
                            return {protocol: protocol, host: host, port: port, path: path};
                        }

                        return null;
                    };

                    var url = settings.url; // .replace(/\?(.+)=\?/, '?$1=' + jsonpCallback)
                    var host = parse(url).host;

                    try {
                        if (window.cmd5x) {
                            url += '&vf=' + window.cmd5x(url.replace(new RegExp('^https?:\/\/'+  host, 'ig'), ''));
                        }
                    } catch (e) {
                    }

                    settings.url = url;
                },
                success: function (data) {
                    if (data.code === 'A00000') {
                       try {
                           var liveStatus = getLiveStatus(parseInt(data.data.program.progress, 10));
                           liveType = data.data.type;

                           if (liveStatus === 'living') {
                               // 正在直播
                               if (data.data.streams) {
                                   if (window.__qlt && window.__qlt.end) {
                                       window.__qlt.end("playIfRes");
                                   }

                                   // 此处不进行 replace(/^http:/ig, '') 替换，由live接口决定前缀
                                   video[0].setAttribute('src', data.data.streams[0].url.replace('.flv', '.m3u8'));
                                   video[0].load();
                               } else {
                                   liveFail('L00003');
                               }
                           } else if (liveStatus === 'livebefore') {
                               // 直播未开始
                               liveFail('L00001');
                           } else if (liveStatus === 'liveend') {
                               // 直播结束
                               liveFail('L00002');
                           } else {
                               // 直播状态出错
                               liveFail('L00004');
                           }
                       } catch (e) {
                           // 直播状态出错
                           liveFail('L00004');
                       }
                    } else {
                        //超时 E00000
                        ic.error('[预加载]出错啦，你的错误信息是：' + (errors[data.code] || data.code));
                        liveFail(data.code && data.code.code ? data.code.code : data.code);
                    }
                    if (video[0].getPreloader.cb) {
                        ic.log('[预加载]页面底部的js去获得src了');
                        video[0].getPreloader.cb(data);
                        delete video[0].getPreloader;
                    } else {
                        ic.log('[预加载]预加载已经拿到了src地址');
                        video[0].srcData = data;
                    }

                    ic.log('[预加载]end，拿到的srcData：' + JSON.stringify(data));
                },
                failure:function () {
                    ic.error('[预加载]出错啦，你的错误信息是：超时');
                    var data = {code:'E00000'};

                    liveFail(data.code);
                    if(video[0].getPreloader.cb){
                        video[0].getPreloader.cb(data);
                        delete video[0].getPreloader;
                    }
                    else{
                        video[0].srcData = data;
                    }
                }
            });

            // 直播VV
            (function(win, doc, video) {
                var playStatus;
                var pingback = (function() {
                    var uuidTick = 0;

                    return {
                        veid: '',
                        getRfr: function() {
                            var rfr = doc.referrer;
                            return rfr;
                        },
                        getUuid: function() {
                            return Q.crypto.md5(win.navigator.userAgent +
                                doc.cookie + Math.random() +
                                new Date().getTime() * uuidTick++);
                        },
                        getJsuid: function() {
                            var self = this;
                            var uid = Q.cookie.get('QC006');
                            if (!uid) {
                                self.__newuser = true;
                                var save = function(uuid) {
                                    Q.cookie.set('QC006', uuid, {
                                        expires: 365 * 24 * 60 * 60 * 1000,
                                        path: '/',
                                        domain: 'iqiyi.com'
                                    });
                                };
                                uid = this.getUuid();
                                save(uid);
                            }
                            return uid;
                        },
                        getWeid: function() {
                            return window.webEventID;
                        },

                        getUid: function() {
                            return this.getJsuid();
                        },
                        getPuid: function() {
                            return JSON.parse(Q.cookie.get("P00002") || "{}").uid || "";
                        },
                        getEid: function() {
                            var jsuid = '';
                            if (!this.veid) {
                                jsuid = pingback.getJsuid();
                                this.veid = Q.crypto.md5(jsuid + 'veid' + (new Date() * 1));
                            }
                            return this.veid;
                        },
                        getMsrc: function() {
                            var msrc = Q.url.getQueryValue(location.href, "msrc");
                            if (msrc) {
                                Q.cookie.set("QC015", msrc);
                            } else {
                                msrc = Q.cookie.get('QC015');
                            }
                            return msrc || '';
                        },
                        isNewUser: function() {
                            var isNewUser = '0';
                            if (this.__newuser === true) {
                                isNewUser = '1';
                            } else if (!Q.cookie.get('QC006')) {
                                isNewUser = '1';
                            }
                            return isNewUser;
                        },
                        getRandom: function() {
                            return Date.now();
                        },
                        send: function(url, data) {
                            Q.log.server(data, url || '//msg.qy.net/b');
                        }
                    };
                })();

                function VV(opts) {
                    this.player = opts.player;
                    this.bindEvent();
                }

                VV.prototype = {
                    send: function(options) {
                        var data = {};
                        var platform = {
                            pf: 2,
                            p1: 202,
                            p: 20,
                            p2: 1012,
                            c1: 101221
                        };
                        data = Q.object.extend(data, options);
                        data = Q.object.extend(data, platform);
                        data.c2 = channelId;
                        data.lctype = liveType || '';
                        data.livetype = 2;
                        data.ve = pingback.getEid(); //获取视频事件ID
                        data.ce = pingback.getWeid(); //获取页面事件ID
                        data.rfr = pingback.getRfr();
                        data.purl = location.href;
                        data.r = programId || '';
                        data.isdm = 0;
                        data.vfrm = Q.url.getQueryValue(location.href,'vfrm') || '';
                        //判断是否为新用户必须要在获取用户ID的前面
                        data.nu = pingback.isNewUser(); //判断是否新用户
                        data.u = pingback.getUid(); //获取用户ID
                        data.pu = pingback.getPuid(); //获取登录用户ID
                        data.rn = pingback.getRandom(); //获取随机数
                        data.ht = 0; // 0：免费视频 1：付费视频

                        try {
                            data.__sigC = window.cmd5ly(data.r + '' + data.p1 + '' + data.u + data.ve + 'ChEnYH0804FdadrrEDFf2016tT'); //龙源防作弊
                        } catch (e) {
                        }
                        pingback.send(null, data);
                    },
                    /*
                     *  发送开始即时pingback，即时策略参考wiki
                     *   1 第一次到15秒发送
                     *   2 第一次到60s发送
                     *   3 每120秒发送
                     */
                    sendTimingPingback: function(data) {
                        var _this = this;
                        var sum;
                        _this._sum = _this._sum || 0;

                        if (_this._lastPlayTime) {
                            sum = parseInt(_this.player.currentTime, 10);

                            if (sum === _this._sum) {
                                return;
                            }
                            _this._sum = sum;

                            if (_this._sum == 15) {
                                _this.send({
                                    t: '2',
                                    tm: 15
                                }, data);
                            }
                            else if (_this._sum == 60) {
                                _this.send({
                                    t: '2',
                                    tm: 60
                                }, data);
                            }
                            else if (_this._sum % 120 === 0) {
                                _this.send({
                                    t: '2',
                                    tm: 120
                                }, data);
                            }
                        }

                        _this._lastPlayTime = new Date().getTime();
                    },
                    sendStartPlayPingback: function(data) {
                        this.send({
                            t: '15',
                            td: '' // 咨询了龙源，这里目前先发空
                        }, data);

                        // 这个pingback可能要挪到正片开播的时候发
                        this.send({
                            t: '1'
                        }, data);
                    },
                    /*
                     *  发送播放结束pingback
                     */
                    sendEndPlayPingback: function(data) {
                        this.send({
                            t: '13'
                        }, data);
                    },
                    sendActionPlayPingback: function(action) {
                        this.send({
                            t: '5',
                            a: action
                        });
                    },
                    bindEvent: function() {
                        var _this = this;
                        var player = _this.player;

                        this.__firstPlay = true;

                        player.addEventListener('timeupdate', function() {
                            playStatus = 'playing';
                            if (_this.__firstPlay && _this.player.currentTime > 0.5) {
                                _this.sendStartPlayPingback();
                                _this.__firstPlay = false;
                            }

                            _this.sendTimingPingback();
                        });
                        player.addEventListener('ended', function() {
                            playStatus = 'ended';
                            _this.sendEndPlayPingback();
                        });
                        player.addEventListener('pause', function(e) {
                            playStatus = 'pause';
                            _this.sendActionPlayPingback(1);
                        });
                        // 继续播
                        player.addEventListener('play', function(e) {
                            playStatus = 'play';
                            if (!_this.__firstPlay) {
                                _this.sendActionPlayPingback(2);
                            }
                        });
                        // waiting
                        player.addEventListener('waiting', function(e) {
                            playStatus = 'waiting';
                        });
                        // error
                        player.addEventListener('error', function(e) {
                            playStatus = 'error';
                        });
                    }
                };

                new VV({
                    player: video
                });
            })(window, document, video[0]);
        } else {
            ic.log('[预加载]我要提前去请求点播src咯，参数：'+ vars.tvId + ' --- '+ vars.vid + '---params:' +JSON.stringify(data));
            Q.http.json('//cache.m.iqiyi.com/jp/tmts/' + vars.tvId + '/' + vars.vid + '/',{
                data: data,
                dataType: 'jsonp',
                timeout: 20*1000,
                onsuccess:function(xhr,data){
                    if (data.code === 'A00000') {
                        if (data.data.ds in status) {
                            var now = new Date().getTime();
                            var m3u = data.data.m3u;
                            if (opt.type === 'm3u8') {
                                if (m3u.indexOf('?') < 0) {
                                    data.src = m3u + '?v=' + (now ^ 71717171);
                                } else {
                                    data.src = m3u;
                                }
                            } else {
                                data.src = m3u;
                            }
                            data.status = data.data.ds;
                        }
                    } else {
                        //超时 E00000
                        ic.error('[预加载]出错啦，你的错误信息是：' + (errors[data.code] || data.code));
                    }


                    if(video[0].getPreloader.cb){
                        ic.log('[预加载]页面底部的js去获得src了');
                        video[0].getPreloader.cb(data);
                        delete video[0].getPreloader;
                    }
                    else{
                        ic.log('[预加载]预加载已经拿到了src地址');
                        video[0].srcData = data;
                    }

                    ic.log('[预加载]end，拿到的srcData：' + JSON.stringify(data));
                },
                onfailure:function () {
                    ic.error('[预加载]出错啦，你的错误信息是：超时');
                    var data = {code:'E00000'};
                    if(video[0].getPreloader.cb){
                        video[0].getPreloader.cb(data);
                        delete video[0].getPreloader;
                    }
                    else{
                        video[0].srcData = data;
                    }
                }
            });
        }
        //--------为了加快速度的hack-------over

        video.attr('id',opt.id);
        video.attr('data-player-playerbody',opt.id);
        video.attr('x-webkit-airplay',"allow");
        video.attr('height',opt.height);
        video.attr('width',opt.width);
        if(wrapper.attr('data-player-h5byobar') == 1){
            video.attr('controls','controls');
        }
        var params=[];
        for(var i in vars){
            params.push(i.toLowerCase() + '=' + vars[i]);
        }
        video.attr('data-player-params',params.join('&'));
    };

    //创建flash
    var createSwf = function(path,opt){
        var definitionID = opt.vars.vid;
        //针对分享播放器做的兼容
        if(!opt.vars.isShare){
            delete opt.vars.vid;
        }
        delete opt.vars.isShare;
        opt.vars['definitionID'] = definitionID;
        Q.flash.insert(path,opt);
    };

    //发送pingback
    var sendPingback = function(path,yhls){
        //demandPb pingback 广告库存那边的需求 flash h5 都需要有这个逻辑,flash在创建flash标签时发,switch片时发,接到flash调用时发;h5在每个片鉴权时发
        if((path || '').match(/player\.swf/i)){
            global.Q.player.demandPb();
        }
        //播放器创建成功统计
        if(Q.log.server){
            try{
                Q.log.server({
                    type:'yhls20130924',
                    usract:'sunkuotest',
                    tn:new Date()*1,
                    yhls:yhls,
                    fuid:Q.cookie.get('QC005') || '',
                    juid:Q.cookie.get('QC006') || '',
                    ua:nav.userAgent,
                    ver:(function(){
                        var ver = '';
                        try{
                            ver = Q.flash.getVer.join('.');
                        }
                        catch(e){
                        }
                        return ver;
                    })(),
                    url:location.href
                },'//msg.qy.net/tmpstats.gif');
            }
            catch(e){}
        }
    };

    //获取url上的参数
    global.Q.player.getQrParams = function(){
        var getUrlPar = function(query){
            var param = Q.url.queryToJson(query);
            var vars = param.flashvars;
            if(vars){
                vars = Q.url.queryToJson(safely(decodeURIComponent(vars)));
            }
            else{
                vars = {};
            }
            //时间相关
            var shareStart = param['share_sTime'] || param['s'];
            var shareEnd = param['share_eTime'] || param['e'];
            //对特殊格式的时间做兼容
            var specialShare = shareStart && shareStart.match(/(\d*)-.*?=(\d*)/);
            if(specialShare){
                shareStart = specialShare[1];
                shareEnd = specialShare[2];
            }

            var itemVars = {
                //自动播放
                autoplay:param['autoplay'],
                //是否为会员片
                isMember:param['ismember'],
                //影片码流id
                vid:param['videoid'] || param['vid'],
                //视频id
                tvId:param['tvid'],
                //专辑id
                albumId:param['albumid'],
                //循环播放
                cyclePlay:param['cycleplay'],
                //独播
                exclusive:param['exclusive'],
                //奇艺自制
                qiyiProduced:param['qiyiProduced'],
                //开始时间
                share_sTime:shareStart,
                //结束时间
                share_eTime:shareEnd,
                //是否为站外播放
                outsite:param['outsite'],
                //丘比特广告id
                cid:param['cid'],
                //vv播放器参数
                vfrm:param['vfrm']
            };
            Q.object.extend(vars,itemVars,shortcutFn);
            return vars;
        };

        var search = getUrlPar(safely(global.location.search.replace(/([<>])/g,'')));
        var hash = getUrlPar(safely(global.location.hash.slice(1).replace(/([<>])/g,'')));

        Q.object.extend(search,hash,shortcutFn);
        return search;
    };

    //获取元素上的参数
    global.Q.player.getElParams = function(wrapper){
        var attrVars = {
            expandState:wrapper.attr('data-player-expandstate'),
            albumId:wrapper.attr('data-player-albumid'),
            tvId:wrapper.attr('data-player-tvid'),
            vid:wrapper.attr('data-player-videoid'),
            autoplay:wrapper.attr('data-player-autoplay'),
            isMember:wrapper.attr('data-player-ismember'),
            cyclePlay:wrapper.attr('data-player-cycleplay'),
            exclusive:wrapper.attr('data-player-exclusive'),
            qiyiProduced:wrapper.attr('data-player-qiyiProduced'),
            share_sTime:wrapper.attr('data-player-startTime'),
            share_eTime:wrapper.attr('data-player-endTime'),
            hasbarrage:wrapper.attr('data-player-hasbarrage'),
            openbarrage:wrapper.attr('data-player-openbarrage')
        };

        var params = Q.$('*[data-widget-flashplayerparam]');
        var adparams = Q.$('*[ data-widget-adparam]');
        var adurl,cid,path,customVars,baseVars={},isShare=false;

        //广告参数
        if(adparams && adparams.length){
            adparams.forEach(function(item){
                var cupid = Q.$(item).attr('data-adparam-cupid');
                var playerid = Q.$(item).attr('data-adparam-playerid');
                if(cupid){
                    attrVars.adurl = cupid;
                }
                if(cid){
                    attrVars.cid = playerid;
                }
            });
        }

        //flash参数
        if(params.length){
            params.forEach(function(item){
                item = Q.$(item);
                var itemVars = item.attr('data-flashplayerparam-flashvars');
                //针对分享播放器做的兼容
                if(!isShare){
                    isShare = item.attr('data-widget-flashplayerparam') === "share";
                }
                if(itemVars){
                    itemVars = Q.url.queryToJson(itemVars);
                }
                else{
                    itemVars = {};
                }
                Q.object.extend(baseVars,itemVars,shortcutFn);
                path = item.attr('data-flashplayerparam-flashurl') || path;
            });
            path = wrapper.attr('data-player-flashurl') || path;
        }
        //针对分享播放器做的兼容
        attrVars.isShare = isShare;

        customVars = wrapper.attr('data-player-flashvars');
        if(customVars){
            customVars = Q.url.queryToJson(customVars);
        }
        else{
            customVars = {};
        }

        //flashvar参数合并
        Q.object.extend(attrVars,baseVars,shortcutFn);
        Q.object.extend(attrVars,customVars,shortcutFn);

        return {
            'path':path,
            'vars':attrVars
        };
    };

    //flash的默认参数
    global.Q.player.getDefParams = function(id){
        var qlt = window.__qlt;
        var tmplt = '';
        var brs = '';
        var startTime = '';
        if(qlt){
            if(qlt.tmplt){
                tmplt = qlt.tmplt || '';
            }
            if(qlt.brs){
                brs = qlt.brs || '';
            }
            if(qlt.statisticsStart){
                startTime = qlt.statisticsStart || '';
            }
        }

        return {
            origin:id,
            outsite:outsite,
            P00001:Q.cookie.get("P00001"),
            profileID: Q.cookie.get('P00PRU') || '',
            profileCookie: Q.cookie.get('P00007') || '',
            passportID:Q.cookie.get('P00003'),
            yhls:(new Date()*1) + parseInt(Math.random() * 10e10,10),
            playerCTime:(new Date())*1,
            pageCTime:startTime,
            pageTmpltType:tmplt,
            browserType:brs,
            webEventID:window.webEventID || '',
            vipuser:Q.cookie.get("CM0001") || ''
        };
    };

    //对外创建播放器的入口
    global.Q.player.create = function(id,opts){
        //播放器创建成功时间统计(开始)
        if(window.__qlt && window.__qlt.start){
            window.__qlt.start("playerReady");
        }

        //初始化参数
        var wrapper = Q.$('*[data-widget-player=' + id + ']');
        var opt = {
            id:id,
            height:'100%',
            container:wrapper,
            width:'100%'
        };

        //---集合flashvars参数---开始
        //播放相关的参数
        //ipad也会写到video标签上，有可能随着需求的增加出现冗余参数
        var qrVars = Q.player.getQrParams();
        var baseVars,path,elParams;
        var vars = {};
        //如果用户要自定义参数，则不从页面上的元素读取任何参数
        if(opts && opts.vars){
            baseVars = opts.vars;
            path = opts.path;
        }
        else{
            elParams = Q.player.getElParams(opt.container);
            baseVars = elParams.vars;
            path = elParams.path;
        }
        Q.object.extend(vars,baseVars,shortcutFn);
        Q.object.extend(vars,qrVars,shortcutFn);
        //---集合flashvars参数---结束

        if (Q.browser.ios || Q.browser.android) {
            createH5(!!(opts && opts.isLivePlayer), opt, vars);
            //播放器创建成功时间统计(结束)
            if (window.__qlt && window.__qlt.end) {
                window.__qlt.end("playerReady");
            }
        } else {
            //---集合flash所需所有参数---开始
            var deVars = Q.player.getDefParams(opt.id);
            Q.object.extend(vars,deVars,shortcutFn);
            var params = {
                'wMode': global.Q.player.wMode
            };

            //自定义flash标签的params参数(bgcolor等)
            if(opts && opts.params){
                Q.object.extend(params,opts.params,shortcutFn);
            }

            //暂时不对外开放自定义properties
            var properties = {
                'data-player-playerbody':opt.id
            };

            Q.object.extend(opt,{
                'properties': properties,
                'params': params,
                'vars': vars
            },shortcutFn);
            //---集合flash所需所有参数---结束

            //创建flash,不知道以后可能出现什么需求，暂时先提出去
            createSwf(path,opt);
            //发送pingback
            sendPingback(path,vars.yhls);
        }
 
    };
    //Bug 196590 - 页面播放器参数优化一期（span标签动态创建）
    global.Q.player.createSpan = function(param, positionID) {
        var build = [];
        build.push('<span ');
        build.push('data-widget-flashplayerparam="' + param.name + '" ');
        build.push('data-flashplayerparam-flashurl="' + (param.attribute.playerUrl || "") + '" ');
        var fvp = '';
        for (var item in param.attribute) {
            if (fvp !== '') {
                fvp += '&';
            }
            fvp += item + '=' + param.attribute[item];
        }
        build.push('data-flashplayerparam-flashvars="' + fvp + '"');
        build.push('style="display:none;"');
        build.push('></span>');

        var referenceNode = document.getElementById(positionID);
        if (referenceNode) {
            var tmpDiv = document.createElement('span');
            tmpDiv.innerHTML = build.join('');
            referenceNode.parentNode.insertBefore(tmpDiv.firstChild, referenceNode);
        }
    };
})(this);


    if(window.__qlt && window.__qlt.add){
        window.__qlt.add("coreReady");
    }
};