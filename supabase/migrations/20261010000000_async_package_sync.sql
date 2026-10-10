alter table public.pypi_package_sync_state
  add column last_sync_id uuid,
  add column failed_at timestamptz,
  add column last_error text;

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
      last_sync_id = new_sync_id,
      started_at = now(),
      failed_at = null,
      last_error = null
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

drop function public.abort_package_sync(uuid);

create function public.abort_package_sync(
  requested_sync_id uuid,
  error_message text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.pypi_package_sync_state
  set active_sync_id = null,
      started_at = null,
      failed_at = now(),
      last_error = left(error_message, 2000)
  where singleton
    and active_sync_id = requested_sync_id;
$$;

create function public.get_package_sync_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status',
    case
      when active_sync_id is not null then 'running'
      when failed_at is not null then 'failed'
      when completed_at is not null then 'completed'
      else 'idle'
    end,
    'sync_id', coalesce(active_sync_id, last_sync_id),
    'started_at', started_at,
    'completed_at', completed_at,
    'failed_at', failed_at,
    'error', last_error,
    'source_serial', source_serial,
    'package_count', package_count
  )
  from public.pypi_package_sync_state
  where singleton;
$$;

revoke all on function public.abort_package_sync(uuid, text) from public;
revoke all on function public.get_package_sync_status() from public;

grant execute on function public.abort_package_sync(uuid, text) to service_role;
grant execute on function public.get_package_sync_status() to service_role;
