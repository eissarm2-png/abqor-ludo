
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_events_own" ON public.security_events;
CREATE POLICY "security_events_own" ON public.security_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_security_event(_action text, _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.security_events(user_id, action, detail) VALUES (_uid, _action, COALESCE(_detail, '{}'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.list_security_events(_limit int DEFAULT 50)
RETURNS SETOF public.security_events
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.security_events
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT LEAST(COALESCE(_limit, 50), 200);
$$;

CREATE OR REPLACE FUNCTION public.save_player_settings(_settings jsonb)
RETURNS public.player_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.player_settings; _old public.player_settings;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _old FROM public.player_settings WHERE user_id = _uid;
  INSERT INTO public.player_settings AS s (user_id, profile_visibility, allow_invites, show_online, language, graphics, battery_saver, updated_at)
  VALUES (
    _uid,
    COALESCE(_settings->>'profile_visibility', _old.profile_visibility, 'friends'),
    COALESCE((_settings->>'allow_invites')::boolean, _old.allow_invites, true),
    COALESCE((_settings->>'show_online')::boolean, _old.show_online, true),
    COALESCE(_settings->>'language', _old.language, 'ar'),
    COALESCE(_settings->>'graphics', _old.graphics, 'high'),
    COALESCE((_settings->>'battery_saver')::boolean, _old.battery_saver, false),
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

  INSERT INTO public.security_events(user_id, action, detail)
  VALUES (_uid, 'privacy_update', _settings);
  RETURN _row;
END $$;

GRANT EXECUTE ON FUNCTION public.log_security_event(text, jsonb), public.list_security_events(int) TO authenticated;
