import React, {useEffect, useState} from "react";
import {toast} from "react-toastify";
import axios from "axios";

import {useAuth} from "../context/Auth";
import {useNavigate} from "react-router-dom";

import {MdModeEditOutline} from "react-icons/md";

const Profile = () => {
    const { loggedInUser, loggedInUserProfilePicture } = useAuth();
    const navigate = useNavigate();

    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [isFormValid, setIsFormValid] = useState(false);

    const fetchUserDetails = async () => {
        try {
            const response = await axios.get(`user-details?userName=${loggedInUser.userName}`);

            setUserEmail(response.data.user.email);
            setUserName(response.data.user.userName);
        } catch (error) {
            toast("Error fetching user details.", { type: "error" })
        }
    }

    const calculatePasswordStrength = (password) => {
        const lengthCondition = password.length >= 8;
        const lowercaseCondition = /[a-z]/.test(password);
        const uppercaseCondition = /[A-Z]/.test(password);
        const numberCondition = /[0-9]/.test(password);
        const specialCharCondition = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(password);

        return (lengthCondition ? 1 : 0) + (lowercaseCondition ? 1 : 0) + (uppercaseCondition ? 1 : 0) + (numberCondition ? 1 : 0) + (specialCharCondition ? 1 : 0);
    }

    const validateForm = () => {
        let isValid = true;

        if (userName.length < 3) {
            isValid = false;
        }

        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail) === false) {
            isValid = false;
        }

        setIsFormValid(isValid);
        return isValid;
    }

    const validatePassword = () => {
        if (newPassword.length > 0 && calculatePasswordStrength(newPassword) !== 4) {
            setIsFormValid(false);
            return false;
        }
        return true;
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        switch (name) {
            case "userName":
                setUserName(value);
                break;
            case "userEmail":
                setUserEmail(value);
                break;
            case "newPassword":
                setNewPassword(value);
                setPasswordStrength(calculatePasswordStrength(value));
                validatePassword();
                break;
        }
        validateForm();
    }

    async function saveChanges() {
        try {
            const updateUserResponse = await axios.post("update-user", {
                userName: userName,
                email: userEmail,
                password: newPassword
            });

            if (updateUserResponse.status === 201) {
                if (newPassword.length > 0) {
                    toast("User details updated successfully. You will be logged out in 5 seconds.", { type: "success" });
                    await new Promise(r => setTimeout(r, 5000));

                    await axios.post("http://localhost:8080/api/logout", null);
                    navigate("/");
                } else {
                    toast("User details updated successfully.", { type: "success" });
                    await new Promise(r => setTimeout(r, 5000));

                    navigate("/chat");
                }
            }
        } catch (error) {
            if (error.response?.data.message === "User already exists.") {
                toast("Such username or email already exists.", { type: "error" });
            } else {
                toast("Error updating user details.", { type: "error" });
            }
        }
    }

    async function updateProfilePicture(event) {
        const targetFile = event.target.files[0];

        const formData = new FormData();
        formData.append("file", targetFile);

        try {
            const uploadFileResponse = await axios.post("upload-profile-picture", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            if (uploadFileResponse.status === 201) {
                toast("Profile picture updated successfully.", { type: "success" });
                await new Promise(r => setTimeout(r, 5000));
                navigate("/chat");
                window.location.reload();
            }
        } catch (error) {
            toast("Error updating profile picture.", { type: "error" });
        }
    }

    useEffect(() => {
        fetchUserDetails();
    }, []);

    return (
        <div className="text-center bg-zinc-200 dark:bg-zinc-900 min-h-screen p-4">
            <h1 className="text-4xl text-black dark:text-white font-semibold mb-4">Profile</h1>
            <p className="text-black dark:text-white text-xl">This is the profile page. You can see your personal
                information here.</p>

            <div className="flex justify-center">
                <div className="mt-8 w-1/2 bg-zinc-500 dark:bg-zinc-700 p-4 rounded-md hover:cursor-pointer">
                    <div className="flex justify-center">
                        <div className="relative w-32 h-32 rounded-full border-4 border-white overflow-hidden group">
                            <div className="w-32 h-32 overflow-hidden rounded-full">
                                <img
                                    src={loggedInUserProfilePicture}
                                    alt="Profile picture."
                                    className="w-full h-full object-cover select-none"
                                />
                            </div>
                            <div
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 bg-black bg-opacity-50 rounded-full">
                                <label htmlFor="fileInput" className="cursor-pointer">
                                    <MdModeEditOutline className="text-white text-2xl"/>
                                </label>
                                <input
                                    type="file"
                                    id="fileInput"
                                    className="hidden"
                                    accept={".png, .jpg, .jpeg"}
                                    onChange={updateProfilePicture}
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-black dark:text-white text-sm mb-6">Recommended image size: 200x200px</p>

                    <input type="text"
                           name="userName"
                           placeholder={"Your new username."}
                           value={userName}
                           onChange={(e) => handleInputChange(e)}
                           className="w-full p-2 rounded-md bg-zinc-400 dark:bg-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    {userName.length < 4 &&
                        <p className="text-red-500 text-left">Username must be at least 4 characters long.</p>}
                    <input type="text"
                           name="userEmail"
                           placeholder={"Your new email."}
                           value={userEmail}
                           onChange={handleInputChange}
                           className="w-full p-2 mt-4 rounded-md bg-zinc-400 dark:bg-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail) === false &&
                        <p className="text-red-500 text-left">Invalid email address.</p>}
                    <input type="password"
                           name="newPassword"
                           value={newPassword}
                           placeholder={"Your new password."}
                           onChange={handleInputChange}
                           className="w-full p-2 mt-4 rounded-md bg-zinc-400 dark:bg-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <div className="flex justify-center">
                        <div className="flex items-center justify-between my-2 w-1/2">
                            <div
                                className={`flex-1 h-1 rounded ${passwordStrength < 1 ? "bg-gray-400" : "bg-red-500"} mr-2`}></div>
                            <div
                                className={`flex-1 h-1 rounded ${passwordStrength < 2 ? "bg-gray-400" : "bg-orange-500"} mr-2`}></div>
                            <div
                                className={`flex-1 h-1 rounded ${passwordStrength < 3 ? "bg-gray-400" : "bg-yellow-500"} mr-2`}></div>
                            <div
                                className={`flex-1 h-1 rounded ${passwordStrength < 4 ? "bg-gray-400" : "bg-green-300"} mr-2`}></div>
                            <div
                                className={`flex-1 h-1 rounded ${passwordStrength < 5 ? "bg-gray-400" : "bg-green-500"}`}></div>
                        </div>
                    </div>
                    <button
                        className={`p-4 mt-4 rounded-md font-bold bg-blue-500 dark:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isFormValid ? "hover:bg-blue-600" : "cursor-not-allowed"}`}
                        disabled={!isFormValid}
                        onClick={saveChanges}
                    >
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Profile;