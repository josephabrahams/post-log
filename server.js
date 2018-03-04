/* eslint-env node, es6 */
/* eslint-disable no-console, no-unused-vars */

var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var nunjucks = require('nunjucks');
var shortid = require('shortid');
var upload = require('multer')();

server.listen(process.env.PORT || 5000);

nunjucks.configure('templates', {
    autoescape: true,
    cache: false,
    express: app
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(logErrors)
app.use(errorHandler)

function logErrors (err, req, res, next) {
  console.error(err);
  next(err);
}

function errorHandler (err, req, res, next) {
  res.status(err.statusCode).send({
    errors: [
      {
        status: String(err.statusCode)
      }
    ]
  });
}

function isValidRoom (req, res, next) {
  if (!shortid.isValid(req.params.room)) {
    res.sendStatus(404);
    res.end();
    return;
  }

  next();
}

app.get('/', (req, res) => {
  res.redirect('/' + shortid.generate());
});

var rooms = io.of('/rooms');
rooms.on('connection', (socket) => {
  socket.join(socket.handshake.query.room);
});

app.get('/:room', isValidRoom, (req, res) => {
  res.render('room.html', {
    room: req.params.room
  });
});

app.post('/:room', isValidRoom, upload.array(), (req, res) => {
  var data = {
    method: 'POST',
    url: req.url,
    headers: req.headers,
    body: req.body,
  };

  rooms.to(req.params.room).emit('request', JSON.stringify(data));
  res.end();
});
