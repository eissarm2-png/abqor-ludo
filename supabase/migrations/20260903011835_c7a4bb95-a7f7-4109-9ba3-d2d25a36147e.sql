CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_select" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friendships_insert" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND requester_id <> addressee_id);
CREATE POLICY "friendships_update" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id)
  WITH CHECK (auth.uid() = addressee_id OR auth.uid() = requester_id);
CREATE POLICY "friendships_delete" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.send_friend_request(_name TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me UUID := auth.uid(); _target UUID;
BEGIN
  IF _me IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not authenticated'); END IF;
  SELECT id INTO _target FROM public.profiles WHERE lower(display_name) = lower(btrim(_name)) AND id <> _me LIMIT 1;
  IF _target IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'player_not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.friendships WHERE status <> 'declined'
      AND ((requester_id = _me AND addressee_id = _target) OR (requester_id = _target AND addressee_id = _me)))
  THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_exists'); END IF;
  INSERT INTO public.friendships (requester_id, addressee_id) VALUES (_me, _target)
  ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'pending', updated_at = now();
  INSERT INTO public.notifications (user_id, kind, title, body)
  VALUES (_target, 'friend', 'طلب صداقة جديد',
          COALESCE((SELECT display_name FROM public.profiles WHERE id = _me), 'لاعب') || ' يريد أن يكون صديقك');
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.respond_friend_request(_id UUID, _accept BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me UUID := auth.uid(); _req UUID;
BEGIN
  IF _me IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not authenticated'); END IF;
  UPDATE public.friendships SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END, updated_at = now()
  WHERE id = _id AND addressee_id = _me AND status = 'pending' RETURNING requester_id INTO _req;
  IF _req IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'request_not_found'); END IF;
  IF _accept THEN
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (_req, 'friend', 'تم قبول طلب الصداقة',
            COALESCE((SELECT display_name FROM public.profiles WHERE id = _me), 'لاعب') || ' أصبح صديقك الآن');
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.list_friends()
RETURNS TABLE (friendship_id UUID, user_id UUID, display_name TEXT, avatar TEXT, status TEXT, direction TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id,
         CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END,
         p.display_name, p.avatar, f.status,
         CASE WHEN f.requester_id = auth.uid() THEN 'outgoing' ELSE 'incoming' END,
         f.created_at
  FROM public.friendships f
  JOIN public.profiles p ON p.id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  WHERE auth.uid() IN (f.requester_id, f.addressee_id)
  ORDER BY f.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me UUID := auth.uid();
BEGIN
  IF _me IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not authenticated'); END IF;
  UPDATE public.notifications SET read_at = now()
  WHERE user_id = _me AND read_at IS NULL AND (_id IS NULL OR id = _id);
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.send_friend_request(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID) TO authenticated;