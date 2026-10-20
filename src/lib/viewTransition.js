import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router";

// Page transitions with the View Transitions API. BrowserRouter doesn't drive them itself (only data
// routers do), so we start the transition and keep it open until the next route has rendered.
// Browsers without the API get a CSS fade/slide instead (see .route-view in index.css).
let pending = null;

const supported = () => typeof document !== "undefined" && typeof document.startViewTransition === "function" && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const transitionTo = (navigate, to, options) => {
    const url = new URL(to, window.location.origin);
    if (!supported() || url.pathname === window.location.pathname) return navigate(to, options);
    document.startViewTransition(
        () =>
            new Promise((resolve) => {
                pending = resolve;
                navigate(to, options);
                // Never hold the page frozen for long, even if the route takes a while to load
                setTimeout(resolve, 1200);
            }),
    );
};

// Mounted once near the top of the app: finishes a transition when the new route commits
export const useFinishViewTransition = () => {
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        pending?.();
        pending = null;
    }, [pathname]);
};

// Click handler for links that should animate (plain left clicks only, so new-tab clicks still work)
export const useTransitionClick = () => {
    const navigate = useNavigate();
    return (to, options) => (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        transitionTo(navigate, to, options);
    };
};

// Lets other code (the tab bar's Search) ask the home page to focus its search box
export const useSearchFocusRequest = (onRequest) => {
    const { state } = useLocation();
    const stamp = state?.focusSearch;
    useEffect(() => {
        if (stamp) onRequest();
    }, [stamp, onRequest]);
};
