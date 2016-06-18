var path = require('path');
var express = require('express');
var mongo = require('mongodb').MongoClient

var router = express();

router.use(express.static(path.resolve(__dirname, 'urlShortener')));

var urls = null
var mongoUrl = 'mongodb://localhost:27017/urlShortener'
mongo.connect(mongoUrl, function(err, db){
    if (err) { throw err }
    console.log('Connecting')
    urls = db.collection('urls')
})

router.get('/all', function(req, res) {
    urls.find({}, { _id: 0 }).toArray(function(err, documents) { handleFind(err, documents) })

    var handleFind = function(err, documents) {
        if (err) throw err
        showAllDocuments(res, documents)
    }
})

router.get('/new/*', function(req, res) {
    var url = req.originalUrl.substr(5)

    if (isBadUrl(url)) {
        sendResponse(res, {error: 'Wrong url format, make sure you have a valid protocol and real site.'})
        return;
    }

    urls.findOne({original_url: url}, function(err, doc) { handleFind(err, doc) })

    var handleFind = function(err, doc) {
        if (err) {
            sendResponse(res, {error: 'MongoFindError: '+err.message})
            return
        }
        if (doc === null) {
            var hash = getHash(url)
            var record = {
                original_url: url,
                short_url: getHost(req) + '/' + hash
            }
            urls.insert(record, function(err, obj) {
                if (err) {
                    sendResponse(res, {error: 'MongoInsertError: '+err.message})
                    return
                }
                delete record._id
                sendResponse(res, record)
            })
        } else {
            delete doc._id
            sendResponse(res, doc)
        }
    }
})

router.use(function(req, res) {
    var hash = req.originalUrl.substr(1)
    var shortUrl = getHost(req) + '/' + hash
    
    urls.find({short_url: shortUrl}, { _id: 0 }).toArray(function(err, documents) { handleFind(err, documents) })

    var handleFind = function(err, documents) {
        var count = documents.length
        if (count === 0) {
            sendResponse(res, {"error":"This url is not in the database."})
        }
        if (count === 1) {
            res.redirect(documents[0]['original_url'])
        }
        else {
            showAllDocuments(res, documents)
        }
    }
})

router.listen(process.env.PORT || 3000);

var isBadUrl = function(s) {
    /**
     * from Matthew Patrick Cashatt
     * at http://stackoverflow.com/questions/8660209/how-to-validate-url
     */
    var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    var result = regexp.test(s);
    return ! result
}

var getHost = function(req) {
    return req.headers['host']
}

var getHash = function(s){
    /**
     * from lordvlad
     * at http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
     * 
     * Using this function generates a hash of nine to ten digits, which I estimate means there can
     * be about 37,200 different URL before there is a 50% chance of a hash collision.
     */
    return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
}

var showAllDocuments = function(res, documents) {
    var result = ''
    documents.forEach(function(d) {
        result += '<p>' + JSON.stringify(d) + '</p>'
    })
    res.end(result)
}

var sendResponse = function(res, response) {
    res.end(JSON.stringify(response))
}

