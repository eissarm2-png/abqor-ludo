import { createFileRoute } from "@tanstack/react-router";
import { LudoApp } from "@/components/ludo/LudoApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "عبقور لودو | ABQOR LUDO" },
      { name: "description", content: "العب لودو محليًا مع أصدقائك أو ضد الروبوت في عالم عبقور لودو الملكي." },
      { property: "og:title", content: "عبقور لودو | ABQOR LUDO" },
      { property: "og:description", content: "لعبة لودو عربية محلية بتجربة ملكية ممتعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LudoApp,
});
