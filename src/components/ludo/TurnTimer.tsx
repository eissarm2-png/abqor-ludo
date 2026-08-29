import { cn } from "@/lib/utils";

type Props = {
  /** الثواني المتبقية */
  remaining: number;
  limit: number;
  /** اسم اللاعب الحالي */
  name: string;
  /** تم ضبط المهلة على ساعة السيرفر */
  serverSynced: boolean;
};

export function TurnTimer({ remaining, limit, name, serverSynced }: Props) {
  const pct = Math.max(0, Math.min(1, remaining / limit));
  const danger = remaining <= 5;
  return (
    <div className={cn("turn-timer", danger && "turn-timer-danger")}>
      <span className="turn-timer-dial">
        <span
          className="turn-timer-ring"
          style={{ ["--pct" as string]: `${pct * 100}%` }}
          aria-hidden="true"
        />
        <b className="turn-timer-num">{Math.ceil(remaining)}</b>
      </span>
      <span className="turn-timer-meta">
        <small>دور {name}</small>
        <small className="text-[9px] opacity-80">{serverSynced ? "مؤقّت السيرفر" : "مؤقّت محلي"}</small>
      </span>
    </div>

  );
}
