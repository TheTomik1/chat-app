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

io.on("connection", (socket) => {
    socket.on("authenticate", (authData) => {
        if (!authData || !authData.userName || !authData.allowedChats || !Array.isArray(authData.allowedChats)) {
            socket.emit("authentication-failure", "Invalid authentication data");
            return;
        }
        socket.userAllowedChats = authData.allowedChats;
        socket.user = authData.userName;
    });

    socket.on("join-chat", (chatId) => {
        console.log("Joining chat:", chatId);
        console.log("User allowed chats:", socket.userAllowedChats);

        if (!socket.userAllowedChats || !socket.userAllowedChats.includes(chatId)) {
            socket.emit("join-chat-failure", "You are not authorized to join this chat");
            console.log("User not allowed to join chat:", chatId);
            return;
        }

        console.log("Joining chat:", chatId);
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
        console.log("Sending message:", message);
        console.log("User allowed chats:", socket.userAllowedChats);

        if (!message || !message.chatId || !socket.userAllowedChats || !socket.userAllowedChats.includes(message.chatId)) {
            console.log("Invalid message or user not allowed to send message to this chat");
            return;
        }

        console.log("Emitting new-message event");
        io.to(message.chatId).emit("new-message", message); // Broadcasting the new message to all users in the chat
    });

    socket.on("edit-message", (editedMessage) => {
        console.log("Editing message:", editedMessage);
        console.log("User allowed chats:", socket.userAllowedChats);

        if (!editedMessage || !editedMessage.chatId || !socket.userAllowedChats || !socket.userAllowedChats.includes(editedMessage.chatId)) {
            console.log("Invalid message or user not allowed to edit message in this chat");
            return;
        }
        io.to(editedMessage.chatId).emit("edited-message", editedMessage); // Broadcasting the edited message to all users in the chat
    });

    socket.on("delete-message", (messageId, chatId) => {
        if (!chatId || !socket.userAllowedChats || !socket.userAllowedChats.includes(chatId)) {
            console.log("Invalid chatId or user not allowed to delete message in this chat");
            return;
        }
        io.to(chatId).emit("deleted-message", messageId); // Broadcasting the deleted message to all users in the chat
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