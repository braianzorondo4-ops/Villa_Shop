create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  price integer not null check (price > 0),
  original_price integer check (original_price is null or original_price > price),
  emoji text not null default '✿',
  color text not null default '#392e12',
  badge text not null default '',
  description text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  customer jsonb not null,
  items jsonb not null,
  total integer not null check (total >= 0)
);

grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;

alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Anyone can read products" on public.products;
create policy "Anyone can read products" on public.products
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Customers can create pending orders" on public.orders;
create policy "Customers can create pending orders" on public.orders
  for insert to anon, authenticated
  with check (status = 'pending');

drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders" on public.orders
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

drop policy if exists "Anyone can view product images" on storage.objects;
create policy "Anyone can view product images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'product-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into public.products (id, name, category, price, original_price, emoji, color, badge, description, image_url)
values
  ('taza-calma', 'Taza Calma', 'Hogar', 129000, null, '☕', '#392e12', 'Más vendido', 'Una taza especial para disfrutar tus momentos de pausa.', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=85'),
  ('vela-botanica', 'Vela Botánica', 'Hogar', 89000, 109000, '🕯️', '#8a6c22', 'Oferta', 'Aroma suave y luz cálida para acompañar tus tardes.', 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=85'),
  ('cuaderno-ideas', 'Cuaderno de ideas', 'Papelería', 76000, null, '📔', '#211c11', '', 'Un espacio para tus listas, planes e ideas nuevas.', 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=85'),
  ('bolso-nube', 'Bolso Nube', 'Accesorios', 189000, 229000, '👜', '#6d531b', 'Oferta', 'Liviano y práctico para acompañarte todos los días.', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85'),
  ('set-pausa', 'Set Pausa', 'Bienestar', 155000, null, '🌿', '#30260f', '', 'Un pequeño ritual para regalarte un momento de calma.', 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=800&q=85'),
  ('botella-dia', 'Botella de todos los días', 'Accesorios', 112000, null, '🧴', '#a17c20', '', 'Tu compañera práctica para hidratarte donde estés.', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=85'),
  ('florero-sol', 'Florero Sol', 'Hogar', 143000, null, '🏺', '#332910', 'Favorito', 'Un detalle cálido para darle vida a cualquier rincón.', 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=800&q=85'),
  ('kit-creativo', 'Kit creativo', 'Papelería', 78000, 98000, '🎨', '#72571c', 'Oferta', 'Todo lo necesario para dejar volar la imaginación.', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=85')
on conflict (id) do nothing;
