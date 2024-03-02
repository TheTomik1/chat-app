import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {PageTheme} from "./PageTheme";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState({});
    const [loggedInUserProfilePicture, setLoggedInUserProfilePicture] = useState("");

    useEffect(() => {
        async function checkIfLoggedIn() {
            try {
                const meResponse = await axios.get("me");
                setIsLoggedIn(meResponse.status === 200);
                setLoggedInUser(meResponse.data.userInformation);
                navigate('/chat');
            } catch (error) {
                setIsLoggedIn(false);
            }
        }

        async function fetchUserProfilePicture() {
            try {
                const response = await axios.get("profile-picture", { responseType: "blob" });
                const url = URL.createObjectURL(response.data);
                setLoggedInUserProfilePicture(url);
            } catch (error) {
                setLoggedInUserProfilePicture("https://robohash.org/noprofilepic.png");
            }
        }

        checkIfLoggedIn();
        fetchUserProfilePicture();
    }, []);

    return (
        <AuthContext.Provider value={{ isLoggedIn, loggedInUser, loggedInUserProfilePicture }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};