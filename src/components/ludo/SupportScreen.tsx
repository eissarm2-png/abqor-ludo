import { useState } from "react";
import { ChevronLeft, HelpCircle, Mail, Shield, ScrollText, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    id: "faq",
    icon: HelpCircle,
    title: "الأسئلة الشائعة",
    body: "كيف أحصل على الذهب؟ من المهام اليومية والصناديق والفوز بالمباريات. كيف ألعب مع صديق؟ أنشئ غرفة خاصة وشارك الكود المكوّن من 6 أحرف.",
  },
  {
    id: "how",
    icon: Gamepad2,
    title: "كيفية اللعب",
    body: "ارمِ النرد، أخرج قطعة بالرقم 6، تنقّل حول اللوحة، واضرب قطع الخصوم لإعادتها إلى القاعدة. أول من يُدخل قطعه الأربع إلى البيت يفوز.",
  },
  {
    id: "privacy",
    icon: Shield,
    title: "سياسة الخصوصية",
    body: "نحفظ فقط البيانات اللازمة لتشغيل حسابك: الاسم الظاهر والبريد والإحصائيات. لا نبيع بياناتك لأي طرف ثالث.",
  },
  {
    id: "terms",
    icon: ScrollText,
    title: "الشروط والأحكام",
    body: "اللعب النظيف مطلوب. يُمنع الغش أو الإساءة أو استغلال الثغرات، وقد يؤدي ذلك إلى حظر الحساب دون تعويض.",
  },
] as const;

export function SupportScreen() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="rounded-xl border border-ludo-gold/25 bg-ludo-panel/60">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : s.id)}
              className="flex w-full items-center gap-3 p-3 text-right"
            >
              <Icon className="size-5 shrink-0 text-ludo-gold" />
              <span className="flex-1 text-sm font-bold text-ludo-soft">{s.title}</span>
              <ChevronLeft
                className={cn("size-4 text-ludo-soft/70 transition", isOpen && "-rotate-90")}
              />
            </button>
            {isOpen && (
              <p className="border-t border-ludo-gold/15 p-3 text-xs leading-6 text-ludo-soft/85">
                {s.body}
              </p>
            )}
          </div>
        );
      })}

      <a
        href="mailto:hzamm586@gmail.com?subject=%D8%AF%D8%B9%D9%85%20%D8%B9%D8%A8%D9%82%D9%88%D8%B1%20%D9%84%D9%88%D8%AF%D9%88"
        className="flex items-center gap-3 rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-3"
      >
        <Mail className="size-5 shrink-0 text-ludo-gold" />
        <span className="flex-1 text-sm font-bold text-ludo-soft">تواصل معنا</span>
        <ChevronLeft className="size-4 text-ludo-soft/70" />
      </a>
    </div>
  );
}
