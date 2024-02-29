import React, { useState, useEffect } from "react";
import io from 'socket.io-client';
import axios from "axios";

import {useAuth} from "../context/Auth";

const Chat = () => {
    const { loggedInUser } = useAuth();

    const [socket, setSocket] = useState(null);

    const [users, setUsers] = useState([]);
    const [previousChats, setPreviousChats] = useState([]);

    const [currentChat, setCurrentChat] = useState({});
    const [currentChatHistory, setCurrentChatHistory] = useState([]);
    const [sessionMessages, setSessionMessages] = useState([]);
    const [currentChatNewMessage, setCurrentChatNewMessage] = useState("");

    const [userDetails, setUserDetails] = useState({});

    async function fetchUsers() {
        try {
            const response = await axios.get('list-users');

            if (response.status === 200) {
                setUsers(response.data.users);
            }
        } catch (e) {
            // No users found.
        }
    }

    async function fetchPreviousChats() {
        try {
            const response = await axios.get('previous-chats');

            if (response.status === 200) {
                setPreviousChats(response.data.previousChats);
            }
        } catch (e) {
            // No previous chats found.
        }
    }

    async function fetchChatHistory() {
        try {
            const response = await axios.get('chat-history', {
                params: { participants: currentChat.participants }
            });

            if (response.status === 200) {
                setCurrentChatHistory(response.data.chatHistory);
            }
        } catch (e) {
            // No chat history found.
        }
    }

    async function userDetail(userName) {
        try {
            const response = await axios.get(`user-details?userName=${userName}`);

            if (response.status === 200) {
                setUserDetails(response.data.user);
            }
        } catch (e) {
            // No user found.
        }
    }

    async function deleteChat() {
        try {
            const deleteChatResponse = await axios.post('delete-chat', {
                participants: currentChat.participants
            });

            if (deleteChatResponse.status === 201) {
                setCurrentChat({});
            }
        } catch (e) {
        }
    }

    useEffect(() => {
        fetchUsers();
        fetchPreviousChats();
    }, []);

    useEffect(() => {
        if (Object.keys(currentChat).length > 0) {
            fetchChatHistory();
        }
    }, [currentChat]);


    return (
        <div className="bg-zinc-200 dark:bg-zinc-900 min-h-screen p-4">
            <h1 className="text-4xl text-white font-semibold mb-4">Chat</h1>
            <p className="text-white text-xl">This is the chat page. You can chat with other users here.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="col-span-1 md:col-span-2">
                    <h2 className="text-4xl text-gray-800 dark:text-white font-semibold mb-4">Previous Chats</h2>
                    <div className="space-y-4">
                        {previousChats.map((chat, index) => (
                            <div key={index} className="bg-white dark:bg-zinc-800 p-6 w-1/2 rounded-lg shadow-md hover:cursor-pointer hover:scale-105 transition-transform">
                                <p className="text-gray-800 text-2xl dark:text-white font-semibold">{chat.participants.length > 2 ? "Group chat" : `Chat with ${chat.participants[0]}`}</p>
                                {chat.participants.length > 2 && (
                                    <p className="text-gray-600 dark:text-gray-400 text-lg">Participants: {chat.participants.filter(user => user !== loggedInUser.userName).join(', ')}</p>
                                )}
                                <div className="space-x-4">
                                    <button
                                        className="bg-green-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-green-600 transition-transform"
                                        onClick={() => userDetail(chat.participants[0])}>
                                        View Details
                                    </button>
                                    <button
                                        className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-blue-600 transition-transform"
                                        onClick={() => setCurrentChat(chat)}>
                                        Chat
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-1 md:col-span-1">
                    <h2 className="text-4xl text-gray-800 dark:text-white font-semibold mb-4">List of all users</h2>
                    <div className="space-y-4">
                        {users.filter(user => user.userName !== loggedInUser.userName).map((user, index) => (
                            <div key={index} className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md hover:cursor-pointer hover:scale-105 transition-transform">
                                <p className="text-gray-800 text-2xl dark:text-white font-semibold">{user.userName}</p>
                                <div className="space-x-4">
                                    <button
                                        className="bg-green-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-green-600 transition-transform"
                                        onClick={() => userDetail(user.userName)}>
                                        View Details
                                    </button>
                                    <button
                                        className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-blue-600 transition-transform"
                                        onClick={() => setCurrentChat({ participants: [loggedInUser.userName, user.userName] })}>
                                        Chat
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8">
                {Object.keys(currentChat).length > 0 ? (
                    <>
                        <h2 className="text-4xl text-gray-800 dark:text-white font-semibold mb-4">{currentChat.participants.length > 2 ? "Group chat" : `Chat with ${currentChat.participants[0]}`}</h2>
                        <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md">
                            <div className="space-y-4">
                                // The chat will be here. Live and history.
                            </div>
                            <form className="mt-4" onSubmit={null}>
                                <input
                                    className="w-full p-4 h-12 bg-zinc-200 dark:bg-zinc-900 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Type your message here..."
                                    value={currentChatNewMessage}
                                    onChange={e => setCurrentChatNewMessage(e.target.value)}
                                />
                                <div className="space-x-4">
                                    <button
                                        className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-blue-600 transition-transform"
                                        type="submit">
                                        Send
                                    </button>
                                    <button
                                        className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-red-600 transition-transform"
                                        onClick={() => setCurrentChat({})}>Close Chat
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <p className="text-gray-800 dark:text-white text-xl">Select a chat to start chatting.</p>
                )}
            </div>
        </div>
    );
};

export default Chat;
