/* eslint-env node, es6 */
/* eslint-disable no-console, no-unused-vars */

const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const bodyParser = require("body-parser");
const crypto = require("crypto");
const nunjucks = require("nunjucks");
const shortid = require("shortid");
const upload = require("multer")();

const port = process.env.PORT || 4000;
const rooms = io.of("/rooms");

/**
 * Configure the app
 */

app.disable("x-powered-by");

if (process.env.NODE_ENV !== "production") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
}

// Based on: https://joseph.is/3NjgItg
function extractRawBody(req, res, buf) {
  req.rawBody = buf;
}

app.use(bodyParser.urlencoded({ extended: true, verify: extractRawBody }));
app.use(bodyParser.json({ verify: extractRawBody }));

nunjucks.configure("templates", {
  autoescape: true,
  cache: false,
  express: app,
});

rooms.on("connection", (socket) => {
  socket.join(socket.handshake.query.room);
});

/**
 * Middleware
 */

function cacheMiddleware(req, res, next) {
  res.set("Cache-Control", "public, max-age=300");
  next();
}

function corsMiddleware(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, Content-Type");
  next();
}

function invalidRoomsMiddleware(req, res, next) {
  if (!shortid.isValid(req.params.room)) {
    res.sendStatus(404);
    res.end();
    return;
  }
  next();
}

function xHubSignatureMiddleware(req, res, next) {
  const room = req.params.room;
  const header = req.get("x-hub-signature-256");
  if (!room || !header) return next();

  const signature = crypto
    .createHmac("sha256", room)
    .update(Buffer.from(req.rawBody))
    .digest("hex");
  req.verified = `sha256=${signature}` === header;
  next();
}

function getRoomData(req, res) {
  let data = {
    method: req.method,
    url: req.url,
    headers: req.headers,
  };
  if (req.verified !== undefined) {
    data.verified = req.verified;
  }
  if (req.body) {
    data.body = req.body;
  }
  rooms.to(req.params.room).emit("request", JSON.stringify(data));
  return data;
}

/**
 * Redirect naked requests to a random room and use sockets to update
 * the room frontend for all requests regardless of method to /:room/data.
 */

app.get("/", (req, res) => {
  res.redirect("/" + shortid.generate());
});

app.get("/:room", cacheMiddleware, invalidRoomsMiddleware, (req, res) => {
  res.render("room.html", {
    room: req.params.room,
  });
});

app.all(
  "/:room",
  [corsMiddleware, invalidRoomsMiddleware, xHubSignatureMiddleware, upload.array()],
  (req, res) => {
    res.json(getRoomData(req, res));
  }
);

app.all(
  '/:room/data',
  [corsMiddleware, invalidRoomsMiddleware, xHubSignatureMiddleware, upload.array()],
  (req, res) => {
    res.json(getRoomData(req, res));
  }
);

/**
 * Get this party started
 */

server.listen(port);
console.log(`Listening on http://localhost:${port}`);
