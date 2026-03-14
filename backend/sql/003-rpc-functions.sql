-- RPC function to increment config_version atomically
create or replace function increment_config_version(inst_id uuid)
returns void as $$
begin
  update public.instances
  set config_version = coalesce(config_version, 0) + 1,
      updated_at = now()
  where id = inst_id;
end;
$$ language plpgsql security definer;
