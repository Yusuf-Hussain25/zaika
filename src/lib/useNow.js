import { useEffect, useState } from "react";

// Current time that re-renders every `ms`, for relative times and countdowns
export const useNow = (ms = 30000) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(timer);
    }, [ms]);
    return now;
};
