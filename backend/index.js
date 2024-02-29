process.env["DEBUG"] = "chat-app-api chat-app-api:mongo";

const cookieParser = require('cookie-parser');
const express = require("express");
const morgan = require('morgan');
const cors = require('cors');
const debug = require('debug')('chat-app-api');
const { Server } = require('socket.io');
const http = require('http');

require("./mongo-db/connection.js");

const endpoints = require("./api/endpoints");

const calendarApi = express();

const calendarApiServer = http.createServer(calendarApi);
const io = new Server(calendarApiServer, { cors: { origin: 'http://localhost:3000', credentials: true } });

calendarApi.use((req, res, next) => {
  req.io = io;
  next();
});

calendarApi.use(express.json());
calendarApi.use(cookieParser());
calendarApi.use(morgan('combined'));
calendarApi.use(cors({ origin: 'http://localhost:3000', credentials: true }));

calendarApi.use("/api", endpoints);

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join-chat", (chatId) => {
    console.log(`User joined chat ${chatId}`);
    socket.join(chatId);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

calendarApiServer.listen(8080);
calendarApiServer.on('listening', onListening);
calendarApiServer.on('error', onError);

/**
 * @description Logs that the server is listening for incoming requests.
 */
function onListening() {
  let address = calendarApiServer.address();
  debug(`Listening for incoming requests on port ${address.port}.`);
}

/**
 * @param error - An error that has occurred.
 * @description Logs the error and exits the process.
 */
function onError(error) {
  debug(`Error occurred: ${error}.`);
}