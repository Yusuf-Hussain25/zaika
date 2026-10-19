import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useStore } from "../../context/StoreContext";

// Reorder and cancel, shared by the order list and the order page
export const useOrderActions = (onChange) => {
    const { replaceCart } = useStore();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(null); // `${action}:${orderId}`

    const reorder = async (order) => {
        setBusy(`reorder:${order.id}`);
        try {
            const { cart, added, skipped } = await api(`/orders/${order.id}/reorder`, { method: "POST" });
            replaceCart(cart);
            if (!added) toast.error("Those dishes are no longer available.");
            else {
                toast.success(skipped ? `Added ${added} dishes. ${skipped} are sold out right now.` : "Added to your cart.");
                navigate("/cart");
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(null);
        }
    };

    const cancel = async (order) => {
        setBusy(`cancel:${order.id}`);
        try {
            const { order: updated } = await api(`/orders/${order.id}/cancel`, { method: "POST" });
            toast.success("Order cancelled.");
            onChange?.(updated);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(null);
        }
    };

    return { reorder, cancel, busy };
};
