import { useCallback, useEffect, useState } from "react";
import { Coins, Gem, Loader2, Lock, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { fetchChests, openChest, type Chest, type ChestReward } from "@/lib/economy.functions";
import { sfx } from "@/lib/audio";
import { cn } from "@/lib/utils";
import chestClosed from "@/assets/chest-closed.png";
import chestOpen from "@/assets/chest-open.png";
import coinStack from "@/assets/coin-stack.png";
import gemEmerald from "@/assets/gem-emerald.png";

const REASONS: Record<string, string> = {
  cooldown: "هذا الصندوق لم يجهز بعد",
  not_enough_gold: "الذهب غير كافٍ",
  not_enough_diamonds: "الجواهر غير كافية",
  unknown_chest: "الصندوق غير متاح",
  no_profile: "أكمل ملفك الشخصي أولًا",
};

const ITEM_KIND: Record<string, string> = {
  avatar: "أفاتار",
  banner: "بانر",
  frame: "إطار",
};

const RARITY: Record<string, string> = {
  common: "عادي",
  rare: "نادر",
  epic: "ملحمي",
  legendary: "أسطوري",
};

const BANNER_LABEL: Record<string, string> = {
  "royal-purple": "بنفسج ملكي",
  "desert-gold": "ذهب الصحراء",
  "neon-pink": "وردي نيون",
  "emerald-night": "ليل زمردي",
  "sapphire-dawn": "فجر ياقوتي",
};

const FRAME_LABEL: Record<string, string> = {
  "gold-classic": "ذهبي كلاسيكي",
  "pink-neon": "نيون وردي",
  "emerald-royal": "زمرد ملكي",
  "diamond-elite": "ألماس النخبة",
};

function itemLabel(kind: string | null, code: string | null) {
  if (!kind || !code) return "";
  if (kind === "avatar") return code;
  if (kind === "banner") return BANNER_LABEL[code] ?? code;
  return FRAME_LABEL[code] ?? code;
}

function readyLabel(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `بعد ${hours} ساعة`;
  return `بعد ${Math.max(1, Math.round(ms / 60_000))} دقيقة`;
}

export function ChestsPanel({
  signedIn,
  animations,
  onWalletChange,
}: {
  signedIn: boolean;
  animations: boolean;
  onWalletChange: () => void;
}) {
  const load = useServerFn(fetchChests);
  const open = useServerFn(openChest);
  const [chests, setChests] = useState<Chest[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setChests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await load({});
      setChests(res.chests ?? []);
    } finally {
      setLoading(false);
    }
  }, [load, signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onOpen = async (code: string) => {
    setOpening(code);
    setNote(null);
    setReward(null);
    sfx.diceRoll();
    const res = await open({ data: { code } });
    // مهلة قصيرة لإتمام حركة اهتزاز الصندوق قبل ظهور المكافأة
    window.setTimeout(
      () => {
        setOpening(null);
        if (!res.ok) {
          setNote(REASONS[res.reason] ?? "تعذّر فتح الصندوق");
          return;
        }
        setReward(res);
        sfx.win();
        onWalletChange();
        void refresh();
      },
      animations ? 900 : 120,
    );
  };

  if (!signedIn) {
    return (
      <p className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-5 text-center text-sm text-ludo-soft">
        سجّل الدخول لفتح الصناديق الملكية وجمع الذهب والجواهر والمقتنيات.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-10 text-ludo-gold">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {note && (
        <p className="rounded-lg border border-ludo-pink/60 bg-ludo-purple/50 p-2 text-center text-xs text-ludo-pink">
          {note}
        </p>
      )}

      {chests.map((chest) => {
        const ready = readyLabel(chest.next_free_at);
        const isOpening = opening === chest.code;
        const free = chest.cost_gold === 0 && chest.cost_diamonds === 0;
        return (
          <article key={chest.code} className="glossy-card">
            <div className="relative flex items-center gap-4">
              <img
                src={isOpening ? chestOpen : chestClosed}
                alt=""
                width={512}
                height={512}
                loading="lazy"
                className={cn("asset-shine size-20 shrink-0", isOpening && "chest-shaking")}
              />
              <div className="min-w-0 flex-1">
                <b className="block text-ludo-gold">{chest.title}</b>
                <small className="block text-ludo-soft">{chest.description}</small>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  {free ? (
                    <span className="text-ludo-palm">مجاني</span>
                  ) : chest.cost_gold > 0 ? (
                    <span className="flex items-center gap-1 text-ludo-gold">
                      <img src={coinStack} alt="" width={512} height={512} loading="lazy" className="size-5" /> {chest.cost_gold}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-ludo-lagoon">
                      <img src={gemEmerald} alt="" width={512} height={512} loading="lazy" className="size-5" /> {chest.cost_diamonds}
                    </span>
                  )}
                  {ready && (
                    <span className="flex items-center gap-1 text-ludo-soft">
                      <Lock className="size-3.5" /> {ready}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant={ready ? "neon" : "play"}
                size="sm"
                disabled={Boolean(ready) || isOpening}
                onClick={() => void onOpen(chest.code)}
              >
                {isOpening ? <Loader2 className="size-4 animate-spin" /> : "افتح"}
              </Button>
            </div>
          </article>
        );
      })}

      {reward && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ludo-deep/85 p-5 backdrop-blur-sm">
          <div className="royal-panel celebrate-pop w-full max-w-sm p-6 text-center">
            <img src={chestOpen} alt="" width={512} height={512} loading="lazy" className="celebrate-pop mx-auto size-28" />
            <h3 className="ribbon-title mt-3">مكافآت الصندوق</h3>
            <div className="mt-4 grid gap-2 text-lg">
              <p className="flex items-center justify-center gap-2 text-ludo-gold">
                <Coins /> {reward.gold} ذهب
              </p>
              {reward.diamonds > 0 && (
                <p className="flex items-center justify-center gap-2 text-ludo-lagoon">
                  <Gem /> {reward.diamonds} جوهرة
                </p>
              )}
              <p className="text-sm text-ludo-pink">+{reward.xp} نقطة خبرة</p>
              {reward.item_kind && (
                <p className="rounded-lg border border-ludo-gold/50 bg-ludo-purple/50 p-2 text-sm">
                  {ITEM_KIND[reward.item_kind]} {RARITY[reward.rarity ?? "common"]}:{" "}
                  <b className="text-ludo-gold">{itemLabel(reward.item_kind, reward.item_code)}</b>
                  {!reward.is_new && <small className="block text-ludo-soft">مكرر — تم تعويضه بذهب إضافي</small>}
                </p>
              )}
            </div>
            <Button variant="play" className="mt-5 w-full" onClick={() => setReward(null)}>
              رائع!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
