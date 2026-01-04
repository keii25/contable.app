
-- ============================================
-- Extensiones necesarias
-- ============================================
create extension if not exists pgcrypto;

-- ============================================
-- Tabla: public.profiles
-- ============================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  email text,
  username text,
  role text check (role in ('admin','editor','lector')) not null default 'editor',
  created_at timestamptz default now()
);

-- Trigger: crear perfil al registrarse (rol por defecto: editor)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, role)
  values (new.id, new.email, 'editor')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Nota: algunos proyectos requieren eliminar el trigger antes de recrearlo
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Tabla: public.transactions
-- ============================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text check (type in ('Ingreso','Egreso')) not null,
  date date not null,
  account text not null,
  amount numeric(14,2) not null check (amount > 0),
  description text,
  cedula text,
  nombres text,
  created_at timestamptz default now()
);

-- ============================================
-- Tabla: public.accounts (cuentas contables dinámicas)
-- ============================================
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('Ingreso','Egreso')) not null,
  name text not null,
  created_at timestamptz default now(),
  constraint accounts_unique unique (type, name)
);

-- ============================================
-- Activar RLS en tablas
-- ============================================
alter table public.profiles     enable row level security;
alter table public.transactions enable row level security;
alter table public.accounts     enable row level security;

-- ============================================
-- Políticas RLS — PROFILES
-- ============================================
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all
on public.profiles
for select
using (exists (
  select 1
  from public.profiles p
  where p.user_id = auth.uid() and p.role = 'admin'
));

-- ============================================
-- Políticas RLS — TRANSACTIONS (CRUD propio)
-- ============================================
drop policy if exists tx_own_select on public.transactions;
create policy tx_own_select
on public.transactions
for select
using (auth.uid() = user_id);

drop policy if exists tx_own_insert on public.transactions;
create policy tx_own_insert
on public.transactions
for insert
with check (auth.uid() = user_id);

drop policy if exists tx_own_update on public.transactions;
create policy tx_own_update
on public.transactions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists tx_own_delete on public.transactions;
create policy tx_own_delete
on public.transactions
for delete
using (auth.uid() = user_id);

-- Lectura admin (todas las transacciones)
drop policy if exists tx_admin_read on public.transactions;
create policy tx_admin_read
on public.transactions
for select
using (exists (
  select 1
  from public.profiles p
  where p.user_id = auth.uid() and p.role = 'admin'
));

-- ============================================
-- Políticas RLS — ACCOUNTS
-- ============================================
-- Lectura: cualquier usuario autenticado
drop policy if exists accounts_read_all on public.accounts;
create policy accounts_read_all
on public.accounts
for select
using (auth.uid() is not null);

-- CRUD: solo admin
drop policy if exists accounts_admin_insert on public.accounts;
create policy accounts_admin_insert
on public.accounts
for insert
with check (exists (
  select 1
  from public.profiles p
  where p.user_id = auth.uid() and p.role = 'admin'
));

drop policy if exists accounts_admin_update on public.accounts;
create policy accounts_admin_update
on public.accounts
for update
using (exists (
  select 1
  from public.profiles p
  where p.user_id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1
  from public.profiles p
  where p.user_id = auth.uid() and p.role = 'admin'
));

drop policy if exists accounts_admin_delete on public.accounts;
create policy accounts_admin_delete
on public.accounts
for delete
using (exists (
  select 1
  from public.profiles p
  where p.user_id = auth.uid() and p.role = 'admin'
));

-- ============================================
-- Seed de cuentas (idempotente)
-- ============================================
insert into public.accounts (type, name) values
('Ingreso','Diezmos'),
('Ingreso','Ofrendas'),
('Ingreso','Ofrendas Ministeriales'),
('Ingreso','Otros'),
('Egreso','Aseo'),
('Egreso','Ayuda Social'),
('Egreso','Construcción'),
('Egreso','Diezmo de Diezmos'),
('Egreso','Fondo Nacional'),
('Egreso','Subsidio de Transporte'),
('Egreso','Impuesto Predial'),
('Egreso','Intereses de Cesantías'),
('Egreso','Mantenimiento'),
('Egreso','Misiones y Evangelismo'),
('Egreso','Ofrenda Ministerios'),
('Egreso','Otros'),
('Egreso','Emolumento Pastora'),
('Egreso','Servicios Públicos'),
('Egreso','Sonido'),
('Egreso','Emolumento Pastor'),
('Egreso','Tecnología'),
('Egreso','Útiles y Papelería'),
('Egreso','Vacaciones')
on conflict (type, name) do nothing;
