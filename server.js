/* jshint node: true */

'use strict';

var app = require('express')();
var bodyParser = require('body-parser');
var upload = require('multer')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
server.listen(process.env.PORT || 5000);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.post('/', upload.array(), function(req, res) {
  var data = {
    method: 'POST',
    url: req.url,
    headers: req.headers,
    body: req.body,
  };
  io.emit('request', JSON.stringify(data));
  res.end();
});

app.get('/get', upload.array(), function(req, res) {
  var data = {
    method: 'GET',
    url: req.url,
    headers: req.headers
  };

  io.emit('request', JSON.stringify(data));
  res.send('Success');
  res.end();
});
