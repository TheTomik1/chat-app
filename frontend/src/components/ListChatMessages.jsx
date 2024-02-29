import React, { useEffect, useState } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import axios from "axios";
import socketIOClient from "socket.io-client";

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

    const [currentChatHistory, setCurrentChatHistory] = useState([]);
    const [currentChatNewMessage, setCurrentChatNewMessage] = useState("");

    async function fetchChatHistory() {
        console.log("Fetching chat history...");

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

    async function sendMessage(e) {
        e.preventDefault();

        try {
            if (socket) {
                socket.emit("join-chat", currentChat._id);

                const sendMessageResponse = await axios.post("send-message", {
                    participants: currentChat.participants,
                    message: currentChatNewMessage,
                });

                if (sendMessageResponse.status === 201) {
                    setCurrentChatHistory([
                        ...currentChatHistory,
                        {
                            sender: loggedInUser.userName,
                            content: currentChatNewMessage,
                            timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
                        },
                    ]);
                    setCurrentChatNewMessage("");
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        if (currentChat.participants) {
            fetchChatHistory();
            const newSocket = socketIOClient("http://localhost:8080");
            setSocket(newSocket);

            newSocket.on('new-message', (newMessage) => {
                console.log("Received new message:", newMessage);
                setCurrentChatHistory(prevHistory => [...prevHistory, newMessage]);
            });
        }
    }, [currentChat.participants]);


    return (
        <div className="w-full bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4">
            {currentChatHistory.map((message) => (
                <div key={message._id} className="bg-zinc-200 dark:bg-zinc-700 rounded-lg shadow-lg p-4 hover:cursor-pointer mb-4">
                    <div className="flex items-center space-x-4">
                        <img src="https://robohash.org/noprofilepic.png" alt="UserProfilePicture" className="w-12 h-12 rounded-full"/>
                        <div>
                            <div className="flex flex-row space-x-4 items-center">
                                <p className="font-bold text-black dark:text-white">{message.sender}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{formatMessageTimestamp(message.timestamp)}</p>
                            </div>
                            <p className="text-dark dark:text-white">{message.content}</p>
                            <div className="flex items-center space-x-4 mt-2">
                                <FaEdit className="text-blue-500 hover:text-blue-600 transition-transform"/>
                                <FaTrash className="text-red-500 hover:text-red-600 transition-transform"/>
                                <FaGrinBeam className="text-yellow-500 hover:text-yellow-600 transition-transform"/>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
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
