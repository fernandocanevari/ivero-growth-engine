create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asaas_customer_id text not null,
  asaas_subscription_id text not null,
  plano text not null check (plano in ('presenca', 'influencia', 'autoridade')),
  status text not null default 'trial' check (status in ('trial', 'ativo', 'inadimplente', 'cancelado')),
  data_inicio timestamptz not null default now(),
  data_vencimento timestamptz,
  carencia_ate timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;

alter table public.assinaturas enable row level security;

create policy "Users can view own subscription"
  on public.assinaturas for select
  using (auth.uid() = user_id);

create policy "Admins can view all subscriptions"
  on public.assinaturas for all
  using (public.has_role(auth.uid(), 'admin'));

create index assinaturas_user_id_idx on public.assinaturas(user_id);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger assinaturas_updated_at
  before update on public.assinaturas
  for each row execute function public.handle_updated_at();