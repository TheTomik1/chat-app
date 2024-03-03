import React, { useEffect, useState } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import axios from "axios";
import socketIOClient from "socket.io-client";
import { toast } from "react-toastify";
import EmojiPicker, { Theme } from 'emoji-picker-react';

import {FaEdit, FaTrash, FaGrinBeam, FaPaperclip} from "react-icons/fa";
import {MdModeEditOutline} from "react-icons/md";

import { useAuth } from "../context/Auth";
import { usePageTheme } from "../context/PageTheme";

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
    const { isDarkMode } = usePageTheme();

    const [socket, setSocket] = useState(null);

    const [allowedChats, setAllowedChats] = useState([]);
    const [currentChatHistory, setCurrentChatHistory] = useState([]);
    const [currentChatProfilePictures, setCurrentChatProfilePictures] = useState({});
    const [currentChatNewMessage, setCurrentChatNewMessage] = useState("");
    const [chatEditMessage, setChatEditMessage] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [displayedMessages, setDisplayedMessages] = useState(10);

    const [invitedUser, setInvitedUser] = useState([]);
    const [invitationFormOpenend, setInvitationFormOpened] = useState(false);

    const [addEmojiMessage, setAddEmojiMessage] = useState(null);
    const [addEmoji, setAddEmoji] = useState(false);

    const [attachment, setAttachment] = useState(null);

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
            for (const participant of participants) {
                const response = await axios.get("profile-picture", {
                    params: { userName: participant },
                    responseType: "blob",
                });

                const url = URL.createObjectURL(response.data);
                setCurrentChatProfilePictures(prevPictures => ({ ...prevPictures, [participant]: url }));
            }
        } catch (e) {
            // No profile picture found.
        }
    }

    async function inviteUser(e, userName) {
        e.preventDefault();

        try {
            const inviteUserResponse = await axios.post("invite-user", {
                participants: currentChat.participants,
                chatId: currentChat._id,
                invitee: userName,
            });

            if (inviteUserResponse.status === 201) {
                toast("User invited to chat. Reloading...", { type: "success" });
                setInvitedUser("");

                await new Promise(r => setTimeout(r, 5000));
                window.location.reload();
            }
        } catch (e) {
            if (e.response?.data.message === "Chat with invitee already exists.") {
                toast("User is already in chat.", { type: "error" });
            } else if (e.response?.data.message === "Invitee not found.") {
                toast("User not found.", { type: "error" });
            }
        }
    }

    async function leaveChat(e) {
        e.preventDefault();

        try {
            const leaveChatResponse = await axios.post("leave-chat", {
                participants: currentChat.participants,
                chatId: currentChat._id,
            });

            if (leaveChatResponse.status === 201) {
                toast("Left chat successfully.", { type: "success" });
                setCurrentChat({});
            }
        } catch (e) {
            toast("Failed to leave chat.", { type: "error" });
        }
    }

    async function deleteChat(e) {
        e.preventDefault();

        try {
            const deleteChatResponse = await axios.post("delete-chat", {
                chatId: currentChat._id,
            });

            if (deleteChatResponse.status === 201) {
                toast("Chat deleted successfully.", { type: "success" });
                setCurrentChat({});
            }
        } catch (e) {
            toast("Failed to delete chat.", { type: "error" });
        }
    }

    async function sendMessage(e) {
        e.preventDefault();

        if (currentChatNewMessage === "") {
            toast("Message cannot be empty.", { type: "error" });
            return;
        }

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
                    messageId: sendMessageResponse.data.messageId,
                });

                setCurrentChatNewMessage("");
            }
        } catch (e) {
            if (e.response?.status === 500) {
                toast("You must create a chat before sending a message.", { type: "error" });
                return;
            }
            toast("Failed to send message.", { type: "error" });
        }
    }

    async function editMessage(e) {
        e.preventDefault();

        try {
            const editMessageResponse = await axios.post("edit-message", {
                participants: currentChat.participants,
                message: chatEditMessage.content,
                messageId: chatEditMessage._id || chatEditMessage.messageId,
            });

            if (editMessageResponse.status === 201 && socket) {
                socket.emit("edit-message", {
                    messageId: chatEditMessage._id || chatEditMessage.messageId,
                    content: chatEditMessage.content,
                    timestamp: new Date().toISOString(),
                    chatId: currentChat._id,
                });

                setChatEditMessage(null);
            }
        } catch (e) {
            toast("Failed to edit message.", { type: "error" });
        }
    }

    const startEditMessage = (message) => {
        setEditingMessageId(message._id || message.messageId);
        setChatEditMessage(message);
    };

    const cancelEditMessage = () => {
        setEditingMessageId(null);
        setChatEditMessage(null);
    };

    async function uploadAttachment(e) {
        const targetFile = e.target.files[0];

        const formData = new FormData();
        formData.append("file", targetFile);
        formData.append("messageId", attachment._id || attachment.messageId);

        try {
            const uploadAttachmentResponse = await axios.post("upload-attachment", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (uploadAttachmentResponse.status === 201 && socket) {
                toast("Attachment uploaded successfully.", { type: "success" });

                socket.emit("new-attachment", {
                    messageId: attachment._id || attachment.messageId,
                    chatId: currentChat._id,
                    filename: uploadAttachmentResponse.data.filename,
                    contentType: uploadAttachmentResponse.data.contentType,
                    size: uploadAttachmentResponse.data.size,
                });

                setAttachment(null);
            }
        } catch (e) {
            toast("Failed to upload attachment.", { type: "error" });
        }
    }

    async function deleteAttachment(attachment, messageId) {
        try {
            const deleteAttachmentResponse = await axios.post("delete-attachment", {
                messageId
            });

            if (deleteAttachmentResponse.status === 201 && socket) {
                socket.emit("delete-attachment", attachment, currentChat._id);
                toast("Attachment deleted successfully.", { type: "success" });
            }
        } catch (e) {
            toast("Failed to delete attachment.", { type: "error" });
        }
    }

    async function deleteMessage(messageId) {
        try {
            const deleteMessageResponse = await axios.post("delete-message", {
                participants: currentChat.participants,
                messageId,
            });

            if (deleteMessageResponse.status === 201 && socket) {
                socket.emit("delete-message", messageId, currentChat._id);
                toast("Message deleted successfully.", { type: "success" });
            }
        } catch (e) {
            toast("Failed to delete message.", { type: "error" });
        }
    }

    const loadMoreMessages = () => {
        setDisplayedMessages(displayedMessages + 20);
    };

    const handleInvitation = (e) => {
        e.preventDefault();
        if (invitationFormOpenend === true) {
            setInvitationFormOpened(false);
        } else {
            setInvitationFormOpened(true);
        }
    }

    const addReaction = async(emoji) => {
        try {
            const addReactionResponse = await axios.post("add-reaction", {
                participants: currentChat.participants,
                messageId: addEmojiMessage._id || addEmojiMessage.messageId,
                emoji: emoji.emoji,
            });

            if (addReactionResponse.status === 201 && socket) {
                socket.emit("new-reaction", {
                    messageId: addEmojiMessage._id || addEmojiMessage.messageId,
                    emoji: emoji.emoji,
                    timestamp: new Date().toISOString(),
                    chatId: currentChat._id,
                    count: addReactionResponse.data.count,
                });

                setAddEmojiMessage(null);
            }
        } catch (e) {
            if (e.response?.data.message === "Maximum 10 reactions allowed per message.") {
                toast("Maximum 10 reactions allowed per message.", { type: "error" });
                return;
            }
            if (e.response?.data.message === "You have already reacted with this emoji.") {
                toast("You already reacted with this emoji.", { type: "error" });
                return;
            }

            toast("Failed to add reaction.", { type: "error" });
        }
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
                } else {
                    // No allowed chats found
                }
            });

            newSocket.on('new-message', (newMessage) => {
                setCurrentChatHistory(prevHistory => [...prevHistory, newMessage]);
            });

            newSocket.on('edit-message', (editedMessage) => {
                console.log("Received edited message", editedMessage)

                setCurrentChatHistory(prevHistory => prevHistory.map(message => {
                    if (message._id === editedMessage.messageId || message.messageId === editedMessage.messageId) {
                        return { ...message, content: editedMessage.content, edited: true };
                    }
                    return message;
                }));
            });

            newSocket.on('delete-message', (deletedMessageId) => {
                setCurrentChatHistory(prevHistory => prevHistory.filter(message => message._id || message.messageId !== deletedMessageId));
            });

            newSocket.on('new-reaction', (reaction) => {
                setCurrentChatHistory(prevHistory => prevHistory.map(message => {
                    if (message.messageId === reaction.messageId || message._id === reaction.messageId) {
                        const updatedEmojis = Array.isArray(message.emojis) ? [...message.emojis] : [];
                        const existingEmojiIndex = updatedEmojis.findIndex(emoji => emoji.emoji === reaction.emoji);
                        if (existingEmojiIndex === -1) {
                            updatedEmojis.push({ emoji: reaction.emoji, users: [loggedInUser.userName], count: reaction.count });
                        } else {
                            // Update the existing reaction's count
                            updatedEmojis[existingEmojiIndex].count = reaction.count;
                        }
                        return { ...message, emojis: updatedEmojis };
                    }
                    return message;
                }));
            });

            newSocket.on('new-attachment', (attachment) => {
                setCurrentChatHistory(prevHistory => prevHistory.map(message => {
                    if (message._id === attachment.messageId || message.messageId === attachment.messageId) {
                        return { ...message, attachment: attachment };
                    }
                    return message;
                }));
            });

            newSocket.on('delete-attachment', (attachment) => {
                setCurrentChatHistory(prevHistory => prevHistory.map(message => {
                    if (message._id === attachment.messageId || message.messageId === attachment.messageId) {
                        return { ...message, attachment: undefined };
                    }
                    return message;
                }));
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
                    <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                        <img src={currentChatProfilePictures[message.sender] || "https://robohash.org/noprofilepic.png"} alt="UserProfilePicture" className="w-12 h-12 rounded-full" />
                        <div className="flex flex-col">
                            <div className="flex flex-col space-x-2 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center space-x-2">
                                    <p className="font-bold text-black dark:text-white">{message.sender}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatMessageTimestamp(message.timestamp)}</p>
                                </div>
                                {message.edited && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Edited</p>
                                )}
                            </div>
                            <p className="text-gray-800 dark:text-white">{message.content}</p>
                            {message.emojis && message.emojis.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    {message.emojis.map((reaction, index) => (
                                        <p key={index} className="text-2xl bg-blue-300 bg-opacity-70 border-blue-600 border-2 rounded-xl text-black dark:text-white p-1">{reaction.emoji} {reaction.count}</p>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                                {loggedInUser.userName === message.sender && (
                                    <>
                                        <FaEdit className="text-blue-500 hover:text-blue-600 transition-transform no-select" onClick={() => startEditMessage(message)} />
                                        <FaTrash className="text-red-500 hover:text-red-600 transition-transform no-select" onClick={() => deleteMessage(message._id || message.messageId)} />
                                        <FaPaperclip className="text-green-500 hover:text-green-600 transition-transform no-select" onClick={() => setAttachment(message)} />
                                    </>
                                )}
                                <FaGrinBeam className="text-yellow-500 hover:text-yellow-600 transition-transform no-select" onClick={() => setAddEmojiMessage(message)} />
                            </div>
                        </div>
                    </div>
                    {message.attachment?.filename && (
                        <>
                            <div className="flex items-center space-x-4 mt-2">
                                {message.attachment?.contentType.startsWith("image") && (
                                    <img src={`http://localhost:8080/message-attachment/${message.attachment.filename}`} alt="Attachment" className="w-1/3 h-1/3 rounded-xl" />
                                )}
                                {message.attachment.contentType.startsWith("video") && (
                                    <video src={`http://localhost:8080/message-attachment/${message.attachment.filename}`} controls className="w-1/3 h-1/3 rounded-xl" />
                                )}
                                {message.attachment.contentType.startsWith("audio") && (
                                    <audio src={`http://localhost:8080/message-attachment/${message.attachment.filename}`} controls className="w-72 rounded-xl" />
                                )}
                            </div>
                            {loggedInUser.userName === message.sender && (
                                <button className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-red-600 transition-transform"
                                    onClick={() => deleteAttachment(message.attachment, message._id || message.messageId)}>Delete Attachment</button>
                            )}
                        </>
                    )}
                    {chatEditMessage && editingMessageId === (message._id || message.messageId) && (
                        <form className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between" onSubmit={editMessage}>
                            <input
                                className="w-full md:w-auto p-4 h-12 bg-zinc-400 dark:bg-zinc-900 dark:text-white text-black placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Edit your message..."
                                value={chatEditMessage.content}
                                onChange={(e) => setChatEditMessage(prevMessage => ({ ...prevMessage, content: e.target.value }))}
                            />
                            <div className="flex items-center space-x-4 mt-4 md:mt-0">
                                <button
                                    className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg hover:bg-blue-600 transition-transform"
                                    type="submit"
                                >
                                    Save
                                </button>
                                <button
                                    className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg hover:bg-red-600 transition-transform"
                                    onClick={cancelEditMessage}
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
                <div className="flex flex-col md:flex-row md:justify-between mt-4">
                    <div className="space-y-4 space-x-4 md:space-y-0 md:space-x-4 md:flex md:items-center">
                        <button
                            className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg mt-4 md:mt-0 hover:bg-blue-600 transition-transform"
                            type="submit"
                        >
                            Send
                        </button>
                        {currentChat.participants.length > 2 && currentChatHistory.length > 0 && (
                            <button
                                className="bg-green-500 text-white px-4 py-2 font-bold rounded-lg mt-4 md:mt-0 hover:bg-green-600 transition-transform"
                                onClick={handleInvitation}
                            >
                                Invite User
                            </button>
                        )}
                    </div>
                    <div className="flex items-end space-x-4">
                        <button
                            className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 md:mt-0 hover:bg-red-600 transition-transform"
                            onClick={() => setCurrentChat({})}
                        >
                            Close Chat
                        </button>
                        {currentChatHistory.length > 0 && (
                            <>
                                <button
                                    className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 md:mt-0 hover:bg-red-600 transition-transform"
                                    onClick={(e) => leaveChat(e)}
                                >
                                    Leave Chat
                                </button>
                                <button
                                    className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 md:mt-0 hover:bg-red-600 transition-transform"
                                    onClick={(e) => deleteChat(e)}
                                >
                                    Delete Chat
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </form>
            {invitationFormOpenend && (
                <form className="mt-4" onSubmit={(e) => inviteUser(e, invitedUser)}>
                    <input
                        className="w-full p-4 h-12 bg-zinc-200 dark:bg-zinc-900 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type the username of the user you want to invite..."
                        value={invitedUser}
                        onChange={(e) => setInvitedUser(e.target.value)}
                    />
                    <div className="space-x-4">
                        <button
                            className="bg-green-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-green-600 transition-transform"
                            type="submit"
                        >
                            Invite
                        </button>
                        <button
                            className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-red-600 transition-transform"
                            onClick={handleInvitation}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
            {addEmojiMessage && (
                <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-opacity-50 bg-zinc-900">
                    <div className="bg-white dark:bg-zinc-800 p-4 sm:p-8 rounded-lg shadow-lg max-w-md flex flex-col items-center">
                        <EmojiPicker
                            onEmojiClick={(emoji) => addReaction(emoji)}
                            emojiStyle={"twitter"}
                            theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                        >
                        </EmojiPicker>
                        <button
                            className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-red-600 transition-transform"
                            onClick={() => setAddEmojiMessage(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
            {attachment && (
                <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-opacity-50 bg-zinc-900">
                    <div
                        className="bg-white dark:bg-zinc-800 p-4 sm:p-8 rounded-lg shadow-lg max-w-md flex flex-col items-center">
                        <h1 className="text-2xl font-bold text-black dark:text-white">Add your attachment</h1>
                        <p className="text-gray-500 dark:text-gray-400">You can upload an image, video, or audio file.</p>
                        <label htmlFor="fileInput" className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-blue-600 transition-transform cursor-pointer">
                            Upload Attachment
                        </label>
                        <input
                            type="file"
                            id="fileInput"
                            className="hidden"
                            accept={".png, .jpg, .jpeg, .mp4, .mp3"}
                            onChange={uploadAttachment}
                        />
                        <button
                            className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg mt-4 hover:bg-red-600 transition-transform"
                            onClick={() => setAttachment(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListChatMessages;
