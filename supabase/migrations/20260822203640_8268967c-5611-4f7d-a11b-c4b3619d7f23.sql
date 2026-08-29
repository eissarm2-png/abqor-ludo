-- 1) اقتصاد اللاعب على الملف الشخصي
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gold integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS diamonds integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS banner text NOT NULL DEFAULT 'royal-purple',
  ADD COLUMN IF NOT EXISTS frame text NOT NULL DEFAULT 'gold-classic';

-- 2) تعريفات المهام
CREATE TABLE IF NOT EXISTS public.mission_defs (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  period text NOT NULL CHECK (period IN ('daily','weekly')),
  metric text NOT NULL CHECK (metric IN ('games','wins','points','ludo_games','ludo_wins','domino_games','domino_wins')),
  goal integer NOT NULL CHECK (goal > 0),
  reward_gold integer NOT NULL DEFAULT 0,
  reward_diamonds integer NOT NULL DEFAULT 0,
  reward_xp integer NOT NULL DEFAULT 0,
  sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.mission_defs TO authenticated;
GRANT ALL ON public.mission_defs TO service_role;
ALTER TABLE public.mission_defs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Missions catalog readable by signed-in users" ON public.mission_defs;
CREATE POLICY "Missions catalog readable by signed-in users"
  ON public.mission_defs FOR SELECT TO authenticated USING (true);

-- 3) تقدّم المهام لكل لاعب لكل فترة
CREATE TABLE IF NOT EXISTS public.user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL REFERENCES public.mission_defs(code) ON DELETE CASCADE,
  period_start date NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code, period_start)
);
GRANT SELECT ON public.user_missions TO authenticated;
GRANT ALL ON public.user_missions TO service_role;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own mission progress" ON public.user_missions;
CREATE POLICY "Users can view their own mission progress"
  ON public.user_missions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4) سجل معاملات الاقتصاد
CREATE TABLE IF NOT EXISTS public.economy_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  gold_delta integer NOT NULL DEFAULT 0,
  diamonds_delta integer NOT NULL DEFAULT 0,
  xp_delta integer NOT NULL DEFAULT 0,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS economy_tx_user_created_idx
  ON public.economy_transactions (user_id, created_at DESC);
GRANT SELECT ON public.economy_transactions TO authenticated;
GRANT ALL ON public.economy_transactions TO service_role;
ALTER TABLE public.economy_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.economy_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.economy_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5) مقتنيات اللاعب (أفاتار/بانر/إطار)
CREATE TABLE IF NOT EXISTS public.user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('avatar','banner','frame')),
  code text NOT NULL,
  rarity text NOT NULL DEFAULT 'common',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, code)
);
GRANT SELECT ON public.user_items TO authenticated;
GRANT ALL ON public.user_items TO service_role;
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own items" ON public.user_items;
CREATE POLICY "Users can view their own items"
  ON public.user_items FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 6) تعريفات الصناديق
CREATE TABLE IF NOT EXISTS public.chest_defs (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  tier integer NOT NULL DEFAULT 1,
  cost_gold integer NOT NULL DEFAULT 0,
  cost_diamonds integer NOT NULL DEFAULT 0,
  cooldown_minutes integer NOT NULL DEFAULT 0,
  sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.chest_defs TO authenticated;
GRANT ALL ON public.chest_defs TO service_role;
ALTER TABLE public.chest_defs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chest catalog readable by signed-in users" ON public.chest_defs;
CREATE POLICY "Chest catalog readable by signed-in users"
  ON public.chest_defs FOR SELECT TO authenticated USING (true);

-- 7) بيانات المهام والصناديق
INSERT INTO public.mission_defs (code,title,description,period,metric,goal,reward_gold,reward_diamonds,reward_xp,sort) VALUES
  ('d_play3','ثلاث مباريات','أكمل 3 مباريات اليوم','daily','games',3,120,0,40,1),
  ('d_win1','فوز اليوم','اربح مباراة واحدة اليوم','daily','wins',1,150,1,50,2),
  ('d_domino2','جلسة دومينو','أكمل مباراتي دومينو اليوم','daily','domino_games',2,140,0,45,3),
  ('d_points100','جامع النقاط','اجمع 100 نقطة اليوم','daily','points',100,100,0,35,4),
  ('w_play15','مثابر الأسبوع','أكمل 15 مباراة هذا الأسبوع','weekly','games',15,600,2,180,5),
  ('w_win7','سبعة انتصارات','اربح 7 مباريات هذا الأسبوع','weekly','wins',7,800,3,240,6),
  ('w_dominowin4','ملك الدومينو','اربح 4 مباريات دومينو هذا الأسبوع','weekly','domino_wins',4,700,3,220,7),
  ('w_ludowin4','ملك اللودو','اربح 4 مباريات لودو هذا الأسبوع','weekly','ludo_wins',4,700,3,220,8)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, period = EXCLUDED.period,
  metric = EXCLUDED.metric, goal = EXCLUDED.goal, reward_gold = EXCLUDED.reward_gold,
  reward_diamonds = EXCLUDED.reward_diamonds, reward_xp = EXCLUDED.reward_xp,
  sort = EXCLUDED.sort, active = true;

INSERT INTO public.chest_defs (code,title,description,tier,cost_gold,cost_diamonds,cooldown_minutes,sort) VALUES
  ('daily','الصندوق اليومي','صندوق مجاني كل 24 ساعة',1,0,0,1440,1),
  ('royal','الصندوق الملكي','مكافآت ذهبية أعلى ومقتنيات نادرة',2,900,0,0,2),
  ('legend','صندوق الأسطورة','أفضل فرصة للجواهر والمقتنيات الأسطورية',3,0,6,0,3)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, tier = EXCLUDED.tier,
  cost_gold = EXCLUDED.cost_gold, cost_diamonds = EXCLUDED.cost_diamonds,
  cooldown_minutes = EXCLUDED.cooldown_minutes, sort = EXCLUDED.sort, active = true;