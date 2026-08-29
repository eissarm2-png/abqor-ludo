-- بداية الفترة (UTC)
CREATE OR REPLACE FUNCTION public.mission_period_start(_period text)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _period = 'weekly'
    THEN (date_trunc('week', now() AT TIME ZONE 'UTC'))::date
    ELSE (now() AT TIME ZONE 'UTC')::date END;
$$;
REVOKE ALL ON FUNCTION public.mission_period_start(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mission_period_start(text) TO authenticated, service_role;

-- تحديث تقدّم المهام (داخلي)
CREATE OR REPLACE FUNCTION public.bump_missions(_uid uuid, _metric text, _amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m RECORD;
BEGIN
  IF _uid IS NULL OR _amount IS NULL OR _amount <= 0 THEN RETURN; END IF;
  FOR m IN SELECT code, period FROM public.mission_defs WHERE active AND metric = _metric LOOP
    INSERT INTO public.user_missions (user_id, code, period_start, progress)
    VALUES (_uid, m.code, public.mission_period_start(m.period), _amount)
    ON CONFLICT (user_id, code, period_start) DO UPDATE
      SET progress = public.user_missions.progress + _amount, updated_at = now()
      WHERE public.user_missions.claimed_at IS NULL;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_missions(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_missions(uuid, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bump_missions(uuid, text, integer) TO service_role;

-- منح مكافآت للاعب + تسجيل المعاملة (داخلي)
CREATE OR REPLACE FUNCTION public.grant_rewards(
  _uid uuid, _kind text, _gold integer, _diamonds integer, _xp integer, _detail jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles p
  SET gold = GREATEST(p.gold + COALESCE(_gold,0), 0),
      diamonds = GREATEST(p.diamonds + COALESCE(_diamonds,0), 0),
      xp = GREATEST(p.xp + COALESCE(_xp,0), 0),
      level = 1 + (GREATEST(p.xp + COALESCE(_xp,0), 0) / 300)
  WHERE p.id = _uid;

  INSERT INTO public.economy_transactions (user_id, kind, gold_delta, diamonds_delta, xp_delta, detail)
  VALUES (_uid, _kind, COALESCE(_gold,0), COALESCE(_diamonds,0), COALESCE(_xp,0), COALESCE(_detail,'{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.grant_rewards(uuid, text, integer, integer, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_rewards(uuid, text, integer, integer, integer, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_rewards(uuid, text, integer, integer, integer, jsonb) TO service_role;

-- تسجيل نتيجة مباراة (لودو أو دومينو) بتحقق كامل من السيرفر
DROP FUNCTION IF EXISTS public.record_game_result(text, integer, uuid, integer, integer, text);
DROP FUNCTION IF EXISTS public.record_game_result(text, integer);
CREATE OR REPLACE FUNCTION public.record_game_result(
  _result text, _players integer, _match_id uuid,
  _moves integer DEFAULT 0, _duration_ms integer DEFAULT 0, _mode text DEFAULT 'ludo'
) RETURNS TABLE (points integer, gold integer, xp integer, duplicate boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  IF _result NOT IN ('win','loss') THEN RAISE EXCEPTION 'invalid result'; END IF;
  IF _match_id IS NULL THEN RAISE EXCEPTION 'match id required'; END IF;

  _mode_safe := CASE WHEN COALESCE(_mode,'ludo') = 'domino' THEN 'domino' ELSE 'ludo' END;
  _players_safe := LEAST(GREATEST(COALESCE(_players, 4), 2), 4);
  _moves_safe := GREATEST(COALESCE(_moves, 0), 0);
  _dur_safe := GREATEST(COALESCE(_duration_ms, 0), 0);

  -- الدومينو ينتهي بحركات أقل من اللودو، فلكل نمط حدّه الأدنى
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
$$;
REVOKE ALL ON FUNCTION public.record_game_result(text, integer, uuid, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_game_result(text, integer, uuid, integer, integer, text) TO authenticated, service_role;

-- قراءة المهام الحالية مع التقدّم
CREATE OR REPLACE FUNCTION public.get_missions()
RETURNS TABLE (
  code text, title text, description text, period text, goal integer,
  progress integer, reward_gold integer, reward_diamonds integer, reward_xp integer,
  claimed boolean, claimable boolean, period_start date, resets_at timestamptz, sort integer
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY
  SELECT d.code, d.title, d.description, d.period, d.goal,
         LEAST(COALESCE(um.progress, 0), d.goal) AS progress,
         d.reward_gold, d.reward_diamonds, d.reward_xp,
         (um.claimed_at IS NOT NULL) AS claimed,
         (COALESCE(um.progress,0) >= d.goal AND um.claimed_at IS NULL) AS claimable,
         public.mission_period_start(d.period) AS period_start,
         (CASE WHEN d.period = 'weekly'
            THEN public.mission_period_start('weekly') + INTERVAL '7 days'
            ELSE public.mission_period_start('daily') + INTERVAL '1 day' END) AT TIME ZONE 'UTC' AS resets_at,
         d.sort
  FROM public.mission_defs d
  LEFT JOIN public.user_missions um
    ON um.code = d.code AND um.user_id = _uid
   AND um.period_start = public.mission_period_start(d.period)
  WHERE d.active
  ORDER BY d.sort;
END;
$$;
REVOKE ALL ON FUNCTION public.get_missions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_missions() TO authenticated, service_role;

-- استلام مكافأة مهمة
CREATE OR REPLACE FUNCTION public.claim_mission(_code text)
RETURNS TABLE (ok boolean, reason text, gold integer, diamonds integer, xp integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _def RECORD;
  _ps date;
  _rows integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _def FROM public.mission_defs WHERE code = _code AND active;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'unknown_mission', 0, 0, 0; RETURN; END IF;

  _ps := public.mission_period_start(_def.period);

  UPDATE public.user_missions um
  SET claimed_at = now(), updated_at = now()
  WHERE um.user_id = _uid AND um.code = _def.code AND um.period_start = _ps
    AND um.claimed_at IS NULL AND um.progress >= _def.goal;
  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows = 0 THEN RETURN QUERY SELECT false, 'not_claimable', 0, 0, 0; RETURN; END IF;

  PERFORM public.grant_rewards(_uid, 'mission', _def.reward_gold, _def.reward_diamonds, _def.reward_xp,
    jsonb_build_object('mission', _def.code, 'period', _def.period, 'period_start', _ps));

  RETURN QUERY SELECT true, 'ok', _def.reward_gold, _def.reward_diamonds, _def.reward_xp;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_mission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_mission(text) TO authenticated, service_role;

-- فتح صندوق: التكلفة والانتظار والمكافأة كلها من السيرفر
CREATE OR REPLACE FUNCTION public.open_chest(_code text)
RETURNS TABLE (
  ok boolean, reason text, gold integer, diamonds integer, xp integer,
  item_kind text, item_code text, rarity text, is_new boolean, next_free_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _chest RECORD;
  _prof RECORD;
  _last timestamptz;
  _gold integer := 0;
  _dia integer := 0;
  _xp integer := 20;
  _kind text := NULL;
  _item text := NULL;
  _rarity text := 'common';
  _roll numeric;
  _avatars text[] := ARRAY['👑','🦁','🐉','🦅','🧿','🌟','🎯','🔥','💠','🕌'];
  _banners text[] := ARRAY['royal-purple','desert-gold','neon-pink','emerald-night','sapphire-dawn'];
  _frames  text[] := ARRAY['gold-classic','pink-neon','emerald-royal','diamond-elite'];
  _new boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO _chest FROM public.chest_defs WHERE code = _code AND active;
  IF NOT FOUND THEN RETURN QUERY SELECT false,'unknown_chest',0,0,0,NULL::text,NULL::text,NULL::text,false,NULL::timestamptz; RETURN; END IF;

  SELECT * INTO _prof FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false,'no_profile',0,0,0,NULL::text,NULL::text,NULL::text,false,NULL::timestamptz; RETURN; END IF;

  IF _chest.cooldown_minutes > 0 THEN
    SELECT MAX(created_at) INTO _last FROM public.economy_transactions
    WHERE user_id = _uid AND kind = 'chest' AND detail->>'chest' = _chest.code;
    IF _last IS NOT NULL AND _last > now() - make_interval(mins => _chest.cooldown_minutes) THEN
      RETURN QUERY SELECT false,'cooldown',0,0,0,NULL::text,NULL::text,NULL::text,false,
        (_last + make_interval(mins => _chest.cooldown_minutes));
      RETURN;
    END IF;
  END IF;

  IF _prof.gold < _chest.cost_gold THEN
    RETURN QUERY SELECT false,'not_enough_gold',0,0,0,NULL::text,NULL::text,NULL::text,false,NULL::timestamptz; RETURN;
  END IF;
  IF _prof.diamonds < _chest.cost_diamonds THEN
    RETURN QUERY SELECT false,'not_enough_diamonds',0,0,0,NULL::text,NULL::text,NULL::text,false,NULL::timestamptz; RETURN;
  END IF;

  -- توزيع المكافآت داخل السيرفر
  _gold := (_chest.tier * 120) + floor(random() * (_chest.tier * 160))::integer;
  IF random() < (0.20 * _chest.tier) THEN
    _dia := 1 + floor(random() * _chest.tier)::integer;
  END IF;

  _roll := random();
  IF _roll < 0.30 + (0.08 * _chest.tier) THEN
    IF _roll < 0.12 THEN
      _kind := 'frame'; _item := _frames[1 + floor(random() * array_length(_frames,1))::int];
    ELSIF _roll < 0.24 THEN
      _kind := 'banner'; _item := _banners[1 + floor(random() * array_length(_banners,1))::int];
    ELSE
      _kind := 'avatar'; _item := _avatars[1 + floor(random() * array_length(_avatars,1))::int];
    END IF;
    _rarity := CASE
      WHEN _chest.tier >= 3 AND random() < 0.35 THEN 'legendary'
      WHEN _chest.tier >= 2 AND random() < 0.45 THEN 'epic'
      WHEN random() < 0.5 THEN 'rare' ELSE 'common' END;

    INSERT INTO public.user_items (user_id, kind, code, rarity)
    VALUES (_uid, _kind, _item, _rarity)
    ON CONFLICT (user_id, kind, code) DO NOTHING;
    GET DIAGNOSTICS _new = ROW_COUNT;
    IF NOT _new THEN
      -- مكرر: يُستبدل بذهب إضافي
      _gold := _gold + (_chest.tier * 60);
    END IF;
  END IF;

  PERFORM public.grant_rewards(_uid, 'chest',
    _gold - _chest.cost_gold, _dia - _chest.cost_diamonds, _xp,
    jsonb_build_object('chest', _chest.code, 'tier', _chest.tier,
      'gold_won', _gold, 'diamonds_won', _dia,
      'cost_gold', _chest.cost_gold, 'cost_diamonds', _chest.cost_diamonds,
      'item_kind', _kind, 'item_code', _item, 'rarity', _rarity, 'duplicate', (_kind IS NOT NULL AND NOT _new)));

  RETURN QUERY SELECT true,'ok',_gold,_dia,_xp,_kind,_item,_rarity,_new,
    (CASE WHEN _chest.cooldown_minutes > 0 THEN now() + make_interval(mins => _chest.cooldown_minutes) ELSE NULL END);
END;
$$;
REVOKE ALL ON FUNCTION public.open_chest(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_chest(text) TO authenticated, service_role;

-- حالة الصناديق للاعب
CREATE OR REPLACE FUNCTION public.get_chests()
RETURNS TABLE (
  code text, title text, description text, tier integer,
  cost_gold integer, cost_diamonds integer, cooldown_minutes integer,
  next_free_at timestamptz, sort integer
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY
  SELECT c.code, c.title, c.description, c.tier, c.cost_gold, c.cost_diamonds, c.cooldown_minutes,
    (SELECT MAX(t.created_at) + make_interval(mins => c.cooldown_minutes)
       FROM public.economy_transactions t
      WHERE t.user_id = _uid AND t.kind = 'chest' AND t.detail->>'chest' = c.code
        AND c.cooldown_minutes > 0) AS next_free_at,
    c.sort
  FROM public.chest_defs c
  WHERE c.active
  ORDER BY c.sort;
END;
$$;
REVOKE ALL ON FUNCTION public.get_chests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chests() TO authenticated, service_role;