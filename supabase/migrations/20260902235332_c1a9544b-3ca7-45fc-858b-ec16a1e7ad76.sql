CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE(users bigint, banned bigint, matches bigint, matches_24h bigint, gold bigint, diamonds bigint, ludo_matches bigint, domino_matches bigint, admins bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.profiles p),
    (SELECT count(*) FROM public.profiles p WHERE p.banned),
    (SELECT count(*) FROM public.game_results g),
    (SELECT count(*) FROM public.game_results g WHERE g.created_at > now() - interval '24 hours'),
    (SELECT COALESCE(sum(p.gold),0)::bigint FROM public.profiles p),
    (SELECT COALESCE(sum(p.diamonds),0)::bigint FROM public.profiles p),
    (SELECT count(*) FROM public.game_results g WHERE g.mode = 'ludo'),
    (SELECT count(*) FROM public.game_results g WHERE g.mode = 'domino'),
    (SELECT count(*) FROM public.user_roles r WHERE r.role = 'admin'::public.app_role);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated, service_role;