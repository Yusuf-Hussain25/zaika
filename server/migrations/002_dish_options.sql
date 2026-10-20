-- Dish customisation: spice level, half/full portion and paid add-ons.

-- { spice, halfPrice, addons: [{ id, label, price }] }; null when the dish has no options
alter table foods add column if not exists options jsonb;

-- A cart line is now a dish plus the customer's choice. line_id is the dish id for the default
-- choice (see lineKey in shared/menu.js), so existing rows keep working unchanged.
alter table cart_items add column if not exists choice jsonb not null default '{}'::jsonb;
alter table cart_items add column if not exists line_id text;
update cart_items set line_id = food_id::text where line_id is null;
alter table cart_items alter column line_id set not null;
alter table cart_items drop constraint if exists cart_items_pkey;
alter table cart_items add primary key (user_id, line_id);

-- Snapshot of what was chosen: { portion, spice, addons: [{ id, label, price }] }
alter table order_items add column if not exists options jsonb;
