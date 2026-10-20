// Razorpay Checkout: the official popup for UPI, cards, netbanking and wallets.
// The script loads only when someone pays, and the result is always verified by our API.
const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading;

const loadCheckout = () => {
    if (window.Razorpay) return Promise.resolve();
    loading ??= new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = SRC;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => {
            loading = null;
            script.remove();
            reject(new Error("Couldn't load Razorpay. Check your connection and try again."));
        };
        document.head.appendChild(script);
    });
    return loading;
};

export class PaymentDismissed extends Error {}

// Opens Checkout for a Razorpay order created by our API. Resolves with
// { razorpay_payment_id, razorpay_order_id, razorpay_signature }; rejects with PaymentDismissed
// when the customer closes it. Failed attempts stay inside the popup so they can retry.
export const payWithRazorpay = async ({ keyId, orderId, amount, currency, description, prefill }) => {
    await loadCheckout();
    return new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
            key: keyId,
            order_id: orderId,
            amount,
            currency,
            name: "Zaika",
            description,
            image: `${window.location.origin}/favicon.svg`,
            prefill,
            theme: { color: "#f0592a" },
            handler: resolve,
            modal: { ondismiss: () => reject(new PaymentDismissed("Payment cancelled")), confirm_close: true },
        });
        checkout.open();
    });
};
