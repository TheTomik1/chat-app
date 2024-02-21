import React, { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { format } from "date-fns";
import axios from "axios";
import toastr from "toastr";

import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import { AuthProvider } from './context/Auth';

import './styles.css';

function App() {
    axios.defaults.withCredentials = true;
    const location = useLocation();

    useEffect(() => {
        const title = "Chat App";
        const matchedRoute = routes.find(route => route.path === location.pathname);
        const componentName = matchedRoute ? getComponentName(matchedRoute.element) : "Not Found";
        document.title = `${title} | ${componentName}`;
    }, [location.pathname]);

    const routes = [
        { path: "/", element: <Home /> },
        { path: "/chat", element: <ProtectedRoute><Chat /></ProtectedRoute> },
        { path: "/profile", element: <ProtectedRoute><Profile /></ProtectedRoute> },
        { path: "*", element: <NotFound /> }
    ];

    const getComponentName = (element) => {
        if (element.type === ProtectedRoute) {
            return getComponentName(element.props.children);
        } else {
            return element.type.name;
        }
    };

    return (
        <>
            <Navbar/>

            <AuthProvider>
                <Routes>
                    {routes.map(({ path, element }) => (
                        <Route key={path} path={path} element={element} />
                    ))}
                </Routes>
            </AuthProvider>

            <footer className="bg-zinc-900 text-white text-center p-4">
                <p>&copy; {format(new Date(), "yyyy")} - Personal Calendar</p>
            </footer>
        </>
    );
}

export default App;