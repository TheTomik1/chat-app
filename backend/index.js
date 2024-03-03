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
// calendarApi.use(morgan('combined'));
calendarApi.use(cors({ origin: 'http://localhost:3000', credentials: true }));

calendarApi.use("/api", endpoints);
calendarApi.use("/message-attachment", express.static("./api/attachments"));


io.on("connection", (socket) => {
    socket.on("authenticate", (authData) => {
        if (!authData || !authData.userName || !authData.allowedChats || !Array.isArray(authData.allowedChats)) {
            socket.emit("authentication-failure", "Invalid authentication data");
            return;
        }
        socket.userAllowedChats = authData.allowedChats;
        socket.user = authData.userName;

        socket.userAllowedChats.forEach(chatId => {
            socket.join(chatId);
        });
    });


    socket.on("join-chat", (chatId) => {
        if (!socket.userAllowedChats || !socket.userAllowedChats.includes(chatId)) {
            socket.emit("join-chat-failure", "You are not authorized to join this chat");
            return;
        }

        socket.join(chatId);
    });

    socket.on("disconnect", () => {
        if (socket.user) {
            console.log("User disconnected:", socket.user);
        } else {
            console.log("An unauthorized user disconnected");
        }
    });

    socket.on("send-message", (message) => {
        if (!message || !message.chatId || !socket.userAllowedChats || !socket.userAllowedChats.includes(message.chatId)) {
            return;
        }

        io.to(message.chatId).emit("new-message", message); // Broadcasting the new message to all users in the chat
    });

    socket.on("edit-message", (editedMessage) => {
        if (!editedMessage || !editedMessage.chatId || !socket.userAllowedChats || !socket.userAllowedChats.includes(editedMessage.chatId)) {
            return;
        }
        io.to(editedMessage.chatId).emit("edited-message", editedMessage); // Broadcasting the edited message to all users in the chat
    });

    socket.on("delete-message", (messageId, chatId) => {
        if (!chatId || !socket.userAllowedChats || !socket.userAllowedChats.includes(chatId)) {
            return;
        }
        io.to(chatId).emit("deleted-message", messageId); // Broadcasting the deleted message to all users in the chat
    });

    socket.on("new-reaction", (reaction) => {
        if (!reaction || !reaction.chatId || !socket.userAllowedChats || !socket.userAllowedChats.includes(reaction.chatId)) {
            console.log("Invalid reaction or user not allowed to react in this chat");
            return;
        }
        io.to(reaction.chatId).emit("new-reaction", reaction); // Broadcasting the new reaction to all users in the chat
    });

    socket.on("new-attachment", (attachment) => {
        if (!attachment || !attachment.chatId || !socket.userAllowedChats || !socket.userAllowedChats.includes(attachment.chatId)) {
            console.log("Invalid attachment or user not allowed to attach in this chat");
            return;
        }
        io.to(attachment.chatId).emit("new-attachment", attachment); // Broadcasting the new attachment to all users in the chat
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