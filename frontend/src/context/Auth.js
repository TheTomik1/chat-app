import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from "axios";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState({});

    useEffect(() => {
        async function checkIfLoggedIn() {
            try {
                const meResponse = await axios.get("me");
                setIsLoggedIn(meResponse.status === 200);
                setLoggedInUser(meResponse.data.userInformation);
            } catch (error) {
                setIsLoggedIn(false);
            }
        }

        checkIfLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value={{ isLoggedIn, loggedInUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};