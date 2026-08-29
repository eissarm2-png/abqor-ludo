-- ROOMS
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_players integer NOT NULL DEFAULT 4,
  mode text NOT NULL DEFAULT 'ludo',
  status text NOT NULL DEFAULT 'lobby',
  is_public boolean NOT NULL DEFAULT true,
  match_id uuid,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'لاعب',
  avatar text NOT NULL DEFAULT '👑',
  seat integer NOT NULL DEFAULT 0,
  ready boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'لاعب',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rooms_public_idx ON public.rooms (is_public, status, created_at DESC);
CREATE INDEX room_members_room_idx ON public.room_members (room_id);
CREATE INDEX room_messages_room_idx ON public.room_messages (room_id, created_at);

GRANT SELECT ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT SELECT, UPDATE, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;
GRANT SELECT, INSERT ON public.room_messages TO authenticated;
GRANT ALL ON public.room_messages TO service_role;

CREATE OR REPLACE FUNCTION public.is_room_member(_room uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members m WHERE m.room_id = _room AND m.user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.is_room_host(_room uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = _room AND r.host_id = _uid)
$$;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members and public listings can view rooms" ON public.rooms
  FOR SELECT TO authenticated
  USING (public.is_room_member(id, auth.uid()) OR (is_public AND status = 'lobby'));

CREATE POLICY "Members can view room members" ON public.room_members
  FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Players update their own membership" ON public.room_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Players leave their own membership" ON public.room_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_room_host(room_id, auth.uid()));

CREATE POLICY "Members can read room chat" ON public.room_messages
  FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Members can send room chat" ON public.room_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_room_member(room_id, auth.uid()));

CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPCs
CREATE OR REPLACE FUNCTION public.gen_room_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i integer;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.code = code);
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_room(_name text, _max integer, _mode text, _public boolean)
RETURNS TABLE(room_id uuid, code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  new_code text;
  rid uuid;
  nm text;
  av text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _max IS NULL OR _max < 2 OR _max > 4 THEN RAISE EXCEPTION 'invalid max players'; END IF;
  IF _mode NOT IN ('ludo', 'domino') THEN RAISE EXCEPTION 'invalid mode'; END IF;
  new_code := public.gen_room_code();
  SELECT p.display_name, p.avatar INTO nm, av FROM public.profiles p WHERE p.id = uid;
  INSERT INTO public.rooms (name, code, host_id, max_players, mode, is_public)
  VALUES (COALESCE(NULLIF(btrim(_name), ''), 'غرفة عبقور'), new_code, uid, _max, _mode, COALESCE(_public, true))
  RETURNING id INTO rid;
  INSERT INTO public.room_members (room_id, user_id, display_name, avatar, seat, ready)
  VALUES (rid, uid, COALESCE(nm, 'المضيف'), COALESCE(av, '👑'), 0, true);
  RETURN QUERY SELECT rid, new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_room(_code text)
RETURNS TABLE(room_id uuid, ok boolean, reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  r public.rooms;
  cnt integer;
  nm text;
  av text;
  nseat integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO r FROM public.rooms WHERE code = upper(btrim(_code));
  IF r.id IS NULL THEN RETURN QUERY SELECT NULL::uuid, false, 'رمز الغرفة غير صحيح'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.room_members m WHERE m.room_id = r.id AND m.user_id = uid) THEN
    RETURN QUERY SELECT r.id, true, NULL::text; RETURN;
  END IF;
  IF r.status <> 'lobby' THEN RETURN QUERY SELECT NULL::uuid, false, 'المباراة بدأت بالفعل'; RETURN; END IF;
  SELECT count(*) INTO cnt FROM public.room_members m WHERE m.room_id = r.id;
  IF cnt >= r.max_players THEN RETURN QUERY SELECT NULL::uuid, false, 'الغرفة ممتلئة'; RETURN; END IF;
  SELECT COALESCE(max(m.seat) + 1, 0) INTO nseat FROM public.room_members m WHERE m.room_id = r.id;
  SELECT p.display_name, p.avatar INTO nm, av FROM public.profiles p WHERE p.id = uid;
  INSERT INTO public.room_members (room_id, user_id, display_name, avatar, seat)
  VALUES (r.id, uid, COALESCE(nm, 'لاعب'), COALESCE(av, '👑'), nseat);
  RETURN QUERY SELECT r.id, true, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_rooms()
RETURNS TABLE(id uuid, name text, code text, mode text, max_players integer, members integer, host_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.code, r.mode, r.max_players,
         (SELECT count(*)::int FROM public.room_members m WHERE m.room_id = r.id),
         COALESCE((SELECT m2.display_name FROM public.room_members m2 WHERE m2.room_id = r.id AND m2.user_id = r.host_id), 'المضيف')
  FROM public.rooms r
  WHERE r.is_public AND r.status = 'lobby' AND auth.uid() IS NOT NULL
  ORDER BY r.created_at DESC
  LIMIT 30
$$;

CREATE OR REPLACE FUNCTION public.set_room_ready(_room uuid, _ready boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.room_members SET ready = COALESCE(_ready, false)
  WHERE room_id = _room AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_room(_room uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  host uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT host_id INTO host FROM public.rooms WHERE id = _room;
  DELETE FROM public.room_members WHERE room_id = _room AND user_id = uid;
  IF host = uid THEN
    DELETE FROM public.rooms WHERE id = _room;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.host_update_room(_room uuid, _mode text, _max integer, _public boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cnt integer;
BEGIN
  IF NOT public.is_room_host(_room, auth.uid()) THEN RAISE EXCEPTION 'host only'; END IF;
  IF _mode NOT IN ('ludo', 'domino') THEN RAISE EXCEPTION 'invalid mode'; END IF;
  IF _max < 2 OR _max > 4 THEN RAISE EXCEPTION 'invalid max players'; END IF;
  SELECT count(*) INTO cnt FROM public.room_members WHERE room_id = _room;
  IF cnt > _max THEN RAISE EXCEPTION 'too many members'; END IF;
  UPDATE public.rooms SET mode = _mode, max_players = _max, is_public = COALESCE(_public, is_public)
  WHERE id = _room AND status = 'lobby';
END;
$$;

CREATE OR REPLACE FUNCTION public.start_room_match(_room uuid)
RETURNS TABLE(ok boolean, reason text, match_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cnt integer;
  mid uuid;
BEGIN
  IF NOT public.is_room_host(_room, auth.uid()) THEN RAISE EXCEPTION 'host only'; END IF;
  SELECT count(*) INTO cnt FROM public.room_members WHERE room_id = _room;
  IF cnt < 2 THEN RETURN QUERY SELECT false, 'يلزم لاعبان على الأقل', NULL::uuid; RETURN; END IF;
  mid := gen_random_uuid();
  UPDATE public.rooms SET status = 'playing', match_id = mid, started_at = now()
  WHERE id = _room AND status = 'lobby';
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'الغرفة ليست في وضع الانتظار', NULL::uuid; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text, mid;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_room(_room uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_room_host(_room, auth.uid()) THEN RAISE EXCEPTION 'host only'; END IF;
  UPDATE public.rooms SET status = 'lobby', match_id = NULL, started_at = NULL WHERE id = _room;
  UPDATE public.room_members SET ready = (user_id = (SELECT host_id FROM public.rooms WHERE id = _room))
  WHERE room_id = _room;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_active_room()
RETURNS TABLE(room_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.room_id FROM public.room_members m WHERE m.user_id = auth.uid() ORDER BY m.joined_at DESC LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.gen_room_code() FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_room(text, integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_room_ready(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.host_update_room(uuid, text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_room_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_active_room() TO authenticated;

ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;