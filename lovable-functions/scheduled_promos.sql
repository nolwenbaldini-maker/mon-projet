-- Table des promotions programmées (à exécuter une fois dans Lovable / Supabase → SQL).
create table if not exists public.scheduled_promos (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null,
  product_title text,
  percent int not null check (percent > 0 and percent <= 95),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled', -- scheduled | active | done | cancelled | error
  last_error text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.scheduled_promos enable row level security;

-- Les administrateurs peuvent tout gérer (lecture/écriture).
drop policy if exists "admins manage scheduled_promos" on public.scheduled_promos;
create policy "admins manage scheduled_promos"
  on public.scheduled_promos for all
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'))
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'));

create index if not exists scheduled_promos_status_idx on public.scheduled_promos (status, starts_at, ends_at);
