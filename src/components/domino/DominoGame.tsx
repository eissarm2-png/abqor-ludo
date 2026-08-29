import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Crown,
  Home,
  Layers,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import {
  createDomino,
  currentDominoPlayer,
  drawTile,
  legalPlays,
  passTurn,
  pickDominoMove,
  playTile,
  tilesLeft,
  type DominoMove,
  type DominoState,
  type PlacedTile,
  type Tile,
} from "@/lib/domino/engine";
import { chainScale, isChainLayoutValid, layoutChain } from "@/lib/domino/layout";
import { cn } from "@/lib/utils";
import modeDomino from "@/assets/mode-domino.png";
import avatarTiger from "@/assets/avatar-tiger.png";

const PIP_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [26, 26],
    [50, 50],
    [74, 74],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

function Half({ value }: { value: number }) {
  return (
    <span className="domino-half">
      {(PIP_POSITIONS[value] ?? []).map(([x, y], i) => (
        <i key={i} style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
    </span>
  );
}

const Half2 = memo(Half);

const DominoTile = memo(function DominoTile({
  a,
  b,
  horizontal,
  selectable,
  selected,
  onClick,
}: {
  a: number;
  b: number;
  horizontal?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Half2 value={a} />
      <span className="domino-divider" />
      <Half2 value={b} />
    </>
  );
  if (!onClick) {
    return (
      <span className={cn("domino-tile", horizontal && "domino-horizontal")} aria-hidden="true">
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "domino-tile",
        horizontal && "domino-horizontal",
        selectable && "domino-playable",
        selected && "domino-selected",
      )}
      aria-label={`حجرة ${a} و ${b}`}
    >
      {content}
    </button>
  );
});

export function DominoGame({
  playerCount,
  humanCount,
  muted,
  onMute,
  onHome,
  onFinish,
}: {
  playerCount: 2 | 3 | 4;
  humanCount: number;
  muted: boolean;
  onMute: () => void;
  onHome: () => void;
  onFinish: (payload: {
    winnerSeat: number;
    mySeat: number;
    players: number;
    moves: number;
  }) => void;
}) {
  const [state, setState] = useState<DominoState>(() => createDomino(playerCount, humanCount));
  const [selected, setSelected] = useState<string | null>(null);
  const moveCount = useRef(0);
  const reported = useRef(false);
  const railRef = useRef<HTMLElement>(null);
  /** طبقة التكبير/التمرير باللمس (لا تؤثر على المحاذاة لأنها transform فقط) */
  const zoom = usePinchZoom<HTMLDivElement>();

  const player = currentDominoPlayer(state);
  const myMoves = useMemo(() => (player.isBot ? [] : legalPlays(state)), [state, player.isBot]);
  const playableIds = useMemo(() => new Set(myMoves.map((m) => m.tileId)), [myMoves]);
  const mySeat = state.players.find((p) => !p.isBot)?.seat ?? 0;
  const me = state.players.find((p) => p.seat === mySeat);

  /** قفل الحركة أثناء المعاينة وأنيميشن تأكيد التشكيل */
  const [preview, setPreview] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const locked = preview || confirming;

  const commit = (move: DominoMove) => {
    if (locked) return;
    moveCount.current += 1;
    sfx.move();
    setSelected(null);
    setState((s) => playTile(s, move));
  };

  const handleTileClick = (tile: Tile) => {
    if (locked) return;
    const options = myMoves.filter((m) => m.tileId === tile.id);
    if (!options.length) return;
    if (options.length === 1) {
      commit(options[0]!);
      return;
    }
    setSelected((prev) => (prev === tile.id ? null : tile.id));
  };

  const playSide = (side: "left" | "right") => {
    if (!selected) return;
    const move = myMoves.find((m) => m.tileId === selected && m.side === side);
    if (move) commit(move);
  };

  // دور الروبوت
  useEffect(() => {
    if (state.phase === "over" || !player.isBot) return;
    const timer = window.setTimeout(() => {
      const options = legalPlays(state);
      if (options.length) {
        moveCount.current += 1;
        sfx.move();
        setState((s) => playTile(s, pickDominoMove(options, s)));
      } else if (state.stock.length) {
        moveCount.current += 1;
        sfx.tap();
        setState((s) => drawTile(s));
      } else {
        setState((s) => passTurn(s));
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [state, player.isBot]);

  // نهاية المباراة
  useEffect(() => {
    if (state.phase !== "over" || state.winner === null || reported.current) return;
    reported.current = true;
    sfx.win();
    onFinish({
      winnerSeat: state.winner,
      mySeat,
      players: state.players.length,
      moves: moveCount.current,
    });
  }, [state.phase, state.winner, state.players.length, mySeat, onFinish]);

  /** قياس الساحة لتشكيل ثابت الأبعاد والاتجاهات مثل التصميم المرجعي */
  const [arena, setArena] = useState({ w: 320, h: 260 });
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const measure = () => setArena({ w: el.clientWidth - 24, h: el.clientHeight - 20 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () =>
      layoutChain(
        state.board.map((p) => ({ id: p.tile.id, left: p.left, right: p.right })),
        arena.h,
      ),
    [state.board, arena.h],
  );
  const boardScale = useMemo(() => chainScale(layout, arena.w, arena.h), [layout, arena]);
  const layoutValid = useMemo(() => isChainLayoutValid(layout), [layout]);

  /** طقطقة/تجاوب عند وضع كل حجرة — تعمل فقط عندما يكون التشكيل صحيحًا */
  const lastCount = useRef(state.board.length);
  const [landedId, setLandedId] = useState<string | null>(null);
  useEffect(() => {
    const count = state.board.length;
    if (count > lastCount.current) {
      const placed = state.board[state.board.length - 1];
      if (layoutValid) {
        sfx.dominoPlace(count);
        window.setTimeout(() => sfx.dominoSnap(), 90);
        haptics.tap();
      }
      setLandedId(placed?.tile.id ?? null);
      window.setTimeout(() => setLandedId(null), 460);
    }
    lastCount.current = count;
  }, [state.board, layoutValid]);

  /** معاينة/تحميل سريع لترتيب الحجارة عند بداية كل جولة */
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!preview) return;
    setProgress(0);
    const started = Date.now();
    const id = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / 900) * 100);
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(id);
        setPreview(false);
        // أنيميشن فخم لتأكيد التشكيل قبل السماح بالحركة
        setConfirming(true);
        if (layoutValid) {
          sfx.dominoConfirm();
          haptics.tap();
        }
        window.setTimeout(() => setConfirming(false), 750);
      }
    }, 60);
    return () => window.clearInterval(id);
  }, [preview, layoutValid]);

  const restart = () => {
    moveCount.current = 0;
    reported.current = false;
    setSelected(null);
    sfx.start();
    zoom.reset();
    setState(createDomino(playerCount, humanCount));
    setPreview(true);
  };

  const noMove = !player.isBot && myMoves.length === 0 && state.phase === "play";

  return (
    <div className="ludo-shell min-h-screen" dir="rtl">
      <div className="crown-pattern fixed inset-0" aria-hidden="true" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-2 pb-3 pt-2">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <Button variant="neonIcon" size="icon" aria-label="الرئيسية" onClick={onHome}>
            <Home />
          </Button>
          <div className="flex items-center justify-center gap-2">
            <img src={modeDomino} alt="" width={512} height={512} className="asset-shine size-6" />
            <h1 className="font-display text-base font-black text-ludo-gold text-shadow-glow">
              دومينو عبقور
            </h1>
            <span className="text-[11px] text-ludo-soft">المخزون {state.stock.length}</span>
          </div>
          <Button
            variant="neonIcon"
            size="icon"
            aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
            onClick={onMute}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        </header>

        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          {state.players.map((p) => (
            <div
              key={p.seat}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-ludo-gold/35 bg-ludo-panel/60 py-0.5 pe-2 ps-0.5",
                state.turn === p.seat && "ring-2 ring-ludo-gold",
              )}
            >
              {p.isBot ? (
                <span className="grid size-6 place-items-center rounded-full bg-ludo-purple text-ludo-gold">
                  <Bot className="size-3.5" />
                </span>
              ) : (
                <img
                  src={avatarTiger}
                  alt=""
                  width={512}
                  height={512}
                  loading="lazy"
                  className="size-6 rounded-full ring-1 ring-ludo-gold"
                />
              )}
              <b className="max-w-16 truncate text-[11px]">{p.name}</b>
              <small className="flex items-center gap-0.5 text-[10px] text-ludo-soft">
                <Layers className="size-3" /> {tilesLeft(state, p.seat)}
              </small>
            </div>
          ))}
        </div>

        <section
          className="domino-arena domino-felt my-1.5 flex-1"
          ref={railRef}
          data-testid="domino-arena"
          style={{ minHeight: "56vh" }}
        >
          {state.board.length === 0 ? (
            <p className="text-center text-sm font-bold text-white/90 text-shadow-glow">
              ابدأ بوضع أي حجرة في منتصف الساحة
            </p>
          ) : (
            <div className="domino-stage" data-testid="domino-chain">
              <div className="domino-zoom" ref={zoom.ref}>
                <div className="domino-chain" style={{ transform: `scale(${boardScale})` }}>
                  {layout.items.map((item) => (
                    <span
                      key={item.id}
                      className={cn("domino-slot", landedId === item.id && "domino-slot-land")}
                      data-first={item.id === layout.items[0]!.id ? "true" : undefined}
                      style={{
                        transform: `translate(-50%, -50%) translate(${item.x}px, ${item.y}px)`,
                      }}
                    >
                      <DominoTile a={item.left} b={item.right} horizontal={item.double} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {state.board.length > 0 && (
            <div className="domino-zoom-tools">
              <button
                type="button"
                className="domino-zoom-btn"
                aria-label="تكبير"
                onClick={() => zoom.zoomBy(1.25)}
              >
                <Plus className="size-4" />
              </button>
              <button
                type="button"
                className="domino-zoom-btn"
                aria-label="تصغير"
                onClick={() => zoom.zoomBy(0.8)}
              >
                <Minus className="size-4" />
              </button>
              {zoom.zoomed && (
                <button
                  type="button"
                  className="domino-zoom-btn"
                  aria-label="إعادة الضبط"
                  onClick={zoom.reset}
                >
                  <Maximize2 className="size-4" />
                </button>
              )}
            </div>
          )}

          {confirming && (
            <div className="domino-confirm" data-testid="domino-confirm">
              <i />
              <i />
              <i />
              <b className="font-display">التشكيل جاهز</b>
            </div>
          )}

          {preview && (
            <div className="domino-preview" data-testid="domino-preview">
              <b className="font-display text-lg text-ludo-gold text-shadow-glow">
                معاينة ترتيب الجولة
              </b>
              <div className="domino-preview-row">
                {(me?.hand ?? []).slice(0, 7).map((tile) => (
                  <DominoTile key={tile.id} a={tile.a} b={tile.b} horizontal={tile.a === tile.b} />
                ))}
              </div>
              <span className="domino-preview-bar">
                <i style={{ width: `${progress}%` }} />
              </span>
              <small className="text-xs text-ludo-soft">
                جارٍ تجهيز الساحة… {Math.round(progress)}%
              </small>
            </div>
          )}
        </section>

        <p className="ledger-row justify-center text-center text-sm font-bold text-ludo-gold">
          {state.message}
        </p>

        {selected && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="royal" onClick={() => playSide("left")}>
              ضع في الطرف الأيسر
            </Button>
            <Button variant="royal" onClick={() => playSide("right")}>
              ضع في الطرف الأيمن
            </Button>
          </div>
        )}

        {noMove && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="neon"
              disabled={!state.stock.length}
              onClick={() => {
                moveCount.current += 1;
                sfx.tap();
                setState((s) => drawTile(s));
              }}
            >
              اسحب حجرة
            </Button>
            <Button variant="neon" onClick={() => setState((s) => passTurn(s))}>
              مرّر الدور
            </Button>
          </div>
        )}

        <section className="pt-1.5">
          <div className="domino-hand flex flex-wrap justify-center gap-1.5 rounded-2xl border border-ludo-gold/35 bg-ludo-panel/55 p-1.5">
            {(me?.hand ?? []).map((tile) => (
              <DominoTile
                key={tile.id}
                a={tile.a}
                b={tile.b}
                selectable={playableIds.has(tile.id)}
                selected={selected === tile.id}
                onClick={() => handleTileClick(tile)}
              />
            ))}
          </div>
        </section>

        {state.phase === "over" && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-ludo-deep/85 p-5 backdrop-blur-sm">
            <div className="royal-panel celebrate-pop w-full max-w-sm p-6 text-center">
              <Crown className="mx-auto size-20 text-ludo-gold" fill="currentColor" />
              <h2 className="title-ribbon text-2xl">
                {state.winner === mySeat ? "مبروك الفوز!" : "حظًا أوفر"}
              </h2>
              <p className="my-4 text-sm text-ludo-soft">{state.message}</p>
              <Button variant="play" size="xl" className="w-full" onClick={restart}>
                <RotateCcw /> جولة جديدة
              </Button>
              <Button variant="ghostGold" className="mt-2 w-full" onClick={onHome}>
                العودة للرئيسية
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
