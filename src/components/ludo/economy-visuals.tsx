import coinStack from "@/assets/coin-stack.png";
import gemEmerald from "@/assets/gem-emerald.png";
import chestOpen from "@/assets/chest-open.png";
import chestClosed from "@/assets/chest-closed.png";
import giftBox from "@/assets/gift-box.png";
import diceRoyal from "@/assets/dice-royal.png";
import avatarTiger from "@/assets/avatar-tiger.png";
import itemBanner from "@/assets/item-banner.png";
import itemFrame from "@/assets/item-frame.png";
import modeMissions from "@/assets/mode-missions.png";
import brandMark from "@/assets/brand-mark.png";
import { cn } from "@/lib/utils";

export const ART = {
  gold: coinStack,
  diamonds: gemEmerald,
  xp: brandMark,
  chestOpen,
  chestClosed,
  gift: giftBox,
  dice: diceRoyal,
  avatar: avatarTiger,
  banner: itemBanner,
  frame: itemFrame,
  mission: modeMissions,
};

export const KIND_ART: Record<string, string> = {
  chest: chestOpen,
  chest_open: chestOpen,
  chest_free: chestClosed,
  mission: modeMissions,
  mission_claim: modeMissions,
  match: diceRoyal,
  game: diceRoyal,
  daily: giftBox,
};

export const KIND_LABEL: Record<string, string> = {
  chest: "فتح صندوق",
  chest_open: "فتح صندوق",
  chest_free: "صندوق مجاني",
  mission: "مكافأة مهمة",
  mission_claim: "مكافأة مهمة",
  match: "نتيجة مباراة",
  game: "نتيجة مباراة",
  daily: "هدية يومية",
};

export const RARITY_LABEL: Record<string, string> = {
  common: "عادي",
  rare: "نادر",
  epic: "ملحمي",
  legendary: "أسطوري",
};

export const ITEM_KIND_LABEL: Record<string, string> = {
  avatar: "أفاتار",
  banner: "بانر",
  frame: "إطار",
};

export function kindArt(kind: string) {
  return KIND_ART[kind] ?? KIND_ART[kind.split("_")[0] ?? ""] ?? diceRoyal;
}

export function kindLabel(kind: string) {
  return KIND_LABEL[kind] ?? KIND_LABEL[kind.split("_")[0] ?? ""] ?? kind;
}

export function itemArt(kind: string) {
  if (kind === "avatar") return ART.avatar;
  if (kind === "banner") return ART.banner;
  return ART.frame;
}

export function arabicTime(iso: string) {
  return new Date(iso).toLocaleString("ar", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RarityChip({ rarity }: { rarity: string }) {
  return (
    <span className={cn("rarity-chip", `rarity-${rarity}`)}>{RARITY_LABEL[rarity] ?? rarity}</span>
  );
}

export function Amount({ art, value, tone }: { art: string; value: number; tone: string }) {
  return (
    <span className="ledger-amount" style={{ color: tone }}>
      <img src={art} alt="" width={512} height={512} loading="lazy" className="size-4" />
      {value > 0 ? `+${value}` : value}
    </span>
  );
}
