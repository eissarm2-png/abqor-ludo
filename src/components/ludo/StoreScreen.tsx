import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Coins, Gem, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { buyStoreItem, equipItem, listStore, type StoreItem } from "@/lib/store.functions";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  avatar: "الصور الرمزية",
  frame: "الإطارات",
  banner: "البنرات",
};

const REASONS: Record<string, string> = {
  not_enough_gold: "رصيد الذهب غير كافٍ",
  not_enough_diamonds: "رصيد الجواهر غير كافٍ",
  already_owned: "تملك هذا العنصر بالفعل",
  unknown_item: "العنصر غير متاح",
  banned: "الحساب محظور",
};

export function StoreScreen() {
  const { profile, refreshProfile } = useAuth();
  const load = useServerFn(listStore);
  const buy = useServerFn(buyStoreItem);
  const equip = useServerFn(equipItem);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    void load()
      .then((rows) => setItems(rows))
      .catch(() => toast.error("تعذّر تحميل المتجر"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(refresh, [refresh]);

  const onBuy = async (item: StoreItem) => {
    setBusy(item.code);
    try {
      const res = await buy({ data: { code: item.code } });
      if (res.ok) {
        toast.success(`تم شراء ${item.title}`);
        await refreshProfile();
        refresh();
      } else {
        toast.error(REASONS[res.reason] ?? "تعذّر إتمام الشراء");
      }
    } catch {
      toast.error("تعذّر إتمام الشراء");
    } finally {
      setBusy(null);
    }
  };

  const onEquip = async (item: StoreItem) => {
    setBusy(item.code);
    try {
      await equip({ data: { kind: item.kind, code: item.value } });
      toast.success(`تم تفعيل ${item.title}`);
      await refreshProfile();
    } catch {
      toast.error("تعذّر التفعيل");
    } finally {
      setBusy(null);
    }
  };

  const groups = ["avatar", "frame", "banner"] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 px-4 py-3">
        <h2 className="flex items-center gap-2 font-bold text-ludo-gold">
          <ShoppingBag className="size-5" /> المتجر
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-ludo-gold">
            <Coins className="size-4" /> {profile?.gold ?? 0}
          </span>
          <span className="flex items-center gap-1 text-ludo-soft">
            <Gem className="size-4" /> {profile?.diamonds ?? 0}
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-10 text-ludo-soft">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}

      {!loading &&
        groups.map((kind) => {
          const list = items.filter((i) => i.kind === kind);
          if (!list.length) return null;
          return (
            <section key={kind} className="space-y-2">
              <h3 className="text-sm font-bold text-ludo-gold">{KIND_LABEL[kind]}</h3>
              <div className="grid grid-cols-2 gap-2">
                {list.map((item) => (
                  <article
                    key={item.code}
                    className={cn(
                      "rounded-xl border border-ludo-gold/30 bg-ludo-panel/70 p-3",
                      item.owned && "border-ludo-gold/70",
                    )}
                  >
                    <div className="mb-2 grid h-14 place-items-center rounded-lg bg-ludo-deep/60 text-3xl">
                      {kind === "avatar" ? item.value : <span className="text-base">🎁</span>}
                    </div>
                    <p className="truncate text-sm font-bold text-ludo-soft">{item.title}</p>
                    <p className="mb-2 truncate text-[11px] text-ludo-soft/70">{item.description}</p>
                    {item.owned ? (
                      <Button
                        size="sm"
                        variant="royal"
                        className="w-full"
                        disabled={busy === item.code}
                        onClick={() => void onEquip(item)}
                      >
                        <Check className="size-4" /> تفعيل
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="neon"
                        className="w-full"
                        disabled={busy === item.code}
                        onClick={() => void onBuy(item)}
                      >
                        {item.cost_diamonds > 0 ? (
                          <>
                            <Gem className="size-4" /> {item.cost_diamonds}
                          </>
                        ) : (
                          <>
                            <Coins className="size-4" /> {item.cost_gold}
                          </>
                        )}
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
