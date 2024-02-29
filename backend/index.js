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
    socket.on("authenticate", (authData) => {
        socket.userAllowedChats = authData.allowedChats.map((chat) => chat._id);
        socket.user = authData.userName;
    });

    socket.on("join-chat", (chatId) => {
        if (socket.userAllowedChats && socket.userAllowedChats.includes(chatId)) {
          socket.join(chatId);
        } else {
        }
    });

    socket.on("disconnect", () => {
      if (socket.user) {
        console.log("User disconnected:", socket.user);
      } else {
        console.log("An unauthorized user disconnected");
      }
    });

    socket.on("send-message", (message) => {
        if (socket.userAllowedChats && socket.userAllowedChats.includes(message.chatId)) {
            io.to(message.chatId).emit("new-message", message);
        } else {
            console.log("User not allowed to send message to this chat");
        }
    });

    socket.on("edit-message", (editedMessage) => {
        if (socket.userAllowedChats && socket.userAllowedChats.includes(editedMessage.chatId)) {
            io.to(editedMessage.chatId).emit("edited-message", editedMessage);
        } else {
            console.log("User not allowed to edit message in this chat");
        }
    });

    socket.on("delete-message", (messageId) => {
      // Similar authentication and permission checks for deleting messages
    });

    socket.on("add-reaction", (reaction) => {
      // Similar authentication and permission checks for adding reactions
    });

    // Add more event handlers as needed
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