-- TEMPLATE ESCOLAR SUPABASE: ambiente novo e EXCLUSIVO de uma escola.
-- Nunca executar no projeto original IFCE nem num projeto Supabase já usado.
-- Pré-homologação: sem dados reais, sem concessão automática de administradores.
begin;

create schema if not exists school_private;
revoke all on schema school_private from public, anon, authenticated;
grant usage on schema school_private to authenticated;

create table public.school_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 3 and 80),
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  created_at timestamptz not null default now()
);
create table public.school_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role='admin'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.school_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null check (char_length(btrim(body)) between 1 and 1500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.school_study_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.school_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  details text not null check (char_length(btrim(details)) between 1 and 1000),
  when_text text not null check (char_length(btrim(when_text)) between 1 and 100),
  location text not null check (char_length(btrim(location)) between 1 and 120),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.school_registrations (
  event_id uuid not null references public.school_events(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id,user_id)
);
create table public.school_polls (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(btrim(question)) between 1 and 200),
  options text[] not null check (array_length(options,1) between 2 and 8),
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.school_votes (
  poll_id uuid not null references public.school_polls(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check (option_index between 0 and 7),
  created_at timestamptz not null default now(),
  primary key(poll_id,user_id)
);
create table public.school_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending','approved','archived')),
  created_at timestamptz not null default now()
);
create index school_suggestions_owner_idx on public.school_suggestions(user_id,created_at desc);
create index school_notices_date_idx on public.school_notices(created_at desc);
create index school_events_date_idx on public.school_events(created_at desc);

-- Helpers internos com contexto restrito: não expor school_private na Data API.
create function school_private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.school_roles r
    join auth.users a on a.id=r.user_id
    where r.user_id=(select auth.uid()) and r.role='admin' and r.active
      and a.email_confirmed_at is not null
  );
$$;
create function school_private.is_approved() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.school_members m
    join auth.users a on a.id=m.user_id
    where m.user_id=(select auth.uid()) and m.status='approved'
      and a.email_confirmed_at is not null
  );
$$;
create function school_private.is_confirmed() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from auth.users a
    where a.id=(select auth.uid()) and a.email_confirmed_at is not null);
$$;
revoke all on function school_private.is_admin(), school_private.is_approved(),
  school_private.is_confirmed() from public, anon;
grant execute on function school_private.is_admin(), school_private.is_approved(),
  school_private.is_confirmed() to authenticated;

-- Segurança por padrão: nenhuma destas tabelas é anônima ou aberta.
alter table public.school_members enable row level security;
alter table public.school_roles enable row level security;
alter table public.school_notices enable row level security;
alter table public.school_study_materials enable row level security;
alter table public.school_events enable row level security;
alter table public.school_registrations enable row level security;
alter table public.school_polls enable row level security;
alter table public.school_votes enable row level security;
alter table public.school_suggestions enable row level security;
revoke all on public.school_members, public.school_roles, public.school_notices,
 public.school_study_materials, public.school_events, public.school_registrations,
 public.school_polls, public.school_votes, public.school_suggestions from anon, authenticated;

grant select, insert on public.school_members to authenticated;
grant update(status) on public.school_members to authenticated;
grant select on public.school_roles to authenticated;
grant select, insert, delete on public.school_notices to authenticated;
grant select, insert, delete on public.school_study_materials to authenticated;
grant select, insert on public.school_events to authenticated;
grant select, insert, delete on public.school_registrations to authenticated;
grant select, insert on public.school_polls to authenticated;
grant select, insert on public.school_votes to authenticated;
grant select, insert on public.school_suggestions to authenticated;
grant update(status) on public.school_suggestions to authenticated;

create policy member_read on public.school_members for select to authenticated
using (user_id=(select auth.uid()) or (select school_private.is_admin()));
create policy member_request on public.school_members for insert to authenticated
with check (
 user_id=(select auth.uid()) and status='pending'
 and (select school_private.is_confirmed())
);
create policy member_review on public.school_members for update to authenticated
using ((select school_private.is_admin()))
with check ((select school_private.is_admin()));
create policy role_own_read on public.school_roles for select to authenticated
using (user_id=(select auth.uid()));

create policy notices_read on public.school_notices for select to authenticated
using ((select school_private.is_approved()) or (select school_private.is_admin()));
create policy notices_create on public.school_notices for insert to authenticated
with check (created_by=(select auth.uid()) and (select school_private.is_admin()));
create policy notices_delete on public.school_notices for delete to authenticated
using ((select school_private.is_admin()));
create policy materials_read on public.school_study_materials for select to authenticated
using ((select school_private.is_approved()) or (select school_private.is_admin()));
create policy materials_create on public.school_study_materials for insert to authenticated
with check (created_by=(select auth.uid()) and (select school_private.is_admin()));
create policy materials_delete on public.school_study_materials for delete to authenticated
using ((select school_private.is_admin()));
create policy events_read on public.school_events for select to authenticated
using ((select school_private.is_approved()) or (select school_private.is_admin()));
create policy events_create on public.school_events for insert to authenticated
with check (created_by=(select auth.uid()) and (select school_private.is_admin()));
create policy registration_read on public.school_registrations for select to authenticated
using (user_id=(select auth.uid()) or (select school_private.is_admin()));
create policy registration_create on public.school_registrations for insert to authenticated
with check (
 user_id=(select auth.uid()) and (select school_private.is_approved())
 and exists (select 1 from public.school_events e where e.id=event_id)
);
create policy registration_cancel on public.school_registrations for delete to authenticated
using (user_id=(select auth.uid()));
create policy polls_read on public.school_polls for select to authenticated
using ((select school_private.is_approved()) or (select school_private.is_admin()));
create policy polls_create on public.school_polls for insert to authenticated
with check (created_by=(select auth.uid()) and (select school_private.is_admin()));
create policy vote_own_read on public.school_votes for select to authenticated
using (user_id=(select auth.uid()));
create policy vote_once on public.school_votes for insert to authenticated
with check (
 user_id=(select auth.uid()) and (select school_private.is_approved())
 and exists (
  select 1 from public.school_polls p where p.id=poll_id
  and p.active and option_index < array_length(p.options,1)
 )
);
create policy suggestions_read on public.school_suggestions for select to authenticated
using (user_id=(select auth.uid()) or (select school_private.is_admin()));
create policy suggestions_create on public.school_suggestions for insert to authenticated
with check (
  user_id=(select auth.uid()) and status='pending'
  and (select school_private.is_approved())
);
create policy suggestions_moderate on public.school_suggestions for update to authenticated
using ((select school_private.is_admin()))
with check ((select school_private.is_admin()));

-- Segurança: revogar execução indireta de funções novas em public permanece responsabilidade da escola.
commit;
