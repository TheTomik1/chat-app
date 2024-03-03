import React, {useState} from "react";
import {toast} from "react-toastify";

import { FaTrash } from "react-icons/fa";
import axios from "axios";

import {useAuth} from "../context/Auth";

const CreateGroupChat = ({ onClose }) => {
    const { loggedInUser } = useAuth();

    const [selectedUsers, setSelectedUsers] = useState([]);
    const [addedUser, setAddedUser] = useState("");

    async function findUser(userName) {
        try {
            const userDetailsResponse = await axios.get(`user-details?userName=${userName}`);

            return userDetailsResponse.status === 200;
        } catch (e) {
            return false;
        }
    }

    async function createGroupChat() {
        // Exclude the logged-in user from counting.
        if (selectedUsers.length < 2) {
            toast("Group chat must have at least 3 participants.", { type: "error" });
            return;
        }

        selectedUsers.push(loggedInUser.userName);

        try {
            const createGroupChatResponse = await axios.post("create-chat", {
                participants: selectedUsers
            });

            if (createGroupChatResponse.status === 201) {
                toast("Group chat created successfully.", { type: "success" });
                onClose();
            }
        } catch (e) {
            if (e.response?.data.message === "Chat already exists.") {
                selectedUsers.pop(); // Remove the logged-in user from the list.
                toast("Group chat already exists.", { type: "error" });
                return;
            }

            toast("Failed to create group chat.", { type: "error" });
        }
    }

    const addSelectedUser = async(user) => {
        if (user === "" && user.length < 4) {
            toast("Username must be at least 4 characters long.", { type: "error" })
            return;
        }

        const userExists = await findUser(user);
        if (!userExists) {
            toast("User does not exist.", { type: "error" });
            return;
        }

        try {
            await axios.get(`chat-history?participants=${user}`);
        } catch (e) {
            toast("You must have a chat history with the user to create a group chat.", { type: "error" });
            return;
        }

        if (!selectedUsers.includes(user)) {
            setSelectedUsers([...selectedUsers, user]);
        } else {
            setSelectedUsers(selectedUsers.filter((selectedUser) => selectedUser !== user));
        }

        setAddedUser("");
    }

    return (
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg mx-auto">
            <h1 className="text-3xl font-bold text-center text-black dark:text-white mb-4">Create Group Chat</h1>
            <p className="text-gray-800 dark:text-white text-lg mb-4">Select users to add to the group chat</p>
            <input
                className="w-full p-4 h-12 bg-zinc-200 dark:bg-zinc-900 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                placeholder="Type the username of the user you want to invite..."
                value={addedUser}
                onChange={(e) => setAddedUser(e.target.value)}
            />
            <br/>
            <button
                className="bg-blue-500 text-white px-4 py-2 font-bold rounded-lg mb-4 hover:bg-blue-600"
                onClick={() => addSelectedUser(addedUser)}
            >
                Add User
            </button>
            <div className="mb-4">
                {selectedUsers.map((user, index) => (
                    <div key={index} className="bg-yellow-500 text-white px-4 py-2 font-bold rounded-lg mt-2 flex justify-between items-center">
                        <span>{user}</span>
                        <FaTrash onClick={() => setSelectedUsers(selectedUsers.filter((selectedUser) => selectedUser !== user))} />
                    </div>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    className="bg-green-500 text-white px-4 py-2 font-bold rounded-lg mb-2 sm:mb-0 hover:bg-green-600"
                    onClick={createGroupChat}>
                    Create Group Chat
                </button>
                <button
                    className="bg-red-500 text-white px-4 py-2 font-bold rounded-lg hover:bg-red-600"
                    onClick={onClose}>
                    Cancel
                </button>
            </div>
        </div>
    )
}

export default CreateGroupChat;