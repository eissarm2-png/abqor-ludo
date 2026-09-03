
-- 1) Profiles: restrict SELECT to self, accepted friends, and shared-room members
DROP POLICY IF EXISTS "Profiles are viewable by signed-in users" ON public.profiles;
CREATE POLICY "Profiles viewable by self friends and roommates"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = auth.uid() AND f.addressee_id = profiles.id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = profiles.id))
  )
  OR EXISTS (
    SELECT 1 FROM public.room_members m1
    JOIN public.room_members m2 ON m2.room_id = m1.room_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
  )
);

-- 2) room_members: controlled INSERT (join as yourself only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_members' AND policyname='Members can join rooms as themselves') THEN
    CREATE POLICY "Members can join rooms as themselves"
    ON public.room_members FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 3) rooms: host-only INSERT/UPDATE/DELETE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rooms' AND policyname='Hosts can create rooms') THEN
    CREATE POLICY "Hosts can create rooms"
    ON public.rooms FOR INSERT TO authenticated
    WITH CHECK (host_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rooms' AND policyname='Hosts can update their rooms') THEN
    CREATE POLICY "Hosts can update their rooms"
    ON public.rooms FOR UPDATE TO authenticated
    USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rooms' AND policyname='Hosts can delete their rooms') THEN
    CREATE POLICY "Hosts can delete their rooms"
    ON public.rooms FOR DELETE TO authenticated
    USING (host_id = auth.uid());
  END IF;
END $$;
