import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { fetchChestOpenings, type LedgerEntry, type OwnedItem } from "@/lib/economy.functions";
import {
  ART,
  Amount,
  ITEM_KIND_LABEL,
  RarityChip,
  arabicTime,
  itemArt,
  kindLabel,
} from "./economy-visuals";

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

function itemLabel(kind: string, code: string) {
  if (kind === "avatar") return code;
  if (kind === "banner") return BANNER_LABEL[code] ?? code;
  return FRAME_LABEL[code] ?? code;
}

export function OpenedChestsPanel({ signedIn }: { signedIn: boolean }) {
  const load = useServerFn(fetchChestOpenings);
  const [openings, setOpenings] = useState<LedgerEntry[]>([]);
  const [items, setItems] = useState<OwnedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setOpenings([]);
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await load({});
      setOpenings(res.openings ?? []);
      setItems(res.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [load, signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!signedIn) {
    return (
      <p className="glossy-card text-center text-sm text-ludo-soft">
        سجّل الدخول لعرض الصناديق التي فتحتها ومكافآتها.
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
    <div className="space-y-4">

      {!openings.length ? (
        <div className="glossy-card text-center">
          <img
            src={ART.chestClosed}
            alt=""
            width={512}
            height={512}
            loading="lazy"
            className="asset-shine relative mx-auto size-24"
          />
          <p className="relative mt-2 text-sm text-ludo-soft">لم تفتح أي صندوق بعد.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {openings.map((o) => (
            <article key={o.id} className="ledger-row">
              <img src={ART.chestOpen} alt="" width={512} height={512} loading="lazy" className="size-12" />
              <div className="min-w-0 flex-1">
                <b className="block text-sm text-ludo-gold">{kindLabel(o.kind)}</b>
                <small className="block text-[11px] text-ludo-soft">{arabicTime(o.created_at)}</small>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                {o.gold_delta !== 0 && <Amount art={ART.gold} value={o.gold_delta} tone="var(--ludo-gold)" />}
                {o.diamonds_delta !== 0 && (
                  <Amount art={ART.diamonds} value={o.diamonds_delta} tone="var(--ludo-lagoon)" />
                )}
                {o.xp_delta !== 0 && <Amount art={ART.xp} value={o.xp_delta} tone="var(--ludo-pink)" />}
              </div>
            </article>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <section>
          <h4 className="mb-2 text-center text-sm font-bold text-ludo-gold">مقتنياتك من الصناديق</h4>
          <div className="grid grid-cols-3 gap-2">
            {items.map((it) => (
              <article key={it.id} className="glossy-card grid place-items-center gap-1 p-2 text-center">
                <img
                  src={itemArt(it.kind)}
                  alt=""
                  width={512}
                  height={512}
                  loading="lazy"
                  className="asset-shine relative size-14"
                />
                <b className="relative truncate text-[11px] text-ludo-gold">
                  {itemLabel(it.kind, it.code)}
                </b>
                <small className="relative text-[10px] text-ludo-soft">{ITEM_KIND_LABEL[it.kind]}</small>
                <span className="relative"><RarityChip rarity={it.rarity} /></span>
                <small className="relative text-[9px] text-ludo-soft/70">{arabicTime(it.created_at)}</small>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
