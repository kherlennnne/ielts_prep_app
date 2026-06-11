alter table sessions
  add column if not exists username text;

create index if not exists sessions_username_idx
  on sessions (username);
