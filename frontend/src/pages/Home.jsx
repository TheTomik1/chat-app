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
        <div className="text-center bg-zinc-900 min-h-screen p-4">
            <h1 className="text-5xl text-white font-bold pt-24">Chat with your friends now!</h1>
            <p className="text-white text-xl mt-2">Create an account and start chatting today!</p>
            <p onClick={handleTryOutOpen}
                className="bg-blue-700 hover:bg-blue-600 w-64 text-white text-xl font-bold py-3 rounded inline-block mt-5 hover:cursor-pointer">Try
                me out today!</p>

            <h3 className="mt-2 text-sm text-white">Already using the calendar? <p onClick={handleLoginOpen}
                className="text-yellow-500 hover:cursor-pointer">Login
                now!</p></h3>

            <p className="text-white text-center mt-12 mb-4">Made with ❤️ by <Link to={"https://github.com/TheTomik1"}
                className="text-green-500">TheTomik</Link>
            </p>
            {showRegistration && <RegistrationForm onClose={handleRegistrationClose} />}
            {showLogin && <LoginForm onClose={handleLoginClose} />}
        </div>
    );
}

export default Home;
