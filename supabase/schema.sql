-- ============================================================================
-- Feedbacksysteem — Supabase migratie (van localStorage naar centrale opslag)
--
-- Uitvoeren in: Supabase Dashboard → SQL Editor → New query → plakken → Run.
-- Het hele script is veilig opnieuw te draaien (idempotent waar mogelijk).
-- ============================================================================

-- 1) Tabel met alle feedback-items -------------------------------------------
create table if not exists public.feedback_items (
  id                  text primary key,
  path                text,
  page_title          text,
  section_id          text,
  section_label       text,
  target_kind         text,
  target_kind_label   text,
  target_detail       text,
  action_type         text not null,
  message             text,
  old_text            text,
  new_text            text,
  like_text           text,
  change_text         text,
  attachment_url      text,
  attachment_name     text,
  attachment_type     text,
  image_replace       boolean not null default false,
  status              text not null default 'open'
                        check (status in ('open', 'in-behandeling', 'afgerond')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

create index if not exists feedback_items_status_idx on public.feedback_items (status);
create index if not exists feedback_items_created_at_idx on public.feedback_items (created_at desc);

-- 2) Row Level Security --------------------------------------------------
-- Er is geen inlogsysteem op de voorstelwebsite — iedereen met de link mag
-- feedback lezen, geven en wijzigen, net als voorheen met localStorage.
alter table public.feedback_items enable row level security;

drop policy if exists "Feedback lezen (iedereen)"      on public.feedback_items;
drop policy if exists "Feedback toevoegen (iedereen)"  on public.feedback_items;
drop policy if exists "Feedback wijzigen (iedereen)"   on public.feedback_items;
drop policy if exists "Feedback verwijderen (iedereen)" on public.feedback_items;

create policy "Feedback lezen (iedereen)"
  on public.feedback_items for select
  to anon
  using (true);

create policy "Feedback toevoegen (iedereen)"
  on public.feedback_items for insert
  to anon
  with check (true);

create policy "Feedback wijzigen (iedereen)"
  on public.feedback_items for update
  to anon
  using (true)
  with check (true);

create policy "Feedback verwijderen (iedereen)"
  on public.feedback_items for delete
  to anon
  using (true);

-- 3) Realtime ---------------------------------------------------------------
-- FULL replica identity zorgt dat een UPDATE/DELETE-event de volledige oude
-- rij meestuurt — nodig om bv. bij het verwijderen van tekstfeedback de
-- originele tekst live terug te kunnen zetten op ieders scherm.
alter table public.feedback_items replica identity full;

-- Voegt de tabel toe aan Supabase's standaard realtime-publicatie.
-- Geeft een foutmelding als de tabel er al in staat — dan kun je deze regel
-- gewoon overslaan.
alter publication supabase_realtime add table public.feedback_items;

-- 4) Storage bucket voor bijlagen (foto's, screenshots, video's) ------------
insert into storage.buckets (id, name, public)
values ('feedback-attachments', 'feedback-attachments', true)
on conflict (id) do nothing;

drop policy if exists "Bijlagen lezen (iedereen)"      on storage.objects;
drop policy if exists "Bijlagen uploaden (iedereen)"   on storage.objects;
drop policy if exists "Bijlagen verwijderen (iedereen)" on storage.objects;

create policy "Bijlagen lezen (iedereen)"
  on storage.objects for select
  to anon
  using (bucket_id = 'feedback-attachments');

create policy "Bijlagen uploaden (iedereen)"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'feedback-attachments');

create policy "Bijlagen verwijderen (iedereen)"
  on storage.objects for delete
  to anon
  using (bucket_id = 'feedback-attachments');

-- ============================================================================
-- Klaar. Controleren:
--   select * from public.feedback_items;
--   select * from storage.buckets where id = 'feedback-attachments';
-- ============================================================================
