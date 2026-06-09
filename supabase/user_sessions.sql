create table if not exists user_sessions (
  id text primary key,
  username text not null,
  created_datetime timestamptz not null,
  last_active_datetime timestamptz not null,
  ended_datetime timestamptz,
  active_seconds integer not null default 0,
  remember_me boolean not null default false,
  logout_reason text,
  user_agent text
);

create index if not exists user_sessions_username_idx
  on user_sessions (username);

create index if not exists user_sessions_created_datetime_idx
  on user_sessions (created_datetime desc);

alter table user_sessions disable row level security;
