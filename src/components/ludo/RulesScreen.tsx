import { Crown, Dices, Flag, Home, Swords, Timer } from "lucide-react";

const STEPS: [string, string, React.ReactNode][] = [
  ["ارمِ النرد", "اضغط على النرد المتوهج في أسفل الشاشة لتبدأ دورك.", <Dices key="1" />],
  ["اخرج بالرقم 6", "لا تخرج القطعة من حوشها إلا عند ظهور الرقم 6، ثم تحصل على رمية إضافية.", <Flag key="2" />],
  ["تحرّك في المسار", "تسير القطعة بعدد نقاط النرد على المسار الدائري باتجاه ممرها المنزلي.", <Timer key="3" />],
  ["أطح بالخصوم", "إذا حللت في خانة خصم غير آمنة، تعود قطعته إلى الحوش وتحصل على رمية إضافية.", <Swords key="4" />],
  ["الخانات الآمنة", "الخانات المميزة بنجمة آمنة، لا يمكن الإطاحة بأي قطعة تقف عليها.", <Home key="5" />],
  ["الوصول للمنزل", "أوصل قطعتك بعدد دقيق إلى قلب اللوحة. أول من يُدخل قطعه الأربع يفوز.", <Crown key="6" />],
];

export function RulesContent() {
  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-ludo-soft">ست خطوات سريعة لتصبح ملك الطاولة</p>

      <div className="grid grid-cols-4 gap-2 rounded-xl border border-ludo-gold/40 bg-ludo-panel/70 p-3">
        {(["ruby", "palm", "amber", "lagoon"] as const).map((c) => (
          <div key={c} className="grid place-items-center gap-1">
            <span className="coin-token" style={{ ["--seat" as string]: `var(--ludo-${c})` }}>
              <Crown className="size-1/2" fill="currentColor" />
            </span>
            <small className="text-[10px] text-ludo-soft">قطعة</small>
          </div>
        ))}
      </div>

      <ol className="space-y-2">
        {STEPS.map(([title, body, icon], i) => (
          <li key={title} className="list-card items-start">
            <span className="rank-badge rank-gold">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <b className="flex items-center gap-2 text-ludo-gold">{icon}{title}</b>
              <small className="mt-1 block leading-relaxed text-ludo-soft">{body}</small>
            </span>
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-ludo-pink/50 bg-ludo-purple/50 p-3 text-sm leading-relaxed">
        <b className="block text-ludo-gold">قواعد إضافية</b>
        ثلاث ستات متتالية تُلغي الدور. الوصول بقطعة إلى المنزل أو الإطاحة بخصم يمنحك رمية إضافية.
        إذا لم توجد حركة ممكنة ينتقل الدور تلقائيًا للاعب التالي.
      </div>
    </div>
  );
}
