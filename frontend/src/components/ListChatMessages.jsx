import React, { useEffect, useState } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import axios from "axios";
import socketIOClient from "socket.io-client";
import { toast } from "react-toastify";

import { FaEdit, FaTrash, FaGrinBeam } from "react-icons/fa";

import { useAuth } from "../context/Auth";

function formatMessageTimestamp(timestamp) {
    const messageDate = parseISO(timestamp);

    if (isToday(messageDate)) {
        return `Today at ${messageDate.toLocaleTimeString()}`;
    } else if (isYesterday(messageDate)) {
        return `Yesterday at ${messageDate.toLocaleTimeString()}`;
    } else {
        return format(messageDate, "dd/MM/yyyy HH:mm:ss");
    }
}

const ListChatMessages = ({ currentChat, setCurrentChat }) => {
    const { loggedInUser } = useAuth();
    const [socket, setSocket] = useState(null);

    const [allowedChats, setAllowedChats] = useState([]);
    const [currentChatHistory, setCurrentChatHistory] = useState([]);
    const [currentChatProfilePictures, setCurrentChatProfilePictures] = useState({});
    const [currentChatNewMessage, setCurrentChatNewMessage] = useState("");
    const [currentChatEditMessage, setCurrentChatEditMessage] = useState(null);
    const [displayedMessages, setDisplayedMessages] = useState(10);

    async function fetchChatHistory() {
        try {
            const chatHistoryResponse = await axios.get("chat-history", {
                params: { participants: currentChat.participants },
            });

            if (chatHistoryResponse.status === 200) {
                setCurrentChatHistory(chatHistoryResponse.data.chatHistory.messages);
            }
        } catch (e) {
            // No chat history found.
        }
    }

    async function fetchAllowedChats() {
        try {
            const chatsResponse = await axios.get("chats");

            if (chatsResponse.status === 200) {
                setAllowedChats(chatsResponse.data.chats);
            }
        } catch (e) {
            // No chats found.
        }
    }

    async function fetchProfilePictures(participants) {
        try {
            const fetchPromises = participants.map(async participant => {
                if (!currentChatProfilePictures[participant]) {
                    const response = await axios.get("profile-picture", {
                        params: { userName: participant },
                        responseType: "blob",
                    });
                    const url = URL.createObjectURL(response.data);
                    return { participant, url };
                }
                return null;
            });

            const results = await Promise.all(fetchPromises);
            const newPictures = results.filter(result => result !== null);

            setCurrentChatProfilePictures(prevPictures => {
                const updatedPictures = { ...prevPictures };
                newPictures.forEach(({ participant, url }) => {
                    updatedPictures[participant] = url;
                });
                return updatedPictures;
            });
        } catch (error) {
            // Handle errors
        }
    }

    async function sendMessage(e) {
        // Send message to backend and emit to socket
        e.preventDefault();

        try {
            const sendMessageResponse = await axios.post("send-message", {
                participants: currentChat.participants,
                message: currentChatNewMessage,
            });

            if (sendMessageResponse.status === 201 && socket) {
                const chatId = sendMessageResponse.data.chatId;
                setCurrentChat(prevChat => ({ ...prevChat, _id: chatId }));

                fetchAllowedChats();

                socket.emit("join-chat", chatId);

                socket.emit("send-message", {
                    sender: loggedInUser.userName,
                    content: currentChatNewMessage,
                    timestamp: new Date().toISOString(),
                    chatId: currentChat._id,
                });

                setCurrentChatNewMessage("");
            }
        } catch (e) {
            toast("Failed to send message.", { type: "error" });
        }
    }

    async function editMessage(e) {
        // Edit message in backend and emit to socket
        e.preventDefault();

        try {
            const editMessageResponse = await axios.post("edit-message", {
                participants: currentChat.participants,
                message: currentChatEditMessage.content,
                messageId: currentChatEditMessage._id,
            });

            if (editMessageResponse.status === 201 && socket) {
                socket.emit("edit-message", {
                    messageId: currentChatEditMessage._id,
                    content: currentChatEditMessage.content,
                    timestamp: new Date().toISOString(),
                    chatId: currentChat._id,
                });

                setCurrentChatEditMessage(null);
            }
        } catch (e) {
            toast("Failed to edit message.", { type: "error" });
        }
    }

    async function deleteMessage(messageId) {
        // Delete message in backend and emit to socket
        try {
            const deleteMessageResponse = await axios.post("delete-message", {
                participants: currentChat.participants,
                messageId,
            });

            if (deleteMessageResponse.status === 201 && socket) {
                socket.emit("delete-message", messageId, currentChat._id);
            }
        } catch (e) {
            toast("Failed to delete message.", { type: "error" });
        }
    }

    const loadMoreMessages = () => {
        setDisplayedMessages(displayedMessages + 20);
    };

    useEffect(() => {
        if (currentChat.participants) {
            fetchChatHistory();
            fetchAllowedChats();
            fetchProfilePictures(currentChat.participants);
        }
    }, [currentChat.participants]);

    useEffect(() => {
        const newSocket = socketIOClient("http://localhost:8080");
        setSocket(newSocket);

        if (newSocket) {
            newSocket.on('connect', () => {
                if (allowedChats && Array.isArray(allowedChats)) {
                    newSocket.emit("authenticate", { allowedChats: allowedChats.map(chat => chat._id), userName: loggedInUser.userName });

                    if (currentChat._id) {
                        newSocket.emit("join-chat", currentChat._id);
                    }
                } else {
                    console.log("Allowed chats not available or invalid.");
                }
            });

            newSocket.on('new-message', (newMessage) => {
                console.log("Received new message:", newMessage);
                setCurrentChatHistory(prevHistory => [...prevHistory, newMessage]);
            });

            newSocket.on('edited-message', (editedMessage) => {
                setCurrentChatHistory(prevHistory => prevHistory.map(message => {
                    if (message._id === editedMessage.messageId) {
                        return { ...message, content: editedMessage.content, edited: true };
                    }
                    return message;
                }));
            });

            newSocket.on('deleted-message', (deletedMessageId) => {
                setCurrentChatHistory(prevHistory => prevHistory.filter(message => message._id !== deletedMessageId));
            });
        }

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [allowedChats, currentChat._id, loggedInUser.userName]);

    return (
        <div className="w-full bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4">
            {currentChatHistory.slice(Math.max(currentChatHistory.length - displayedMessages, 0)).map((message) => (
                <div key={message._id} className="bg-zinc-200 dark:bg-zinc-700 rounded-lg shadow-lg p-4 hover:cursor-pointer mb-4">
                    <div className="flex items-center space-x-4">
                        <img src={currentChatProfilePictures[message.sender] || "https://robohash.org/noprofilepic.png"} alt="UserProfilePicture" className="w-12 h-12 rounded-full" />
                        <div>
                            <div className="flex flex-row space-x-4 items-center">
                                <p className="font-bold text-black dark:text-white">{message.sender}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{formatMessageTimestamp(message.timestamp)}</p>
                            </div>
                            <p className="text-gray-800 dark:text-white">{message.content}</p>
                            {message.edited && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Edited</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                                {loggedInUser.userName === message.sender && (
                                    <>
                                        <FaEdit className="text-blue-500 hover:text-blue-600 transition-transform no-select"
                                                onClick={() => setCurrentChatEditMessage(message)}/>
                                        <FaTrash className="text-red-500 hover:text-red-600 transition-transform"
                                                onClick={() => deleteMessage(message._id)}/>
                                    </>
                                )}

                                <FaGrinBeam className="text-yellow-500 hover:text-yellow-600 transition-transform"/>
                            </div>
                        </div>
                    </div>
                    {currentChatEditMessage !== null && currentChatEditMessage._id === message._id && (
                        <form className="mt-4" onSubmit={editMessage}>
                            <input
                                className="w-full p-4 h-12 bg-zinc-400 dark:bg-zinc-900 dark:text-white text-black placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Type your message here..."
                                value={currentChatEditMessage.content}
                                onChange={(e) => setCurrentChatEditMessage(prevMessage => ({ ...prevMessage, content: e.target.value }))}
                            />
                            <div className="space-x-4">
                                <button
                                    className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-blue-600 transition-transform"
                                    type="submit"
                                >
                                    Save
                                </button>
                                <button
                                    className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-red-600 transition-transform"
                                    onClick={() => setCurrentChatEditMessage(null)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            ))}
            {currentChatHistory.length > displayedMessages && (
                <button
                    className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-blue-600 transition-transform"
                    onClick={loadMoreMessages}
                >
                    Load More
                </button>
            )}
            <form className="mt-4" onSubmit={sendMessage}>
                <input
                    className="w-full p-4 h-12 bg-zinc-200 dark:bg-zinc-900 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your message here..."
                    value={currentChatNewMessage}
                    onChange={(e) => setCurrentChatNewMessage(e.target.value)}
                />
                <div className="space-x-4">
                    <button
                        className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-blue-600 transition-transform"
                        type="submit"
                    >
                        Send
                    </button>
                    <button
                        className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-red-600 transition-transform"
                        onClick={() => setCurrentChat({})}
                    >
                        Close Chat
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ListChatMessages;
