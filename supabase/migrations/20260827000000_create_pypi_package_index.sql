create extension if not exists pg_trgm with schema extensions;

create table public.pypi_packages (
  normalized_name text primary key,
  name text not null,
  last_serial bigint not null check (last_serial >= 0),
  metadata_serial bigint check (metadata_serial >= 0),
  latest_version text,
  description text,
  sync_id uuid not null,
  synced_at timestamptz not null default now()
);

create index pypi_packages_normalized_name_prefix_idx
  on public.pypi_packages (normalized_name text_pattern_ops);

create index pypi_packages_normalized_name_trgm_idx
  on public.pypi_packages
  using gin (normalized_name extensions.gin_trgm_ops);

alter table public.pypi_packages enable row level security;

revoke all on table public.pypi_packages from anon, authenticated;

create table public.pypi_package_sync_state (
  singleton boolean primary key default true check (singleton),
  active_sync_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  source_serial bigint,
  package_count integer not null default 0
);

insert into public.pypi_package_sync_state (singleton)
values (true);

alter table public.pypi_package_sync_state enable row level security;

revoke all on table public.pypi_package_sync_state from anon, authenticated;

create or replace function public.search_packages(
  query_text text,
  result_limit integer default 10
)
returns table (
  name text,
  latest_version text,
  description text,
  last_serial bigint,
  metadata_serial bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with input as (
    select regexp_replace(
      regexp_replace(lower(trim(coalesce(query_text, ''))), '[^a-z0-9._-]+', '', 'g'),
      '[-_.]+',
      '-',
      'g'
    ) as query
  )
  select
    packages.name,
    packages.latest_version,
    packages.description,
    packages.last_serial,
    packages.metadata_serial
  from public.pypi_packages as packages
  cross join input
  where input.query <> ''
    and (
      packages.normalized_name like input.query || '%'
      or (
        length(input.query) >= 3
        and (
          packages.normalized_name like '%' || input.query || '%'
          or packages.normalized_name operator(extensions.%) input.query
        )
      )
    )
  order by
    (packages.normalized_name = input.query) desc,
    (packages.normalized_name like input.query || '%') desc,
    (position(input.query in packages.normalized_name) > 0) desc,
    nullif(position(input.query in packages.normalized_name), 0),
    extensions.similarity(packages.normalized_name, input.query) desc,
    length(packages.normalized_name),
    packages.normalized_name
  limit least(greatest(coalesce(result_limit, 10), 1), 50);
$$;

revoke all on function public.search_packages(text, integer) from public;
grant execute on function public.search_packages(text, integer) to anon, authenticated;

create or replace function public.upsert_package_batch(package_batch jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.pypi_packages (
    normalized_name,
    name,
    last_serial,
    sync_id
  )
  select
    package ->> 'normalized_name',
    package ->> 'name',
    (package ->> 'last_serial')::bigint,
    (package ->> 'sync_id')::uuid
  from jsonb_array_elements(package_batch) as package
  on conflict (normalized_name) do update
  set last_serial = excluded.last_serial,
      sync_id = excluded.sync_id,
      synced_at = now();
$$;

create or replace function public.update_package_metadata_batch(metadata_batch jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.pypi_packages
  set name = metadata.name,
      latest_version = metadata.latest_version,
      description = metadata.description,
      metadata_serial = metadata.last_serial
  from jsonb_to_recordset(metadata_batch) as metadata(
    normalized_name text,
    name text,
    latest_version text,
    description text,
    last_serial bigint
  )
  where public.pypi_packages.normalized_name = metadata.normalized_name
    and public.pypi_packages.last_serial = metadata.last_serial;
$$;

create or replace function public.begin_package_sync()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_sync_id uuid := gen_random_uuid();
begin
  update public.pypi_package_sync_state
  set active_sync_id = new_sync_id,
      started_at = now()
  where singleton
    and (
      active_sync_id is null
      or started_at < now() - interval '2 hours'
    );

  if not found then
    raise exception 'A package sync is already running';
  end if;

  return new_sync_id;
end;
$$;

create or replace function public.finish_package_sync(
  requested_sync_id uuid,
  requested_source_serial bigint,
  expected_package_count integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actual_package_count integer;
begin
  if not exists (
    select 1
    from public.pypi_package_sync_state
    where singleton
      and active_sync_id = requested_sync_id
  ) then
    raise exception 'Package sync lease is no longer active';
  end if;

  select count(*)::integer
  into actual_package_count
  from public.pypi_packages
  where sync_id = requested_sync_id;

  if actual_package_count <> expected_package_count then
    raise exception 'Package sync is incomplete: expected %, received %',
      expected_package_count,
      actual_package_count;
  end if;

  delete from public.pypi_packages
  where sync_id <> requested_sync_id;

  update public.pypi_package_sync_state
  set active_sync_id = null,
      started_at = null,
      completed_at = now(),
      source_serial = requested_source_serial,
      package_count = actual_package_count
  where singleton
    and active_sync_id = requested_sync_id;

  return actual_package_count;
end;
$$;

create or replace function public.abort_package_sync(requested_sync_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.pypi_package_sync_state
  set active_sync_id = null,
      started_at = null
  where singleton
    and active_sync_id = requested_sync_id;
$$;

revoke all on function public.begin_package_sync() from public;
revoke all on function public.finish_package_sync(uuid, bigint, integer) from public;
revoke all on function public.abort_package_sync(uuid) from public;
revoke all on function public.upsert_package_batch(jsonb) from public;
revoke all on function public.update_package_metadata_batch(jsonb) from public;

grant execute on function public.begin_package_sync() to service_role;
grant execute on function public.finish_package_sync(uuid, bigint, integer) to service_role;
grant execute on function public.abort_package_sync(uuid) to service_role;
grant execute on function public.upsert_package_batch(jsonb) to service_role;
grant execute on function public.update_package_metadata_batch(jsonb) to service_role;
