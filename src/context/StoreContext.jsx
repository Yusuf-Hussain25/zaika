import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const StoreContext = createContext(null);
const GUEST_CART = "zaika-guest-cart";
const EMPTY = Object.freeze({});
const fetchMenu = () => Promise.all([api("/foods"), api("/settings")]);

const readGuestCart = () => {
    try {
        return JSON.parse(localStorage.getItem(GUEST_CART)) || {};
    } catch {
        return {};
    }
};

const writeGuestCart = (cart) => {
    try {
        if (Object.keys(cart).length) localStorage.setItem(GUEST_CART, JSON.stringify(cart));
        else localStorage.removeItem(GUEST_CART);
    } catch {
        // storage unavailable: the guest cart lives in memory only
    }
};

export const StoreProvider = ({ children }) => {
    const { user, ready } = useAuth();
    const [foods, setFoods] = useState([]);
    const [foodsState, setFoodsState] = useState("loading"); // loading | ready | error
    const [settings, setSettings] = useState(null);
    const [payments, setPayments] = useState({ card: false });
    const [guestCart, setGuestCart] = useState(readGuestCart);
    // The saved cart, tagged with the user it belongs to
    const [saved, setSaved] = useState({ userId: null, items: {} });
    const userId = user?.id;
    const cart = userId ? (saved.userId === userId ? saved.items : EMPTY) : guestCart;
    const cartSyncing = Boolean(userId) && saved.userId !== userId;
    // Latest cart, for callbacks that must not go stale between renders
    const cartRef = useRef(cart);
    useEffect(() => {
        cartRef.current = cart;
    }, [cart]);

    const applyMenu = useCallback(([{ foods }, { settings, payments }]) => {
        setFoods(foods);
        setSettings(settings);
        setPayments(payments);
        setFoodsState("ready");
    }, []);

    const failMenu = useCallback((err) => {
        setFoodsState("error");
        toast.error(err.message);
    }, []);

    // Refreshes the menu quietly (keeps the current list on screen)
    const loadFoods = useCallback(() => fetchMenu().then(applyMenu, failMenu), [applyMenu, failMenu]);

    const retryFoods = useCallback(() => {
        setFoodsState("loading");
        loadFoods();
    }, [loadFoods]);

    useEffect(() => {
        fetchMenu().then(applyMenu, failMenu);
    }, [applyMenu, failMenu]);

    // On sign-in, fold the guest cart into the saved cart. Signed out, the guest cart shows again.
    useEffect(() => {
        if (!ready || !userId) return;
        let cancelled = false;
        const guest = readGuestCart();
        const request = Object.keys(guest).length ? api("/cart/merge", { method: "POST", body: { items: guest } }) : api("/cart");
        request
            .then(({ items }) => {
                if (cancelled) return;
                writeGuestCart({});
                setGuestCart({});
                setSaved({ userId, items });
            })
            .catch((err) => {
                if (cancelled) return;
                toast.error(err.message);
                setSaved({ userId, items: {} });
            });
        return () => {
            cancelled = true;
        };
    }, [ready, userId]);

    const replaceCart = useCallback(
        (items) => {
            if (userId) {
                setSaved({ userId, items });
            } else {
                setGuestCart(items);
                writeGuestCart(items);
            }
        },
        [userId],
    );

    // Optimistic: the UI updates at once and the request runs behind it. Server replies are not
    // applied, so a slow response can never overwrite a newer click; on failure we resync.
    const setQuantity = useCallback(
        async (foodId, quantity) => {
            const next = { ...cartRef.current };
            if (quantity > 0) next[foodId] = Math.min(quantity, 50);
            else delete next[foodId];
            cartRef.current = next;
            replaceCart(next);
            if (!userId) return;
            try {
                await api(`/cart/${foodId}`, { method: "PUT", body: { quantity: next[foodId] ?? 0 } });
            } catch (err) {
                toast.error(err.message);
                api("/cart").then(({ items }) => replaceCart(items)).catch(() => {});
            }
        },
        [userId, replaceCart],
    );

    const add = useCallback((foodId) => setQuantity(foodId, (cartRef.current[foodId] || 0) + 1), [setQuantity]);
    const remove = useCallback((foodId) => setQuantity(foodId, (cartRef.current[foodId] || 0) - 1), [setQuantity]);

    const derived = useMemo(() => {
        const byId = new Map(foods.map((f) => [f.id, f]));
        const lines = Object.entries(cart)
            .map(([id, quantity]) => ({ food: byId.get(id), quantity }))
            .filter((l) => l.food && l.quantity > 0);
        const subtotal = lines.reduce((sum, l) => sum + l.food.price * l.quantity, 0);
        const count = lines.reduce((sum, l) => sum + l.quantity, 0);
        const freeOver = settings?.freeDeliveryOver ?? 0;
        const deliveryFee = !settings || subtotal === 0 || subtotal >= freeOver ? 0 : settings.deliveryFee;
        return {
            foodsById: byId,
            lines,
            subtotal,
            count,
            deliveryFee,
            total: subtotal + deliveryFee,
            toFreeDelivery: settings && subtotal > 0 ? Math.max(freeOver - subtotal, 0) : 0,
            soldOutInCart: lines.filter((l) => !l.food.isAvailable),
        };
    }, [foods, cart, settings]);

    const value = useMemo(
        () => ({
            foods,
            foodsState,
            settings,
            payments,
            cart,
            cartSyncing,
            ...derived,
            loadFoods,
            retryFoods,
            setFoods,
            setSettings,
            setQuantity,
            add,
            remove,
            replaceCart,
        }),
        [foods, foodsState, settings, payments, cart, cartSyncing, derived, loadFoods, retryFoods, setQuantity, add, remove, replaceCart],
    );

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to its provider
export const useStore = () => useContext(StoreContext);
