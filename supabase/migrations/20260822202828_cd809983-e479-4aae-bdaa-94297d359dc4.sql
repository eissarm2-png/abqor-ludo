ALTER TABLE public.game_results
  ADD COLUMN IF NOT EXISTS match_id UUID,
  ADD COLUMN IF NOT EXISTS moves INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'local';

CREATE UNIQUE INDEX IF NOT EXISTS game_results_match_unique
  ON public.game_results (user_id, match_id) WHERE match_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS game_results_user_created_idx
  ON public.game_results (user_id, created_at DESC);

DROP FUNCTION IF EXISTS public.record_game_result(text, integer);

CREATE OR REPLACE FUNCTION public.record_game_result(
  _result text,
  _players integer,
  _match_id uuid,
  _moves integer DEFAULT 0,
  _duration_ms integer DEFAULT 0,
  _mode text DEFAULT 'local'
)
RETURNS TABLE (points integer, duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _pts INTEGER;
  _players_safe INTEGER;
  _moves_safe INTEGER;
  _dur_safe INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _result NOT IN ('win','loss') THEN RAISE EXCEPTION 'invalid result'; END IF;
  IF _match_id IS NULL THEN RAISE EXCEPTION 'match id required'; END IF;

  _players_safe := LEAST(GREATEST(COALESCE(_players, 4), 2), 4);
  _moves_safe := GREATEST(COALESCE(_moves, 0), 0);
  _dur_safe := GREATEST(COALESCE(_duration_ms, 0), 0);

  -- مباراة قصيرة جدًا أو بلا حركات كافية تُرفض
  IF _moves_safe < 8 OR _dur_safe < 5000 THEN
    RAISE EXCEPTION 'implausible match';
  END IF;

  IF EXISTS (SELECT 1 FROM public.game_results g WHERE g.user_id = _uid AND g.match_id = _match_id) THEN
    RETURN QUERY SELECT 0, true;
    RETURN;
  END IF;

  _pts := CASE WHEN _result = 'win' THEN 50 + (_players_safe * 10) ELSE 10 END;

  INSERT INTO public.game_results (user_id, result, players, points, match_id, moves, duration_ms, mode)
  VALUES (_uid, _result, _players_safe, _pts, _match_id, _moves_safe, _dur_safe, COALESCE(_mode, 'local'));

  UPDATE public.profiles p
  SET games = p.games + 1,
      wins = p.wins + CASE WHEN _result = 'win' THEN 1 ELSE 0 END,
      losses = p.losses + CASE WHEN _result = 'loss' THEN 1 ELSE 0 END,
      points = p.points + _pts
  WHERE p.id = _uid;

  RETURN QUERY SELECT _pts, false;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_game_result(text, integer, uuid, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_game_result(text, integer, uuid, integer, integer, text) TO authenticated, service_role;