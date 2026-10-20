import { HttpError } from "./http.js";
import { getStripe } from "./store.js";
import { refundRazorpay } from "./razorpay.js";

// Refunds a paid online order before it is cancelled. Throws (and the order stays as it was)
// if the provider refuses. `order` is a raw orders row.
export const refundOrder = async (order) => {
    if (!order.paid || order.payment_method === "cod") return;
    if (order.payment_method === "razorpay") {
        if (!order.razorpay_payment_id) throw new HttpError(400, "This payment can't be refunded automatically. Refund it in Razorpay first.");
        await refundRazorpay(order.razorpay_payment_id);
        return;
    }
    const stripe = getStripe();
    if (!stripe || !order.stripe_session_id) throw new HttpError(400, "This card payment can't be refunded automatically. Refund it in Stripe first.");
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    await stripe.refunds.create({ payment_intent: session.payment_intent });
};
