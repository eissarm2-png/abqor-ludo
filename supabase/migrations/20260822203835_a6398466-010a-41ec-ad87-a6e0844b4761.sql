REVOKE ALL ON FUNCTION public.grant_rewards(uuid, text, integer, integer, integer, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.bump_missions(uuid, text, integer) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.mission_period_start(text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.record_game_result(text, integer, uuid, integer, integer, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_missions() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.claim_mission(text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.open_chest(text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_chests() FROM anon, PUBLIC;