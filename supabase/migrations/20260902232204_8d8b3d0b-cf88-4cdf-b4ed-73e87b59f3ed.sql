CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'banner',
  link text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active announcements are public" ON public.announcements
  FOR SELECT USING (active AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.admin_save_announcement(
  _id uuid, _title text, _body text, _kind text, _link text, _active boolean, _expires_at timestamptz
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
  PERFORM public.require_admin();
  IF COALESCE(_kind,'banner') NOT IN ('banner','notice','ad') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.announcements (title, body, kind, link, active, expires_at, created_by)
    VALUES (COALESCE(NULLIF(btrim(_title),''),'إعلان'), COALESCE(_body,''), COALESCE(_kind,'banner'),
            COALESCE(_link,''), COALESCE(_active,true), _expires_at, auth.uid())
    RETURNING id INTO rid;
  ELSE
    UPDATE public.announcements SET
      title = COALESCE(NULLIF(btrim(_title),''), title),
      body = COALESCE(_body, body),
      kind = COALESCE(_kind, kind),
      link = COALESCE(_link, link),
      active = COALESCE(_active, active),
      expires_at = _expires_at
    WHERE id = _id RETURNING id INTO rid;
  END IF;
  PERFORM public.log_admin('save_announcement', NULL, jsonb_build_object('id', rid, 'title', _title));
  RETURN rid;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_announcement(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  DELETE FROM public.announcements WHERE id = _id;
  PERFORM public.log_admin('delete_announcement', NULL, jsonb_build_object('id', _id));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_announcements()
RETURNS SETOF public.announcements LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN QUERY SELECT * FROM public.announcements ORDER BY created_at DESC LIMIT 100;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_rooms_list(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, code text, mode text, status text, is_public boolean,
              max_players integer, members integer, host_name text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN QUERY
  SELECT r.id, r.name, r.code, r.mode, r.status, r.is_public, r.max_players,
         (SELECT count(*)::int FROM public.room_members m WHERE m.room_id = r.id),
         COALESCE((SELECT p.display_name FROM public.profiles p WHERE p.id = r.host_id), 'المضيف'),
         r.created_at
  FROM public.rooms r ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit,50),1),200);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_room(_room uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  DELETE FROM public.rooms WHERE id = _room;
  PERFORM public.log_admin('delete_room', NULL, jsonb_build_object('room', _room));
END; $$;

REVOKE ALL ON FUNCTION public.admin_save_announcement(uuid, text, text, text, text, boolean, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_announcement(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_announcements() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_rooms_list(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_room(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_announcement(uuid, text, text, text, text, boolean, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_announcement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_announcements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rooms_list(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_room(uuid) TO authenticated;