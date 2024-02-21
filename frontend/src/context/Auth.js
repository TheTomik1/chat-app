import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from "axios";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        async function checkIfLoggedIn() {
            try {
                const meResponse = await axios.get("http://localhost:8080/api/me");
                setIsLoggedIn(meResponse.status === 200);
            } catch (error) {
                setIsLoggedIn(false);
            }
        }

        checkIfLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value={{ isLoggedIn }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};