CREATE OR REPLACE FUNCTION public.purchase_store_item(_code text)
RETURNS TABLE(ok boolean, reason text, gold integer, diamonds integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _it RECORD;
  _p RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _it FROM public.store_items WHERE code = _code AND active;
  IF NOT FOUND THEN RETURN QUERY SELECT false,'unknown_item',0,0; RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.user_items u WHERE u.user_id = _uid AND u.kind = _it.kind AND u.code = _it.code) THEN
    RETURN QUERY SELECT false,'already_owned',0,0; RETURN;
  END IF;

  SELECT * INTO _p FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _p.banned THEN RETURN QUERY SELECT false,'banned',0,0; RETURN; END IF;
  IF _p.gold < _it.cost_gold THEN RETURN QUERY SELECT false,'not_enough_gold',0,0; RETURN; END IF;
  IF _p.diamonds < _it.cost_diamonds THEN RETURN QUERY SELECT false,'not_enough_diamonds',0,0; RETURN; END IF;

  INSERT INTO public.user_items (user_id, kind, code, rarity)
  VALUES (_uid, _it.kind, _it.code, _it.rarity)
  ON CONFLICT (user_id, kind, code) DO NOTHING;

  PERFORM public.grant_rewards(_uid, 'store', -_it.cost_gold, -_it.cost_diamonds, 0,
    jsonb_build_object('item', _it.code, 'kind', _it.kind, 'rarity', _it.rarity,
      'cost_gold', _it.cost_gold, 'cost_diamonds', _it.cost_diamonds));

  RETURN QUERY SELECT true,'ok',_it.cost_gold,_it.cost_diamonds;
END; $$;

REVOKE ALL ON FUNCTION public.purchase_store_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_store_item(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.equip_item(_kind text, _code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _kind NOT IN ('avatar','banner','frame') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_items u WHERE u.user_id=_uid AND u.kind=_kind AND u.code=_code) THEN
    RAISE EXCEPTION 'not owned';
  END IF;
  UPDATE public.profiles SET
    avatar = CASE WHEN _kind='avatar' THEN _code ELSE avatar END,
    banner = CASE WHEN _kind='banner' THEN _code ELSE banner END,
    frame  = CASE WHEN _kind='frame'  THEN _code ELSE frame  END,
    updated_at = now()
  WHERE id = _uid;
END; $$;

REVOKE ALL ON FUNCTION public.equip_item(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equip_item(text,text) TO authenticated;

INSERT INTO public.store_items (code,title,description,kind,value,rarity,cost_gold,cost_diamonds,sort,active) VALUES
 ('avatar-lion','أسد ذهبي','رمز القوة والهيبة','avatar','🦁','rare',1200,0,1,true),
 ('avatar-dragon','تنين','رمز نادر للأبطال','avatar','🐉','epic',2600,0,2,true),
 ('avatar-eagle','نسر','سرعة ودقة','avatar','🦅','rare',1500,0,3,true),
 ('avatar-star','نجمة','لمعان دائم','avatar','🌟','common',600,0,4,true),
 ('frame-gold-classic','إطار ذهبي','إطار كلاسيكي فاخر','frame','gold-classic','rare',0,6,10,true),
 ('frame-pink-neon','إطار نيون','توهج وردي','frame','pink-neon','epic',0,10,11,true),
 ('frame-diamond-elite','إطار ماسي','للنخبة فقط','frame','diamond-elite','legendary',0,20,12,true),
 ('banner-royal-purple','بنر ملكي','خلفية بنفسجية ملكية','banner','royal-purple','common',900,0,20,true),
 ('banner-desert-gold','بنر ذهبي','رمال ذهبية','banner','desert-gold','rare',1800,0,21,true),
 ('banner-emerald-night','بنر زمردي','ليل زمردي','banner','emerald-night','epic',0,8,22,true)
ON CONFLICT (code) DO NOTHING;