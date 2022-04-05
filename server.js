/* eslint-env node, es6 */
/* eslint-disable no-console, no-unused-vars */

const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const nunjucks = require('nunjucks');
const shortid = require('shortid');
const upload = require('multer')();

const port = process.env.PORT || 4000;
const rooms = io.of('/rooms');


/**
 * Configure the app
 */

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

nunjucks.configure('templates', {
    autoescape: true,
    cache: false,
    express: app
});

rooms.on('connection', (socket) => {
  socket.join(socket.handshake.query.room);
});


/**
 * Middleware
 */

function cacheMiddleware (req, res, next) {
  res.set('Cache-Control', 'public, max-age=300');
  next();
}

function corsMiddleware (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, Content-Type');
  next();
}

function invalidRoomsMiddleware (req, res, next) {
  if (!shortid.isValid(req.params.room)) {
    res.sendStatus(404);
    res.end();
    return;
  }
  next();
}


/**
 * Redirect naked requests to a random room and use sockets to update
 * the room frontend for all requests regardless of method to /:room/data.
 */

app.get('/', (req, res) => {
  res.redirect('/' + shortid.generate());
});

app.get('/:room', cacheMiddleware, invalidRoomsMiddleware, (req, res) => {
  res.render('room.html', {
    room: req.params.room
  });
});

app.all( '/:room/data', [corsMiddleware, invalidRoomsMiddleware, upload.array()], (req, res) => {
  var data = {
    method: req.method,
    url: req.url,
    headers: req.headers
  };
  if (req.body) { data.body = req.body; }
  rooms.to(req.params.room).emit('request', JSON.stringify(data));
  res.json(data);
});


/**
 * Get this party started
 */

server.listen(port);
console.log(`Listening on http://localhost:${port}`);
