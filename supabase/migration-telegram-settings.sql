-- Adds an admin-editable Telegram username used for the manual "Buy Now →
-- Telegram → admin unlocks access" purchase flow on the Pricing page and the
-- locked-upload-access screen. Safe to run on a database with real data.

alter table public.app_settings
  add column if not exists telegram_username text not null default 'Dex_Error_404';
