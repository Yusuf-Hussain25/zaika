import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { cleanChoice, lineKey, snapshotChoice, unitPrice } from "../../shared/menu";

const StoreContext = createContext(null);
const GUEST_CART = "zaika-guest-cart";
const EMPTY = Object.freeze({});
const fetchMenu = () => Promise.all([api("/foods"), api("/settings")]);

// Guest carts saved before dish options were { foodId: quantity }; read them as plain lines
const readGuestCart = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(GUEST_CART)) || {};
        return Object.fromEntries(Object.entries(saved).map(([id, line]) => [id, typeof line === "number" ? { foodId: id, quantity: line, choice: {} } : line]));
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

    // Sets one cart line (a dish plus its options). `line` describes a line that isn't in the cart yet.
    // Optimistic: the UI updates at once and the request runs behind it. Server replies are not
    // applied, so a slow response can never overwrite a newer click; on failure we resync.
    const setQuantity = useCallback(
        async (lineId, quantity, line) => {
            const current = cartRef.current[lineId] ?? line;
            if (!current) return;
            const next = { ...cartRef.current };
            if (quantity > 0) next[lineId] = { foodId: current.foodId, choice: current.choice ?? {}, quantity: Math.min(quantity, 50) };
            else delete next[lineId];
            cartRef.current = next;
            replaceCart(next);
            if (!userId) return;
            try {
                await api(`/cart/${encodeURIComponent(lineId)}`, {
                    method: "PUT",
                    body: { quantity: next[lineId]?.quantity ?? 0, foodId: current.foodId, choice: current.choice },
                });
            } catch (err) {
                toast.error(err.message);
                api("/cart").then(({ items }) => replaceCart(items)).catch(() => {});
            }
        },
        [userId, replaceCart],
    );

    const add = useCallback((lineId) => setQuantity(lineId, (cartRef.current[lineId]?.quantity || 0) + 1), [setQuantity]);
    const remove = useCallback((lineId) => setQuantity(lineId, (cartRef.current[lineId]?.quantity || 0) - 1), [setQuantity]);

    // Adds a dish with the chosen options; the same dish and options stack on one line
    const addItem = useCallback(
        (food, choice, quantity = 1) => {
            const clean = cleanChoice(food, choice);
            const id = lineKey(food.id, clean);
            return setQuantity(id, (cartRef.current[id]?.quantity || 0) + quantity, { foodId: food.id, choice: clean });
        },
        [setQuantity],
    );

    // Dish waiting in the options sheet: { food, choice } or null
    const [customising, setCustomising] = useState(null);
    const customise = useCallback((food, choice) => setCustomising({ food, choice }), []);
    const closeCustomise = useCallback(() => setCustomising(null), []);

    const derived = useMemo(() => {
        const byId = new Map(foods.map((f) => [f.id, f]));
        const lines = Object.entries(cart)
            .map(([id, line]) => {
                const food = byId.get(line.foodId);
                if (!food || !(line.quantity > 0)) return null;
                // Re-checked against today's menu, exactly like the server prices the order
                const choice = cleanChoice(food, line.choice);
                return { id, food, quantity: line.quantity, choice, unitPrice: unitPrice(food, choice), options: snapshotChoice(food, choice) };
            })
            .filter(Boolean);
        // Per dish: total in the cart, and one line the card's stepper steps down or repeats
        const byFood = {};
        for (const l of lines) byFood[l.food.id] = { quantity: (byFood[l.food.id]?.quantity || 0) + l.quantity, last: l };
        const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
        const count = lines.reduce((sum, l) => sum + l.quantity, 0);
        const freeOver = settings?.freeDeliveryOver ?? 0;
        const deliveryFee = !settings || subtotal === 0 || subtotal >= freeOver ? 0 : settings.deliveryFee;
        return {
            foodsById: byId,
            lines,
            byFood,
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
            addItem,
            replaceCart,
            customising,
            customise,
            closeCustomise,
        }),
        [foods, foodsState, settings, payments, cart, cartSyncing, derived, loadFoods, retryFoods, setQuantity, add, remove, addItem, replaceCart, customising, customise, closeCustomise],
    );

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to its provider
export const useStore = () => useContext(StoreContext);
