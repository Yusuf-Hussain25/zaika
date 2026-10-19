// Zaika is light-first. The only stored choice is "dark"; anything else means light.
const KEY = "zaika-theme";

export const getTheme = () => {
    try {
        return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
    } catch {
        return "light";
    }
};

export const applyTheme = (theme = getTheme()) => {
    const root = document.documentElement;
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#100c09" : "#fbf8f4");
};

export const setTheme = (theme) => {
    try {
        if (theme === "dark") localStorage.setItem(KEY, "dark");
        else localStorage.removeItem(KEY);
    } catch {
        // storage unavailable (private mode): the theme still applies for this visit
    }
    applyTheme(theme);
};

export const toggleTheme = () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    return next;
};
