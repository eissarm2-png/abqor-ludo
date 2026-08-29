/**
 * تشكيل سلسلة الدومينو عموديًا مطابقًا لتصميم المستخدم المرجعي:
 * - السلسلة تنمو عموديًا في وسط الساحة
 * - الحجر العادي عمودي (طوله رأسي)، والحجر المزدوج أفقي (يُدوَّر ٩٠°)
 * - أبعاد وفواصل ثابتة لكل حجر
 * - أول حجر يبقى في مركز الساحة (الإحداثيات نسبية للمركز 0,0)
 * - عند زيادة الحجارة تُطوى السلسلة في أعمدة متبادلة الاتجاه وتتوسع الساحة
 */

/** الطول الثابت للحجر (المحور الطويل) بالبكسل */
export const TILE_LONG = 58;
/** العرض الثابت للحجر (المحور القصير) بالبكسل */
export const TILE_SHORT = 30;
/** الفاصل الثابت بين الحجارة على امتداد السلسلة */
export const TILE_GAP = 3;
/** الفاصل الأفقي بين أعمدة السلسلة */
export const COL_GAP = 12;
/** عرض العمود = أعرض حجر ممكن (مزدوج أفقي) */
export const COL_WIDTH = TILE_LONG + COL_GAP;

export type ChainTile = { id: string; left: number; right: number };

export type LayoutItem = {
  id: string;
  left: number;
  right: number;
  /** مزدوج ⇒ أفقي (مدوَّر ٩٠°) */
  double: boolean;
  /** إحداثي مركز الحجر بالنسبة لمركز الحجر الأول */
  x: number;
  y: number;
  /** درجة الدوران الثابتة (0 عمودي، 90 أفقي) */
  rotation: 0 | 90;
  column: number;
};

export type ChainLayout = {
  items: LayoutItem[];
  /** أبعاد صندوق السلسلة الكلي (تُستخدم لتوسيع الساحة) */
  width: number;
  height: number;
  columns: number;
};

function tileHeight(double: boolean): number {
  return double ? TILE_SHORT : TILE_LONG;
}
function tileW(double: boolean): number {
  return double ? TILE_LONG : TILE_SHORT;
}

/**
 * @param tiles سلسلة الحجارة بترتيب اللوحة
 * @param maxHeight أقصى ارتفاع متاح للساحة بالبكسل
 */
export function layoutChain(tiles: ChainTile[], maxHeight: number): ChainLayout {
  const usable = Math.max(TILE_LONG + TILE_GAP * 2, maxHeight);
  const items: LayoutItem[] = [];
  let column = 0;
  let cursor = 0;

  for (const tile of tiles) {
    const double = tile.left === tile.right;
    const h = tileHeight(double);
    if (cursor > 0 && cursor + h > usable) {
      column += 1;
      cursor = 0;
    }
    items.push({
      id: tile.id,
      left: tile.left,
      right: tile.right,
      double,
      rotation: double ? 90 : 0,
      x: column * COL_WIDTH,
      y: cursor + h / 2,
      column,
    });
    cursor += h + TILE_GAP;
  }

  const columns = column + 1;

  // أعمدة متبادلة الاتجاه (ثعبان رأسي)
  for (let c = 0; c < columns; c += 1) {
    const inCol = items.filter((it) => it.column === c);
    if (!inCol.length) continue;
    if (c % 2 === 1) {
      const colMax = Math.max(...inCol.map((it) => it.y + tileHeight(it.double) / 2));
      for (const it of inCol) it.y = colMax - it.y;
    }
    // مركزة كل عمود رأسيًا حول محور الساحة
    const min = Math.min(...inCol.map((it) => it.y - tileHeight(it.double) / 2));
    const max = Math.max(...inCol.map((it) => it.y + tileHeight(it.double) / 2));
    const center = (min + max) / 2;
    for (const it of inCol) it.y -= center;
  }

  const first = items[0];
  if (first) {
    const dx = first.x;
    const dy = first.y;
    for (const it of items) {
      it.x -= dx;
      it.y -= dy;
    }
  }

  const width = items.length
    ? Math.max(...items.map((it) => Math.abs(it.x) + tileW(it.double) / 2)) * 2
    : 0;
  const height = items.length
    ? Math.max(...items.map((it) => Math.abs(it.y) + tileHeight(it.double) / 2)) * 2
    : 0;

  return { items, width, height, columns };
}

/** معامل التصغير المطلوب كي تبقى السلسلة كاملة داخل الساحة */
export function chainScale(layout: ChainLayout, viewWidth: number, viewHeight: number): number {
  if (!layout.items.length) return 1;
  const sx = viewWidth / Math.max(1, layout.width);
  const sy = viewHeight / Math.max(1, layout.height);
  return Math.max(0.45, Math.min(1, sx, sy));
}

/**
 * تحقّق من صحة التشكيل: تطابق أطراف الحجارة المتجاورة وعدم تداخل أي حجرين.
 * تُستخدم لتشغيل المؤثرات الصوتية فقط عندما يكون الترتيب صحيحًا بصريًا ومنطقيًا.
 */
export function isChainLayoutValid(layout: ChainLayout): boolean {
  const { items } = layout;
  for (let i = 1; i < items.length; i += 1) {
    const prev = items[i - 1]!;
    const cur = items[i]!;
    if (prev.right !== cur.left) return false;
  }
  for (let i = 0; i < items.length; i += 1) {
    const a = items[i]!;
    for (let j = i + 1; j < items.length; j += 1) {
      const b = items[j]!;
      const overlapX =
        Math.abs(a.x - b.x) < (tileW(a.double) + tileW(b.double)) / 2 - 0.5;
      const overlapY =
        Math.abs(a.y - b.y) < (tileHeight(a.double) + tileHeight(b.double)) / 2 - 0.5;
      if (overlapX && overlapY) return false;
    }
  }
  return true;
}
