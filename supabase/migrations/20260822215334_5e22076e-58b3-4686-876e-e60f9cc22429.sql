-- لا شيء ينفّذ للزوار
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- الدوال الداخلية: للسيرفر فقط
REVOKE EXECUTE ON FUNCTION public.grant_rewards(uuid, text, integer, integer, integer, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_missions(uuid, text, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_admin(text, uuid, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.require_admin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;

-- الدوال التي يستدعيها التطبيق للمسجّلين
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mission_period_start(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_missions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_chest(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_game_result(text, integer, uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_turn_event(uuid, integer, text, integer, integer, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_economy(uuid, integer, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_ban(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_item(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_matches(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logs_list(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_turn_events(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_chest(text, text, text, integer, integer, integer, integer, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_mission(text, text, text, text, text, integer, integer, integer, integer, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_store_item(text, text, text, text, text, text, integer, integer, integer, boolean) TO authenticated;

-- خدمة السيرفر تنفّذ كل شيء
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;