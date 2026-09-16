-- ============================================================================
-- Feedbacksysteem — uitbreiding v3: designrichting-vergelijker.
--
-- Voegt een kolom toe die vastlegt onder welk homepage-thema
-- (data-theme="warm" | "brand", zie assets/css/home.css en
-- assets/js/modules/feedback-mode.js) een feedback-item is gegeven.
--
-- Voer uit in: Supabase Dashboard → SQL Editor → New query → plakken → Run.
-- Vereist dat supabase/schema.sql al eerder is uitgevoerd (tabel
-- feedback_items moet al bestaan).
-- ============================================================================

alter table public.feedback_items
  add column if not exists design_theme text check (design_theme in ('warm', 'brand'));

create index if not exists feedback_items_design_theme_idx on public.feedback_items (design_theme);

-- ============================================================================
-- Klaar. Controleren:
--   select design_theme, count(*) from public.feedback_items group by design_theme;
-- ============================================================================
