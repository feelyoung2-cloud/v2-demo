-- 누구나 읽고 작성하는 공개 방명록. 수정/삭제는 브라우저에 허용하지 않습니다.
begin;
create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 20),
  message text not null check (char_length(btrim(message)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists guestbook_entries_created_at_idx
  on public.guestbook_entries (created_at desc, id desc);
alter table public.guestbook_entries enable row level security;
revoke all on public.guestbook_entries from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.guestbook_entries to anon, authenticated;
grant insert (name, message) on public.guestbook_entries to anon, authenticated;
drop policy if exists "Anyone can read entries" on public.guestbook_entries;
create policy "Anyone can read entries" on public.guestbook_entries
  for select to anon, authenticated using (true);
drop policy if exists "Anyone can write valid entries" on public.guestbook_entries;
create policy "Anyone can write valid entries" on public.guestbook_entries
  for insert to anon, authenticated
  with check (char_length(btrim(name)) between 1 and 20
    and char_length(btrim(message)) between 1 and 500);
commit;
