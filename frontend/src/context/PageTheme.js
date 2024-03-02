import React, {createContext, useEffect, useState} from "react";
import {useCookies} from "react-cookie";

const PageThemeContext = createContext(undefined);

export const PageThemeProvider = ({children}) => {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [cookies, setCookie] = useCookies(['darkMode']);

    useEffect(() => {
        const storedDarkMode = cookies.darkMode === true;
        setIsDarkMode(storedDarkMode);
    }, [cookies.darkMode]);

    return (
        <PageThemeContext.Provider value={{isDarkMode}}>
            {children}
        </PageThemeContext.Provider>
    );
}

export const usePageTheme = () => {
    return React.useContext(PageThemeContext);
};