import React, { useState } from "react";
import { Link } from "react-router-dom";

import RegistrationForm from "../components/RegistrationForm";
import LoginForm from "../components/LoginForm";

const Home = () => {
    const [showRegistration, setShowRegistration] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    const handleTryOutOpen = () => {
        setShowRegistration(true);
    };

    const handleRegistrationClose = () => {
        setShowRegistration(false);
    };

    const handleLoginOpen = () => {
        setShowLogin(true);
    }

    const handleLoginClose = () => {
        setShowLogin(false);
    }

    return (
        <div className="text-center min-h-screen p-4 bg-gray-100 dark:bg-zinc-900">
            <h1 className="text-5xl font-bold pt-24 text-gray-900 dark:text-white">Chat with your friends now!</h1>
            <p className="text-xl mt-2 text-gray-700 dark:text-gray-300">Create an account and start chatting today!</p>
            <button onClick={handleTryOutOpen}
                    className="w-64 py-3 mt-5 text-xl font-bold rounded bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-700 dark:hover:bg-blue-600 hover:cursor-pointer">Try me out today!</button>

            <h3 className="mt-2 text-sm text-black dark:text-white">Already using the application? <span onClick={handleLoginOpen}
                                                                           className="text-yellow-500 hover:cursor-pointer dark:text-yellow-400">Login now!</span></h3>

            <p className="text-center mt-12 mb-4 text-gray-700 dark:text-gray-300">Made with ❤️ by <a href="https://github.com/TheTomik1"
                                                                                                      className="text-green-500 dark:text-green-300">TheTomik</a>
            </p>
            {showRegistration && <RegistrationForm onClose={handleRegistrationClose} />}
            {showLogin && <LoginForm onClose={handleLoginClose} />}
        </div>
    );
}

export default Home;
