CREATE OR REPLACE FUNCTION public.charge_dice_roll(_cost integer DEFAULT 2, _match_id uuid DEFAULT NULL)
RETURNS TABLE(ok boolean, reason text, gold integer, diamonds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost_safe integer := GREATEST(0, LEAST(COALESCE(_cost, 2), 50));
  _row public.profiles%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RETURN QUERY SELECT false, 'unauthorized', 0, 0;
    RETURN;
  END IF;

  SELECT * INTO _row FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no_profile', 0, 0;
    RETURN;
  END IF;

  IF _cost_safe = 0 THEN
    RETURN QUERY SELECT true, 'free', _row.gold, _row.diamonds;
    RETURN;
  END IF;

  IF _row.gold < _cost_safe THEN
    RETURN QUERY SELECT false, 'insufficient_gold', _row.gold, _row.diamonds;
    RETURN;
  END IF;

  UPDATE public.profiles
     SET gold = gold - _cost_safe, updated_at = now()
   WHERE id = _uid
   RETURNING * INTO _row;

  INSERT INTO public.economy_transactions(user_id, kind, gold_delta, diamonds_delta, xp_delta, detail)
  VALUES (_uid, 'dice_roll', -_cost_safe, 0, 0, jsonb_build_object('match_id', _match_id));

  RETURN QUERY SELECT true, 'ok', _row.gold, _row.diamonds;
END;
$$;

REVOKE ALL ON FUNCTION public.charge_dice_roll(integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.charge_dice_roll(integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.charge_dice_roll(integer, uuid) TO service_role;