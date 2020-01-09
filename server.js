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

const port = process.env.PORT || 5000;
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
 * Redirect naked requests to a random room
 * and render the frontend app
 */

app.get('/', (req, res) => {
  res.redirect('/' + shortid.generate());
});

app.get('/:room', cacheMiddleware, invalidRoomsMiddleware, (req, res) => {
  res.render('room.html', {
    room: req.params.room
  });
});


/**
 * Send socket events for POST, OPTIONS, and GET requests
 * to the frontend who's in the appropriate room
 */

app.post('/:room', corsMiddleware, invalidRoomsMiddleware, upload.array(), (req, res) => {
  var data = {
    method: 'POST',
    url: req.url,
    headers: req.headers,
    body: req.body,
  };
  rooms.to(req.params.room).emit('request', JSON.stringify(data));
  res.end();
});

app.options('/:room', cacheMiddleware, corsMiddleware, invalidRoomsMiddleware, (req, res) => {
  console.log('foo');
  var data = {
    method: 'OPTIONS',
    url: req.url,
    headers: req.headers
  };
  rooms.to(req.params.room).emit('request', JSON.stringify(data));
  res.end();
});

app.get('/:room/get', corsMiddleware, invalidRoomsMiddleware, (req, res) => {
  var data = {
    method: 'GET',
    url: req.url,
    headers: req.headers
  };
  rooms.to(req.params.room).emit('request', JSON.stringify(data));
  res.end();
});


/**
 * Get this party started
 */

server.listen(port);
console.log(`Listening on http://localhost:${port}`);
