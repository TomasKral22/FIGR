create table if not exists public.user_app_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  storage_value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, storage_key)
);

alter table public.user_app_state enable row level security;

create policy "Users can read own app state"
on public.user_app_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own app state"
on public.user_app_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own app state"
on public.user_app_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own app state"
on public.user_app_state
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_user_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_app_state_updated_at on public.user_app_state;
create trigger set_user_app_state_updated_at
before update on public.user_app_state
for each row
execute function public.set_user_app_state_updated_at();

insert into storage.buckets (id, name, public)
values ('transaction-attachments', 'transaction-attachments', false)
on conflict (id) do nothing;

create policy "Users can read own transaction attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'transaction-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload own transaction attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'transaction-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own transaction attachments"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'transaction-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'transaction-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own transaction attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'transaction-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);
