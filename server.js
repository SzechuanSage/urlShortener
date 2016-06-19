var path = require('path');
var express = require('express');
var mongo = require('mongodb').MongoClient

var router = express();

router.use(express.static(path.resolve(__dirname, 'urlShortener')));

var mongoDao = function() {
    var urls = null
    
    var setUrls = function(collection) {
        urls = collection
    }

    var onComplete = function (err, documents, callback) {
        if (err) { throw err }
        callback(documents)
    }

    var getAllUrl = function(callback) {
        urls.find({}, { _id: 0 }).toArray(function(err, documents) {
            onComplete(err, documents, callback)
        })
    }
    
    var getShortUrl = function(callback, shortUrl) {
        urls.find({short_url: shortUrl}, { _id: 0 }).toArray(function(err, documents) {
            onComplete(err, documents, callback)
        })
    }
    
    var getOriginalUrl = function(callback, originalUrl) {
        urls.findOne({original_url: originalUrl}, function(err, documents) {
            onComplete(err, documents, callback)
        })
    }

    var addOriginalUrl = function(callback, url) {
        urls.insert(url, function(err, documents) {
            onComplete(err, documents, callback)
        })
    }    

    return {
        setUrls: setUrls,
        getAllUrl: getAllUrl,
        getShortUrl: getShortUrl,
        getOriginalUrl: getOriginalUrl,
        addOriginalUrl: addOriginalUrl
    }
}

var dao = null
var mongoUrl = 'mongodb://localhost:27017/urlShortener'
mongo.connect(mongoUrl, function(err, db){
    if (err) { throw err }
    console.log('Connecting')
    dao = mongoDao()
    dao.setUrls(db.collection('urls'))
})

router.get('/all', function(req, res) {
    var processAllUrl = function(documents) {
        return showAllDocuments(res, documents);
    }

    dao.getAllUrl(processAllUrl)
})

router.get('/new/*', function(req, res) {
    var url = req.originalUrl.substr(5)

    if (isBadUrl(url)) {
        sendResponse(res, {error: 'Wrong url format, make sure you have a valid protocol and real site.'})
        return;
    }

    var handleFind = function(document) {
        if (document === null) {
            var hash = getHash(url)
            var record = {
                original_url: url,
                short_url: getHost(req) + '/' + hash
            }
            dao.addOriginalUrl(handleInsert, record)
        } else {
            delete document._id
            sendResponse(res, document)
        }
    }
    
    var handleInsert = function(result) {
        var record = result['ops'][0]
        delete record._id
        sendResponse(res, record)
    }
    
    dao.getOriginalUrl(handleFind, url)
})

router.use(function(req, res) {
    var hash = req.originalUrl.substr(1)
    var shortUrl = getHost(req) + '/' + hash
    
    var processShortUrl = function(documents) {
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
    
    dao.getShortUrl(processShortUrl, shortUrl)
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
