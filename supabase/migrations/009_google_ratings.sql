-- Cache for Google Places ratings
create table if not exists google_ratings (
  institution_id text primary key,
  place_id text,
  rating numeric(2,1),
  review_count integer,
  maps_url text,
  fetched_at timestamptz not null default now()
);

-- Index for cleanup/refresh queries
create index if not exists idx_google_ratings_fetched_at on google_ratings (fetched_at);

-- RLS: anyone can read, only service role can write
alter table google_ratings enable row level security;

create policy "Public read access" on google_ratings
  for select using (true);
