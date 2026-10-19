-- Zaika schema: users, menu, carts and orders.

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  -- demo_admin can see the admin panel but every write is rejected
  role          text not null default 'customer' check (role in ('customer', 'admin', 'demo_admin')),
  phone         text,
  address       jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists foods (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  price        integer not null check (price >= 0),
  image_url    text not null,
  category     text not null,
  is_veg       boolean not null default true,
  is_available boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists foods_category_idx on foods (category);

create table if not exists cart_items (
  user_id  uuid not null references users (id) on delete cascade,
  food_id  uuid not null references foods (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 50),
  primary key (user_id, food_id)
);

create sequence if not exists order_number_seq start 1001;

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  number            bigint not null unique default nextval('order_number_seq'),
  user_id           uuid not null references users (id) on delete cascade,
  status            text not null default 'placed' check (status in
                      ('awaiting_payment', 'placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_method    text not null default 'cod' check (payment_method in ('cod', 'card')),
  paid              boolean not null default false,
  stripe_session_id text,
  subtotal          integer not null,
  delivery_fee      integer not null,
  total             integer not null,
  address           jsonb not null,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_status_idx on orders (status, created_at desc);

-- Line items are a snapshot: renaming or deleting a dish never changes past orders
create table if not exists order_items (
  id        bigint generated always as identity primary key,
  order_id  uuid not null references orders (id) on delete cascade,
  food_id   uuid references foods (id) on delete set null,
  name      text not null,
  price     integer not null,
  quantity  integer not null check (quantity > 0),
  image_url text,
  is_veg    boolean not null default true
);
create index if not exists order_items_order_idx on order_items (order_id);

-- Status history for the tracking timeline
create table if not exists order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references orders (id) on delete cascade,
  status     text not null,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events (order_id, created_at);

-- Single-row store settings, edited from the admin panel
create table if not exists settings (
  id                 boolean primary key default true check (id),
  store_open         boolean not null default true,
  delivery_fee       integer not null default 39,
  free_delivery_over integer not null default 499,
  eta_minutes        integer not null default 35,
  updated_at         timestamptz not null default now()
);
insert into settings (id) values (true) on conflict do nothing;
