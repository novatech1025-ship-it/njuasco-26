create table if not exists public.checkout_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone_hash text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists checkout_otp_phone_hash_idx
  on public.checkout_otp_challenges (phone_hash, expires_at desc);

alter table public.checkout_otp_challenges enable row level security;
