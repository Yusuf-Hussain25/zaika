import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";

// Razorpay over its REST API (no SDK needed). Enabled when both keys are set.
// Test keys (rzp_test_...) run real checkouts with test UPI IDs and cards, and move no money.
const API = "https://api.razorpay.com/v1";

export const razorpayKeys = () => {
    const id = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    return id?.startsWith("rzp_") && secret ? { id, secret } : null;
};

const call = async (path, { method = "GET", body } = {}) => {
    const keys = razorpayKeys();
    if (!keys) throw new HttpError(400, "Razorpay is not set up on this server.");
    const res = await fetch(API + path, {
        method,
        headers: {
            authorization: `Basic ${Buffer.from(`${keys.id}:${keys.secret}`).toString("base64")}`,
            ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(502, `Razorpay: ${data.error?.description || `request failed (${res.status})`}`);
    return data;
};

// Amounts are in rupees here and paise at Razorpay
export const createRazorpayOrder = ({ amount, receipt, notes }) =>
    call("/orders", { method: "POST", body: { amount: amount * 100, currency: "INR", receipt, notes } });

// Checkout's handler returns a signature over "order_id|payment_id"; only our secret can produce it
export const validSignature = (orderId, paymentId, signature) => {
    const keys = razorpayKeys();
    if (!keys || !orderId || !paymentId || typeof signature !== "string") return false;
    const expected = createHmac("sha256", keys.secret).update(`${orderId}|${paymentId}`).digest("hex");
    return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

// Asks Razorpay (not the browser) whether this order has been paid in full. Authorized payments are
// captured here, so it works whatever the account's auto-capture setting is.
export const findPayment = async (razorpayOrderId, amount) => {
    const { items = [] } = await call(`/orders/${razorpayOrderId}/payments`);
    let payment = items.find((p) => p.status === "captured");
    const authorized = items.find((p) => p.status === "authorized");
    if (!payment && authorized) {
        payment = await call(`/payments/${authorized.id}/capture`, { method: "POST", body: { amount: authorized.amount, currency: authorized.currency } });
    }
    return payment && payment.amount === amount * 100 ? payment : null;
};

export const refundRazorpay = (paymentId) => call(`/payments/${paymentId}/refund`, { method: "POST", body: {} });
