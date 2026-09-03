import { useEffect, useState } from "react";
import { Loader2, Pencil, Save } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchChestOpenings, type OwnedItem } from "@/lib/economy.functions";
import { ITEM_KIND_LABEL, RarityChip, itemArt } from "./economy-visuals";
import { cn } from "@/lib/utils";

const AVATARS = ["🦁", "🐯", "🦅", "🐺", "🐲", "🦉", "🐧", "🐵"];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glossy-card grid place-items-center gap-0.5 p-2 text-center">
      <small className="relative text-[11px] text-ludo-soft">{label}</small>
      <b className="relative text-lg text-ludo-gold">{value}</b>
    </div>
  );
}

export function ProfileScreen({ onHistory }: { onHistory: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const loadItems = useServerFn(fetchChestOpenings);
  const [items, setItems] = useState<OwnedItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar ?? "🦁");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setAvatar(profile?.avatar || "🦁");
  }, [profile?.display_name, profile?.avatar]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let alive = true;
    void loadItems({})
      .then((res) => {
        if (alive) setItems(res.items ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loadItems, user]);

  if (!user || !profile) {
    return <p className="glossy-card text-center text-sm text-ludo-soft">سجّل الدخول لعرض ملفك الشخصي.</p>;
  }

  const winRate = profile.games ? Math.round((profile.wins / profile.games) * 100) : 0;
  const levelXp = profile.xp % 300;

  const save = async () => {
    const clean = name.trim().slice(0, 40);
    if (clean.length < 2) {
      toast.error("الاسم قصير جدًا");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: clean, avatar })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("تعذّر حفظ الملف");
      return;
    }
    toast.success("تم حفظ الملف الشخصي");
    setEditing(false);
    await refreshProfile();
  };

  return (
    <div className="space-y-3">
      <section className="glossy-card flex items-center gap-3 p-3">
        <span className="avatar-orb relative size-16 text-3xl">{profile.avatar || "🦁"}</span>
        <div className="relative min-w-0 flex-1">
          <b className="block truncate text-lg text-ludo-gold">{profile.display_name}</b>
          <small className="block text-ludo-soft">المستوى {profile.level}</small>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-ludo-deep/70">
            <span className="block h-full bg-ludo-gold" style={{ width: `${(levelXp / 300) * 100}%` }} />
          </div>
          <small className="text-[11px] text-ludo-soft">{levelXp} / 300 خبرة</small>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <div className="glossy-card flex items-center justify-center gap-2 p-2 font-bold text-ludo-gold">
          🪙 {profile.gold.toLocaleString("en-US")}
        </div>
        <div className="glossy-card flex items-center justify-center gap-2 p-2 font-bold text-ludo-lagoon">
          💎 {profile.diamonds.toLocaleString("en-US")}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="إجمالي الانتصارات" value={profile.wins} />
        <Stat label="إجمالي المباريات" value={profile.games} />
        <Stat label="نسبة الفوز" value={`${winRate}%`} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="النقاط" value={profile.points} />
        <Stat label="الخسائر" value={profile.losses} />
      </div>

      <section>
        <h4 className="mb-2 text-center text-sm font-bold text-ludo-gold">العناصر المملوكة</h4>
        {loading ? (
          <div className="grid place-items-center py-6 text-ludo-gold">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="glossy-card text-center text-xs text-ludo-soft">لا عناصر بعد — افتح صندوقًا أو اشترِ من المتجر.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {items.slice(0, 12).map((it) => (
              <article key={it.id} className="glossy-card grid place-items-center gap-1 p-2 text-center">
                <img src={itemArt(it.kind)} alt="" width={512} height={512} loading="lazy" className="relative size-10" />
                <small className="relative text-[9px] text-ludo-soft">{ITEM_KIND_LABEL[it.kind]}</small>
                <span className="relative"><RarityChip rarity={it.rarity} /></span>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing ? (
        <section className="glossy-card space-y-2 p-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم اللاعب" maxLength={40} />
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={cn(
                  "grid size-10 place-items-center rounded-xl border text-xl",
                  avatar === a ? "border-ludo-gold bg-ludo-gold/20" : "border-ludo-gold/30",
                )}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghostGold" onClick={() => setEditing(false)}>إلغاء</Button>
            <Button variant="play" disabled={saving} onClick={() => void save()}>
              <Save className="size-4" /> حفظ
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid gap-2">
          <Button variant="royal" className="w-full" onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> تعديل الملف
          </Button>
          <Button variant="ghostGold" className="w-full" onClick={onHistory}>
            السجل
          </Button>
        </div>
      )}
    </div>
  );
}
