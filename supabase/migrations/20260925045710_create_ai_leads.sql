-- Commercial AI lead capture for Casa Habitat.
-- Public visitors may create a tightly constrained lead after explicit consent.
-- Only authenticated Casa Habitat administrators may read, update, or delete leads.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  source text not null default 'AI_AGENT' check (source = 'AI_AGENT'),
  transaction_type text,
  property_type text,
  neighborhood text,
  budget_min numeric check (budget_min is null or budget_min >= 0),
  budget_max numeric check (budget_max is null or budget_max >= 0),
  bedrooms_min integer check (bedrooms_min is null or bedrooms_min >= 0),
  surface_min numeric check (surface_min is null or surface_min >= 0),
  furnished boolean,
  name text,
  phone text,
  email text,
  whatsapp text,
  preferred_contact text,
  timing text,
  urgency text,
  occupants integer check (occupants is null or occupants > 0),
  viewed_properties text[] not null default '{}',
  requested_property_reference text,
  consent boolean not null default false,
  consent_at timestamptz,
  status text not null default 'new' check (status in ('new','contacted','qualified','visit_requested','won','lost','spam')),
  score integer not null default 0 check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_min is null or budget_max is null or budget_min <= budget_max),
  check (name is null or char_length(name) <= 120),
  check (phone is null or char_length(phone) <= 40),
  check (email is null or char_length(email) <= 254),
  check (whatsapp is null or char_length(whatsapp) <= 40),
  check (conversation_id <> '' and char_length(conversation_id) <= 120),
  check (phone is not null or whatsapp is not null or email is not null)
);

alter table public.leads enable row level security;

revoke all on table public.leads from anon, authenticated;

grant insert (
  id,
  conversation_id,
  transaction_type,
  property_type,
  neighborhood,
  budget_min,
  budget_max,
  bedrooms_min,
  surface_min,
  furnished,
  name,
  phone,
  email,
  whatsapp,
  preferred_contact,
  timing,
  urgency,
  occupants,
  viewed_properties,
  requested_property_reference,
  consent,
  consent_at
) on table public.leads to anon;

grant select, insert, update, delete on table public.leads to authenticated;

drop policy if exists "ai_agent_can_create_leads" on public.leads;
create policy "ai_agent_can_create_leads"
on public.leads
for insert
to anon
with check (
  source = 'AI_AGENT'
  and status = 'new'
  and consent = true
  and consent_at is not null
  and consent_at <= now()
  and consent_at >= now() - interval '10 minutes'
  and (phone is not null or whatsapp is not null or email is not null)
);

drop policy if exists "admins_can_read_leads" on public.leads;
create policy "admins_can_read_leads"
on public.leads
for select
to authenticated
using ((select is_admin()));

drop policy if exists "admins_can_update_leads" on public.leads;
create policy "admins_can_update_leads"
on public.leads
for update
to authenticated
using ((select is_admin()))
with check ((select is_admin()));

drop policy if exists "admins_can_delete_leads" on public.leads;
create policy "admins_can_delete_leads"
on public.leads
for delete
to authenticated
using ((select is_admin()));

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_conversation_id_idx on public.leads (conversation_id);

create or replace function public.set_leads_defaults()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.source := 'AI_AGENT';
  new.status := 'new';
  new.score :=
    least(
      100,
      25
      + case when new.name is not null then 10 else 0 end
      + case when new.phone is not null or new.whatsapp is not null then 25 else 0 end
      + case when new.email is not null then 15 else 0 end
      + case when new.requested_property_reference is not null then 10 else 0 end
      + case when new.transaction_type is not null then 5 else 0 end
      + case when new.neighborhood is not null then 5 else 0 end
      + case when new.budget_max is not null then 5 else 0 end
    );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists leads_set_defaults on public.leads;
create trigger leads_set_defaults
before insert on public.leads
for each row
execute function public.set_leads_defaults();

create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_leads_updated_at();

revoke execute on function public.set_leads_defaults() from public, anon, authenticated;
revoke execute on function public.set_leads_updated_at() from public, anon, authenticated;
