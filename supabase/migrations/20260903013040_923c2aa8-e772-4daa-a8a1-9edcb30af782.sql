
CREATE TABLE IF NOT EXISTS public.game_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
  room_code text NOT NULL,
  mode text NOT NULL DEFAULT 'classic',
  max_players int NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_invites TO authenticated;
GRANT ALL ON public.game_invites TO service_role;
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invites_read" ON public.game_invites;
CREATE POLICY "invites_read" ON public.game_invites FOR SELECT TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.player_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility text NOT NULL DEFAULT 'friends',
  allow_invites boolean NOT NULL DEFAULT true,
  show_online boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'ar',
  graphics text NOT NULL DEFAULT 'high',
  battery_saver boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.player_settings TO authenticated;
GRANT ALL ON public.player_settings TO service_role;
ALTER TABLE public.player_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_own" ON public.player_settings;
CREATE POLICY "settings_own" ON public.player_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.save_player_settings(_settings jsonb)
RETURNS public.player_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.player_settings;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.player_settings AS s (user_id, profile_visibility, allow_invites, show_online, language, graphics, battery_saver, updated_at)
  VALUES (
    _uid,
    COALESCE(_settings->>'profile_visibility','friends'),
    COALESCE((_settings->>'allow_invites')::boolean, true),
    COALESCE((_settings->>'show_online')::boolean, true),
    COALESCE(_settings->>'language','ar'),
    COALESCE(_settings->>'graphics','high'),
    COALESCE((_settings->>'battery_saver')::boolean, false),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    profile_visibility = EXCLUDED.profile_visibility,
    allow_invites = EXCLUDED.allow_invites,
    show_online = EXCLUDED.show_online,
    language = EXCLUDED.language,
    graphics = EXCLUDED.graphics,
    battery_saver = EXCLUDED.battery_saver,
    updated_at = now()
  RETURNING * INTO _row;
  RETURN _row;
END $$;

CREATE OR REPLACE FUNCTION public.get_player_settings()
RETURNS public.player_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.player_settings;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _row FROM public.player_settings WHERE user_id = _uid;
  IF NOT FOUND THEN
    INSERT INTO public.player_settings(user_id) VALUES (_uid) RETURNING * INTO _row;
  END IF;
  RETURN _row;
END $$;

CREATE OR REPLACE FUNCTION public.send_game_invite(_to uuid, _room_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _room public.rooms; _name text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not authenticated'); END IF;
  SELECT * INTO _room FROM public.rooms WHERE upper(code) = upper(_room_code) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'unknown_room'); END IF;
  IF NOT COALESCE((SELECT allow_invites FROM public.player_settings WHERE user_id = _to), true) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invites_disabled');
  END IF;
  INSERT INTO public.game_invites(from_id, to_id, room_id, room_code, mode, max_players)
  VALUES (_uid, _to, _room.id, _room.code, _room.mode, _room.max_players);
  SELECT display_name INTO _name FROM public.profiles WHERE id = _uid;
  INSERT INTO public.notifications(user_id, kind, title, body)
  VALUES (_to, 'invite', 'دعوة للعب', COALESCE(_name,'لاعب') || ' دعاك إلى غرفة ' || _room.code);
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.list_game_invites()
RETURNS TABLE (
  id uuid, direction text, other_name text, other_avatar text,
  room_code text, mode text, max_players int, status text, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id,
         CASE WHEN i.to_id = auth.uid() THEN 'incoming' ELSE 'outgoing' END,
         p.display_name, p.avatar, i.room_code, i.mode, i.max_players, i.status, i.created_at
  FROM public.game_invites i
  LEFT JOIN public.profiles p
    ON p.id = CASE WHEN i.to_id = auth.uid() THEN i.from_id ELSE i.to_id END
  WHERE (i.to_id = auth.uid() OR i.from_id = auth.uid())
    AND i.created_at > now() - interval '1 day'
  ORDER BY i.created_at DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.respond_game_invite(_id uuid, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _inv public.game_invites;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not authenticated'); END IF;
  SELECT * INTO _inv FROM public.game_invites WHERE id = _id AND to_id = _uid AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  UPDATE public.game_invites SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END WHERE id = _id;
  RETURN jsonb_build_object('ok', true, 'room_code', _inv.room_code, 'accepted', _accept);
END $$;

CREATE OR REPLACE FUNCTION public.reject_all_game_invites()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  UPDATE public.game_invites SET status = 'declined' WHERE to_id = _uid AND status = 'pending';
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.save_player_settings(jsonb), public.get_player_settings(),
  public.send_game_invite(uuid, text), public.list_game_invites(),
  public.respond_game_invite(uuid, boolean), public.reject_all_game_invites() TO authenticated;
