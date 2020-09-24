let allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT, POST,DELETE,OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'append,delete,entries,foreach,get,has,keys,set,values,Authorization, content-type');

    next();
}

var whitelist = [
    'http://0.0.0.0:3000',
];


let corsOptions = {
    origin: function (origin, callback) {
        var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
        callback(null, originIsWhitelisted);
    },
    credentials: true
};

module.exports = {
    allowCrossDomain,
    corsOptions
};