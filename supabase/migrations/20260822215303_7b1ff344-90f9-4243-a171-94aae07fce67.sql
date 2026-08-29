-- =========================
-- 1) الأدوار (RBAC)
-- =========================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.require_admin()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'admin'::public.app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN _uid;
END; $$;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =========================
-- 2) سجل الأدمن
-- =========================
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view admin logs" ON public.admin_logs;
CREATE POLICY "Admins can view admin logs" ON public.admin_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.log_admin(_action text, _target uuid, _detail jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_logs (admin_id, action, target_user, detail)
  VALUES (auth.uid(), _action, _target, COALESCE(_detail,'{}'::jsonb));
END; $$;

-- =========================
-- 3) أحداث الأدوار (تدقيق مؤقت 15 ثانية)
-- =========================
CREATE TABLE IF NOT EXISTS public.turn_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL,
  turn integer NOT NULL DEFAULT 0,
  kind text NOT NULL,
  elapsed_ms integer NOT NULL DEFAULT 0,
  limit_ms integer NOT NULL DEFAULT 15000,
  accepted boolean NOT NULL DEFAULT true,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.turn_events TO authenticated;
GRANT ALL ON public.turn_events TO service_role;
ALTER TABLE public.turn_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own turn events" ON public.turn_events;
CREATE POLICY "Users can view their own turn events" ON public.turn_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all turn events" ON public.turn_events;
CREATE POLICY "Admins can view all turn events" ON public.turn_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.record_turn_event(
  _match_id uuid, _turn integer, _kind text, _elapsed_ms integer,
  _limit_ms integer, _accepted boolean, _reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _kind NOT IN ('start','roll','forfeit','timeout','reject') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  INSERT INTO public.turn_events (user_id, match_id, turn, kind, elapsed_ms, limit_ms, accepted, reason)
  VALUES (_uid, _match_id, GREATEST(COALESCE(_turn,0),0), _kind,
          GREATEST(COALESCE(_elapsed_ms,0),0), GREATEST(COALESCE(_limit_ms,15000),0),
          COALESCE(_accepted,true), NULLIF(_reason,''));
END; $$;

-- =========================
-- 4) المتجر
-- =========================
CREATE TABLE IF NOT EXISTS public.store_items (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'avatar',
  value text NOT NULL DEFAULT '',
  rarity text NOT NULL DEFAULT 'common',
  cost_gold integer NOT NULL DEFAULT 0,
  cost_diamonds integer NOT NULL DEFAULT 0,
  sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.store_items TO authenticated;
GRANT ALL ON public.store_items TO service_role;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store readable by signed-in users" ON public.store_items;
CREATE POLICY "Store readable by signed-in users" ON public.store_items
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.store_items (code, title, description, kind, value, rarity, cost_gold, cost_diamonds, sort) VALUES
  ('avatar-lion','أفاتار الأسد الملكي','أفاتار فخم بلمسة ذهبية','avatar','🦁','rare',900,0,1),
  ('avatar-dragon','أفاتار التنين','للاعبين الجسورين','avatar','🐉','epic',1800,0,2),
  ('banner-desert-gold','بنر ذهب الصحراء','خلفية ملكية دافئة','banner','desert-gold','rare',1200,0,3),
  ('frame-diamond-elite','إطار النخبة الماسي','إطار نادر للمحترفين','frame','diamond-elite','legendary',0,12,4)
ON CONFLICT (code) DO NOTHING;

-- كتالوجات يديرها الأدمن فقط
DROP POLICY IF EXISTS "Admins manage store" ON public.store_items;
CREATE POLICY "Admins manage store" ON public.store_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage chests" ON public.chest_defs;
CREATE POLICY "Admins manage chests" ON public.chest_defs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chest_defs TO authenticated;

DROP POLICY IF EXISTS "Admins manage missions" ON public.mission_defs;
CREATE POLICY "Admins manage missions" ON public.mission_defs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_defs TO authenticated;

-- =========================
-- 5) الحظر
-- =========================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_reason text;

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all results" ON public.game_results;
CREATE POLICY "Admins can view all results" ON public.game_results
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.economy_transactions;
CREATE POLICY "Admins can view all transactions" ON public.economy_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =========================
-- 6) دوال الأدمن
-- =========================
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL, _limit integer DEFAULT 30, _offset integer DEFAULT 0)
RETURNS TABLE(id uuid, email text, display_name text, avatar text, gold integer, diamonds integer, xp integer, level integer,
              points integer, games integer, wins integer, losses integer, banned boolean, banned_reason text,
              is_admin boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN QUERY
  SELECT p.id, u.email::text, p.display_name, p.avatar, p.gold, p.diamonds, p.xp, p.level,
         p.points, p.games, p.wins, p.losses, p.banned, p.banned_reason,
         public.has_role(p.id,'admin'::public.app_role), p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE _search IS NULL OR _search = ''
     OR p.display_name ILIKE '%'||_search||'%'
     OR u.email ILIKE '%'||_search||'%'
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit,30),1),100) OFFSET GREATEST(COALESCE(_offset,0),0);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_economy(_uid uuid, _gold integer, _diamonds integer, _xp integer, _note text DEFAULT NULL)
RETURNS TABLE(gold integer, diamonds integer, xp integer, level integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  PERFORM public.grant_rewards(_uid, 'admin', COALESCE(_gold,0), COALESCE(_diamonds,0), COALESCE(_xp,0),
    jsonb_build_object('note', COALESCE(_note,''), 'by', auth.uid()));
  PERFORM public.log_admin('adjust_economy', _uid,
    jsonb_build_object('gold',_gold,'diamonds',_diamonds,'xp',_xp,'note',COALESCE(_note,'')));
  RETURN QUERY SELECT p.gold, p.diamonds, p.xp, p.level FROM public.profiles p WHERE p.id = _uid;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_update_profile(_uid uuid, _display_name text DEFAULT NULL, _avatar text DEFAULT NULL,
  _banner text DEFAULT NULL, _frame text DEFAULT NULL, _level integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  UPDATE public.profiles p SET
    display_name = COALESCE(NULLIF(_display_name,''), p.display_name),
    avatar = COALESCE(NULLIF(_avatar,''), p.avatar),
    banner = COALESCE(NULLIF(_banner,''), p.banner),
    frame = COALESCE(NULLIF(_frame,''), p.frame),
    level = COALESCE(GREATEST(_level,1), p.level),
    updated_at = now()
  WHERE p.id = _uid;
  PERFORM public.log_admin('update_profile', _uid,
    jsonb_build_object('display_name',_display_name,'avatar',_avatar,'banner',_banner,'frame',_frame,'level',_level));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_ban(_uid uuid, _banned boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  IF _uid = auth.uid() THEN RAISE EXCEPTION 'cannot ban yourself'; END IF;
  UPDATE public.profiles SET banned = COALESCE(_banned,false),
    banned_reason = CASE WHEN COALESCE(_banned,false) THEN NULLIF(_reason,'') ELSE NULL END,
    updated_at = now()
  WHERE id = _uid;
  PERFORM public.log_admin(CASE WHEN COALESCE(_banned,false) THEN 'ban' ELSE 'unban' END, _uid,
    jsonb_build_object('reason', COALESCE(_reason,'')));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_uid uuid, _role public.app_role, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role) ON CONFLICT DO NOTHING;
  ELSE
    IF _uid = auth.uid() AND _role = 'admin'::public.app_role THEN RAISE EXCEPTION 'cannot revoke own admin'; END IF;
    DELETE FROM public.user_roles WHERE user_id = _uid AND role = _role;
  END IF;
  PERFORM public.log_admin('set_role', _uid, jsonb_build_object('role',_role,'grant',_grant));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_grant_item(_uid uuid, _kind text, _code text, _rarity text DEFAULT 'rare')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  IF _kind NOT IN ('avatar','banner','frame') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  INSERT INTO public.user_items (user_id, kind, code, rarity) VALUES (_uid, _kind, _code, COALESCE(_rarity,'rare'))
  ON CONFLICT (user_id, kind, code) DO NOTHING;
  PERFORM public.log_admin('grant_item', _uid, jsonb_build_object('kind',_kind,'code',_code,'rarity',_rarity));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE(users bigint, banned bigint, matches bigint, matches_24h bigint, gold bigint, diamonds bigint,
              ludo_matches bigint, domino_matches bigint, admins bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.profiles WHERE banned),
    (SELECT count(*) FROM public.game_results),
    (SELECT count(*) FROM public.game_results WHERE created_at > now() - interval '24 hours'),
    (SELECT COALESCE(sum(gold),0)::bigint FROM public.profiles),
    (SELECT COALESCE(sum(diamonds),0)::bigint FROM public.profiles),
    (SELECT count(*) FROM public.game_results WHERE mode = 'ludo'),
    (SELECT count(*) FROM public.game_results WHERE mode = 'domino'),
    (SELECT count(*) FROM public.user_roles WHERE role = 'admin'::public.app_role);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_recent_matches(_limit integer DEFAULT 40)
RETURNS TABLE(id uuid, display_name text, mode text, result text, players integer, points integer,
              moves integer, duration_ms integer, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN QUERY
  SELECT g.id, p.display_name, g.mode, g.result, g.players, g.points, g.moves, g.duration_ms, g.created_at
  FROM public.game_results g LEFT JOIN public.profiles p ON p.id = g.user_id
  ORDER BY g.created_at DESC LIMIT LEAST(GREATEST(COALESCE(_limit,40),1),200);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_logs_list(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, admin_name text, action text, target_name text, detail jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN QUERY
  SELECT l.id, a.display_name, l.action, t.display_name, l.detail, l.created_at
  FROM public.admin_logs l
  LEFT JOIN public.profiles a ON a.id = l.admin_id
  LEFT JOIN public.profiles t ON t.id = l.target_user
  ORDER BY l.created_at DESC LIMIT LEAST(GREATEST(COALESCE(_limit,50),1),200);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_turn_events(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, display_name text, match_id uuid, turn integer, kind text, elapsed_ms integer,
              limit_ms integer, accepted boolean, reason text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN QUERY
  SELECT e.id, p.display_name, e.match_id, e.turn, e.kind, e.elapsed_ms, e.limit_ms, e.accepted, e.reason, e.created_at
  FROM public.turn_events e LEFT JOIN public.profiles p ON p.id = e.user_id
  ORDER BY e.created_at DESC LIMIT LEAST(GREATEST(COALESCE(_limit,50),1),200);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_chest(_code text, _title text, _description text, _tier integer,
  _cost_gold integer, _cost_diamonds integer, _cooldown_minutes integer, _sort integer, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  INSERT INTO public.chest_defs (code,title,description,tier,cost_gold,cost_diamonds,cooldown_minutes,sort,active)
  VALUES (_code,_title,COALESCE(_description,''),GREATEST(COALESCE(_tier,1),1),GREATEST(COALESCE(_cost_gold,0),0),
          GREATEST(COALESCE(_cost_diamonds,0),0),GREATEST(COALESCE(_cooldown_minutes,0),0),COALESCE(_sort,0),COALESCE(_active,true))
  ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, tier=EXCLUDED.tier,
    cost_gold=EXCLUDED.cost_gold, cost_diamonds=EXCLUDED.cost_diamonds, cooldown_minutes=EXCLUDED.cooldown_minutes,
    sort=EXCLUDED.sort, active=EXCLUDED.active;
  PERFORM public.log_admin('upsert_chest', NULL, jsonb_build_object('code',_code,'active',_active));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_mission(_code text, _title text, _description text, _period text,
  _metric text, _goal integer, _reward_gold integer, _reward_diamonds integer, _reward_xp integer, _sort integer, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  IF COALESCE(_period,'daily') NOT IN ('daily','weekly') THEN RAISE EXCEPTION 'invalid period'; END IF;
  INSERT INTO public.mission_defs (code,title,description,period,metric,goal,reward_gold,reward_diamonds,reward_xp,sort,active)
  VALUES (_code,_title,COALESCE(_description,''),_period,_metric,GREATEST(COALESCE(_goal,1),1),
          GREATEST(COALESCE(_reward_gold,0),0),GREATEST(COALESCE(_reward_diamonds,0),0),GREATEST(COALESCE(_reward_xp,0),0),
          COALESCE(_sort,0),COALESCE(_active,true))
  ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, period=EXCLUDED.period,
    metric=EXCLUDED.metric, goal=EXCLUDED.goal, reward_gold=EXCLUDED.reward_gold, reward_diamonds=EXCLUDED.reward_diamonds,
    reward_xp=EXCLUDED.reward_xp, sort=EXCLUDED.sort, active=EXCLUDED.active;
  PERFORM public.log_admin('upsert_mission', NULL, jsonb_build_object('code',_code,'active',_active));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_store_item(_code text, _title text, _description text, _kind text,
  _value text, _rarity text, _cost_gold integer, _cost_diamonds integer, _sort integer, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  IF COALESCE(_kind,'avatar') NOT IN ('avatar','banner','frame') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  INSERT INTO public.store_items (code,title,description,kind,value,rarity,cost_gold,cost_diamonds,sort,active)
  VALUES (_code,_title,COALESCE(_description,''),_kind,COALESCE(_value,''),COALESCE(_rarity,'common'),
          GREATEST(COALESCE(_cost_gold,0),0),GREATEST(COALESCE(_cost_diamonds,0),0),COALESCE(_sort,0),COALESCE(_active,true))
  ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, kind=EXCLUDED.kind,
    value=EXCLUDED.value, rarity=EXCLUDED.rarity, cost_gold=EXCLUDED.cost_gold, cost_diamonds=EXCLUDED.cost_diamonds,
    sort=EXCLUDED.sort, active=EXCLUDED.active;
  PERFORM public.log_admin('upsert_store_item', NULL, jsonb_build_object('code',_code,'active',_active));
END; $$;

-- =========================
-- 7) منع المحظورين من تسجيل النتائج
-- =========================
CREATE OR REPLACE FUNCTION public.record_game_result(_result text, _players integer, _match_id uuid, _moves integer DEFAULT 0, _duration_ms integer DEFAULT 0, _mode text DEFAULT 'ludo'::text)
 RETURNS TABLE(points integer, gold integer, xp integer, duplicate boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _pts integer;
  _gold integer;
  _xp integer;
  _players_safe integer;
  _moves_safe integer;
  _dur_safe integer;
  _mode_safe text;
  _min_moves integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _uid AND p.banned) THEN RAISE EXCEPTION 'account banned'; END IF;
  IF _result NOT IN ('win','loss') THEN RAISE EXCEPTION 'invalid result'; END IF;
  IF _match_id IS NULL THEN RAISE EXCEPTION 'match id required'; END IF;

  _mode_safe := CASE WHEN COALESCE(_mode,'ludo') = 'domino' THEN 'domino' ELSE 'ludo' END;
  _players_safe := LEAST(GREATEST(COALESCE(_players, 4), 2), 4);
  _moves_safe := GREATEST(COALESCE(_moves, 0), 0);
  _dur_safe := GREATEST(COALESCE(_duration_ms, 0), 0);

  _min_moves := CASE WHEN _mode_safe = 'domino' THEN 6 ELSE 8 END;
  IF _moves_safe < _min_moves OR _dur_safe < 5000 THEN
    RAISE EXCEPTION 'implausible match';
  END IF;
  IF _dur_safe > 6 * 60 * 60 * 1000 OR _moves_safe > 5000 THEN
    RAISE EXCEPTION 'implausible match';
  END IF;

  IF EXISTS (SELECT 1 FROM public.game_results g WHERE g.user_id = _uid AND g.match_id = _match_id) THEN
    RETURN QUERY SELECT 0, 0, 0, true;
    RETURN;
  END IF;

  IF _mode_safe = 'domino' THEN
    _pts := CASE WHEN _result = 'win' THEN 45 + (_players_safe * 10) ELSE 10 END;
  ELSE
    _pts := CASE WHEN _result = 'win' THEN 50 + (_players_safe * 10) ELSE 10 END;
  END IF;
  _gold := CASE WHEN _result = 'win' THEN 40 + (_players_safe * 10) ELSE 8 END;
  _xp := CASE WHEN _result = 'win' THEN 30 ELSE 10 END;

  INSERT INTO public.game_results (user_id, result, players, points, match_id, moves, duration_ms, mode)
  VALUES (_uid, _result, _players_safe, _pts, _match_id, _moves_safe, _dur_safe, _mode_safe);

  UPDATE public.profiles p
  SET games = p.games + 1,
      wins = p.wins + CASE WHEN _result = 'win' THEN 1 ELSE 0 END,
      losses = p.losses + CASE WHEN _result = 'loss' THEN 1 ELSE 0 END,
      points = p.points + _pts
  WHERE p.id = _uid;

  PERFORM public.grant_rewards(_uid, 'match', _gold, 0, _xp,
    jsonb_build_object('mode', _mode_safe, 'result', _result, 'match_id', _match_id, 'points', _pts));

  PERFORM public.bump_missions(_uid, 'games', 1);
  PERFORM public.bump_missions(_uid, 'points', _pts);
  PERFORM public.bump_missions(_uid, _mode_safe || '_games', 1);
  IF _result = 'win' THEN
    PERFORM public.bump_missions(_uid, 'wins', 1);
    PERFORM public.bump_missions(_uid, _mode_safe || '_wins', 1);
  END IF;

  RETURN QUERY SELECT _pts, _gold, _xp, false;
END;
$function$;