var log       = require('./log.js').file('visualizer.log'),
    geo       = require('./geo.js'),
    compress  = require('compression'),
    express   = require('express'),
    app       = express(),
    mongo     = require('mongodb').MongoClient,
    mongo_url = 'mongodb://localhost:27017/here_kontur_ru',
    path      = './web/',
    port      = process.argv[2] || 80;

var photos = [];

app
    .use(compress())
    .use(express.static(path))
    .get('/', function (req, res) {
        res.send(path + 'index.html');
    })
    .get('/data/:size', function (req, res) {
        var bounds = geo.bounds(photos);

        res.send({
            photos: {
                type: 'FeatureCollection',
                features: photos.slice(-1 * req.params['size'])
            },
            bounds: bounds,
            center: geo.center(bounds)
        });
    });

mongo.connect(mongo_url, function (err, db) {
    log.check(err);

    db.collection('photos').find({
        'location.latitude': { $ne: null }
    }, {
        sort: [['created_time', 'desc']]
    }).toArray(function (err, docs) {
        log.check(err);

        docs.forEach(function (photo) {
            photos.push({
                id: photo.id,
                geometry: {
                    type: 'Point',
                    coordinates: [
                        photo.location.latitude,
                        photo.location.longitude
                    ]
                },
                properties: {
                    link:        photo.link,
                    image_l:     photo.images.standard_resolution.url,
                    image_s:     photo.images.thumbnail.url,
                    text:        photo.caption ? photo.caption.text : '',
                    user:        photo.user.username,
                    hintContent: photo.user.username
                }
            });
        });

        app.listen(port, function() {
            console.log('Visualizer started at localhost:' + port);
        });
    });
});