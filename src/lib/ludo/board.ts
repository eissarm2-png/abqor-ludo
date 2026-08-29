export type Cell = { x: number; y: number };

/** المسار الدائري الرئيسي (52 خانة) بإحداثيات شبكة 15×15 */
export const RING: Cell[] = [
  { x: 6, y: 13 },
  { x: 6, y: 12 },
  { x: 6, y: 11 },
  { x: 6, y: 10 },
  { x: 6, y: 9 },
  { x: 5, y: 8 },
  { x: 4, y: 8 },
  { x: 3, y: 8 },
  { x: 2, y: 8 },
  { x: 1, y: 8 },
  { x: 0, y: 8 },
  { x: 0, y: 7 },
  { x: 0, y: 6 },
  { x: 1, y: 6 },
  { x: 2, y: 6 },
  { x: 3, y: 6 },
  { x: 4, y: 6 },
  { x: 5, y: 6 },
  { x: 6, y: 5 },
  { x: 6, y: 4 },
  { x: 6, y: 3 },
  { x: 6, y: 2 },
  { x: 6, y: 1 },
  { x: 6, y: 0 },
  { x: 7, y: 0 },
  { x: 8, y: 0 },
  { x: 8, y: 1 },
  { x: 8, y: 2 },
  { x: 8, y: 3 },
  { x: 8, y: 4 },
  { x: 8, y: 5 },
  { x: 9, y: 6 },
  { x: 10, y: 6 },
  { x: 11, y: 6 },
  { x: 12, y: 6 },
  { x: 13, y: 6 },
  { x: 14, y: 6 },
  { x: 14, y: 7 },
  { x: 14, y: 8 },
  { x: 13, y: 8 },
  { x: 12, y: 8 },
  { x: 11, y: 8 },
  { x: 10, y: 8 },
  { x: 9, y: 8 },
  { x: 8, y: 9 },
  { x: 8, y: 10 },
  { x: 8, y: 11 },
  { x: 8, y: 12 },
  { x: 8, y: 13 },
  { x: 8, y: 14 },
  { x: 7, y: 14 },
  { x: 6, y: 14 },
];

export const CENTER: Cell = { x: 7, y: 7 };

export type SeatId = 0 | 1 | 2 | 3;

export type Seat = {
  id: SeatId;
  /** اسم اللون بالعربية */
  label: string;
  /** رمز التوكن اللوني في CSS */
  token: "ruby" | "palm" | "amber" | "lagoon";
  /** فهرس بداية اللاعب على المسار */
  start: number;
  /** خانات الممر المنزلي (5) + المركز */
  home: Cell[];
  /** مراكز مربعات الانتظار (الحوش) بإحداثيات الشبكة */
  yard: Cell[];
  /** ركن الحوش على الشبكة */
  yardBox: Cell;
};

/** مراكز الأحجار داخل الحوش مطابقة لصورة التصميم */
const NEAR = 2.24;
const FAR = 3.82;
const yardSlots = (bx: number, by: number): Cell[] => {
  const xs = bx === 0 ? [NEAR, FAR] : [15 - FAR, 15 - NEAR];
  const ys = by === 0 ? [NEAR, FAR] : [15 - FAR, 15 - NEAR];
  return [
    { x: xs[0]!, y: ys[0]! },
    { x: xs[1]!, y: ys[0]! },
    { x: xs[0]!, y: ys[1]! },
    { x: xs[1]!, y: ys[1]! },
  ];
};

export const SEATS: Record<SeatId, Seat> = {
  0: {
    id: 0,
    label: "الياقوت",
    token: "ruby",
    start: 0,
    home: [
      { x: 7, y: 13 },
      { x: 7, y: 12 },
      { x: 7, y: 11 },
      { x: 7, y: 10 },
      { x: 7, y: 9 },
      CENTER,
    ],
    yard: yardSlots(0, 9),
    yardBox: { x: 0, y: 9 },
  },
  1: {
    id: 1,
    label: "النخيل",
    token: "palm",
    start: 13,
    home: [
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 5, y: 7 },
      CENTER,
    ],
    yard: yardSlots(0, 0),
    yardBox: { x: 0, y: 0 },
  },
  2: {
    id: 2,
    label: "الكهرمان",
    token: "amber",
    start: 26,
    home: [
      { x: 7, y: 1 },
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 7, y: 4 },
      { x: 7, y: 5 },
      CENTER,
    ],
    yard: yardSlots(9, 0),
    yardBox: { x: 9, y: 0 },
  },
  3: {
    id: 3,
    label: "الفيروز",
    token: "lagoon",
    start: 39,
    home: [
      { x: 13, y: 7 },
      { x: 12, y: 7 },
      { x: 11, y: 7 },
      { x: 10, y: 7 },
      { x: 9, y: 7 },
      CENTER,
    ],
    yard: yardSlots(9, 9),
    yardBox: { x: 9, y: 9 },
  },
};

export const SEAT_ORDER: SeatId[] = [0, 1, 2, 3];

/** الخانات الآمنة: خانات البداية + الخانة الثامنة بعدها */
export const SAFE_INDICES = new Set<number>(
  SEAT_ORDER.flatMap((id) => [SEATS[id].start, (SEATS[id].start + 8) % 52]),
);

export const LAST_RING_OFFSET = 50;
export const FINISH_OFFSET = 56;

/** يحوّل موقع القطعة (offset) إلى خانة على الشبكة */
export function cellForOffset(seat: SeatId, offset: number): Cell {
  const s = SEATS[seat];
  if (offset <= LAST_RING_OFFSET) return RING[(s.start + offset) % 52] ?? CENTER;
  return s.home[offset - LAST_RING_OFFSET - 1] ?? CENTER;
}

/** فهرس المسار الدائري لموقع القطعة، أو null إن كانت في الممر المنزلي */
export function ringIndexForOffset(seat: SeatId, offset: number): number | null {
  if (offset < 0 || offset > LAST_RING_OFFSET) return null;
  return (SEATS[seat].start + offset) % 52;
}
