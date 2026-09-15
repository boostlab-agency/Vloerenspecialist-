-- ============================================================================
-- Feedbacksysteem — uitbreiding v2: feedbacksessies + automatische
-- e-mailnotificaties naar jip@boostlab-agency.nl.
--
-- Voer uit in: Supabase Dashboard → SQL Editor → New query → plakken → Run.
-- Vereist dat supabase/schema.sql al eerder is uitgevoerd (tabel
-- feedback_items moet al bestaan).
-- ============================================================================

-- 1) Tabel voor feedbacksessies ----------------------------------------------
-- Eén sessie = één aaneengesloten periode waarin een klant feedback geeft,
-- vanaf het eerste feedback-item tot aan de "Ik heb alle feedback gegeven"
-- -knop of 50 minuten inactiviteit. Wordt gebruikt om precies te bepalen
-- welke feedback-items "nieuw" zijn voor de e-mailsamenvatting.
create table if not exists public.feedback_sessions (
  id             text primary key,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  ended_reason   text check (ended_reason in ('manual', 'inactivity')),
  email_sent_at  timestamptz,
  item_count     integer not null default 0
);

alter table public.feedback_items
  add column if not exists session_id text references public.feedback_sessions(id);

create index if not exists feedback_items_session_id_idx on public.feedback_items (session_id);

-- 2) Row Level Security -------------------------------------------------
alter table public.feedback_sessions enable row level security;

drop policy if exists "Sessies lezen (iedereen)"    on public.feedback_sessions;
drop policy if exists "Sessies aanmaken (iedereen)" on public.feedback_sessions;
drop policy if exists "Sessies wijzigen (iedereen)" on public.feedback_sessions;

create policy "Sessies lezen (iedereen)"
  on public.feedback_sessions for select
  to anon
  using (true);

create policy "Sessies aanmaken (iedereen)"
  on public.feedback_sessions for insert
  to anon
  with check (true);

create policy "Sessies wijzigen (iedereen)"
  on public.feedback_sessions for update
  to anon
  using (true)
  with check (true);

-- 3) Realtime (optioneel, maar consistent met feedback_items) ---------------
alter table public.feedback_sessions replica identity full;
alter publication supabase_realtime add table public.feedback_sessions;

-- ============================================================================
-- Klaar. Controleren:
--   select * from public.feedback_sessions order by started_at desc;
--   select session_id, count(*) from public.feedback_items group by session_id;
-- ============================================================================
