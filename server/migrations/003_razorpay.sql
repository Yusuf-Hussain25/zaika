-- Razorpay as a payment method: UPI, cards, netbanking and wallets through Razorpay Checkout.

alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check check (payment_method in ('cod', 'card', 'razorpay'));

-- The Razorpay order created at checkout, and the payment that settled it
alter table orders add column if not exists razorpay_order_id text;
alter table orders add column if not exists razorpay_payment_id text;
