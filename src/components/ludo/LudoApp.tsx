import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Bot,
  ChevronLeft,
  Crown,
  Coins,
  Eye,
  Gem,
  Gift,
  History,
  Layers,
  Target,
  Home,
  ListOrdered,
  Medal,
  Menu,
  MessageSquare,
  Plus,
  RotateCcw,
  Settings,
  Smile,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCircle2,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import brandMark from "@/assets/brand-mark.png";
import homeUi from "@/assets/home-ui.jpeg.asset.json";
import coinStack from "@/assets/coin-stack.png";
import gemEmerald from "@/assets/gem-emerald.png";
import giftBox from "@/assets/gift-box.png";
import chestClosed from "@/assets/chest-closed.png";
import diceRoyal from "@/assets/dice-royal.png";
import avatarTiger from "@/assets/avatar-tiger.png";
import mode2p from "@/assets/mode-2p.png";
import mode4p from "@/assets/mode-4p.png";
import modeDomino from "@/assets/mode-domino.png";
import modeMissions from "@/assets/mode-missions.png";
import modeLedger from "@/assets/mode-ledger.png";
import chestOpen from "@/assets/chest-open.png";
import modeRules from "@/assets/mode-rules.png";
import navHome from "@/assets/nav-home.png";
import navStore from "@/assets/nav-store.png";
import navFriends from "@/assets/nav-friends.png";
import navTrophy from "@/assets/nav-trophy.png";
import navSettings from "@/assets/nav-settings.png";
import { Dice } from "./Dice";
import { LudoBoard } from "./LudoBoard";
import { RulesContent } from "./RulesScreen";
import { Leaderboard } from "./LeaderboardScreen";
import { AuthPanel } from "./AuthScreen";
import { AdminPanel } from "./AdminScreen";
import { SettingsPanel } from "./SettingsScreen";
import { MatchHistory } from "./HistoryScreen";
import { MissionsPanel } from "./MissionsScreen";
import { ChestsPanel } from "./ChestsScreen";
import { LedgerPanel } from "./LedgerScreen";
import { OpenedChestsPanel } from "./OpenedChestsScreen";
import { DominoGame } from "@/components/domino/DominoGame";
import { SplashScreen } from "./SplashScreen";
import { GateScreen } from "./GateScreen";
import { RoomsPanel, type RoomLaunch } from "./RoomsScreen";
import { MatchSummary, type MatchEvent } from "./MatchSummary";
import { haptics, loadHaptics, setHaptics as persistHaptics } from "@/lib/haptics";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import {
  initAudio,
  loadMuted,
  loadVolume,
  setMuted as persistMuted,
  setVolume as persistVolume,
  sfx,
} from "@/lib/audio";
import { applyAnimations, applyGameplay, DEFAULT_GAMEPLAY, loadAnimations, loadGameplay, saveGameplay, setAnimations as persistAnimations, type GameplayPrefs } from "@/lib/prefs";
import { StoreScreen } from "./StoreScreen";
import { useServerFn } from "@tanstack/react-start";
import { submitMatchResult } from "@/lib/match.functions";
import { AnnouncementBar } from "./AnnouncementBar";
import { enqueueResult, flushQueue, isOnline, onReconnect } from "@/lib/offline-queue";
import { forfeitServerTurn, rollServerDie, startServerTurn } from "@/lib/live.functions";
import { TurnTimer } from "./TurnTimer";
import { MatchChat, type ChatContext } from "./MatchChat";
import { LiveVoiceButton } from "./LiveVoice";
import {
  applyMove,
  applyRoll,
  createGame,
  currentPlayer,
  forfeitTurn,
  legalMoves,
  pickBotMove,
  rollDie,
  tokensDone,
  type GameState,
} from "@/lib/ludo/engine";
import { SEATS } from "@/lib/ludo/board";
import { cn } from "@/lib/utils";

const TURN_SECONDS = 15;

type Screen =
  | "home"
  | "setup"
  | "rooms"
  | "rewards"
  | "tournaments"
  | "rules"
  | "leaderboard"
  | "account"
  | "history"
  | "settings"
  | "missions"
  | "chests"
  | "ledger"
  | "opened"
  | "store"
  | "domino"
  | "admin"
  | "game";

const colorBg: Record<string, string> = {
  ruby: "bg-ludo-ruby",
  palm: "bg-ludo-palm",
  amber: "bg-ludo-amber",
  lagoon: "bg-ludo-lagoon",
};

export function LudoApp() {
  return (
    <AuthProvider>
      <LudoShell />
    </AuthProvider>
  );
}

function LudoShell() {
  const { user, isAdmin, refreshProfile } = useAuth();
  const [screen, setScreen] = useState<Screen>("home");
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [humanCount, setHumanCount] = useState(1);
  const [game, setGame] = useState<GameState>(() => createGame(4, 1));
  const [rolling, setRolling] = useState(false);
  const [muted, setMuted] = useState(false);
  const [haptic, setHaptic] = useState(true);
  const [stage, setStage] = useState<"splash" | "gate" | "app">("splash");
  const [guest, setGuest] = useState(false);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [volume, setVolume] = useState(0.6);
  const [animations, setAnimations] = useState(true);
  const [gameplay, setGameplay] = useState<GameplayPrefs>(DEFAULT_GAMEPLAY);
  const [celebrate, setCelebrate] = useState(false);
  const [verified, setVerified] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(TURN_SECONDS);
  const [serverSynced, setServerSynced] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const savedFor = useRef<string | null>(null);
  const matchId = useRef<string>("");
  const matchStart = useRef<number>(0);
  const moveCount = useRef(0);
  const rollSeq = useRef(0);
  const clockOffset = useRef(0);
  const warned = useRef(0);
  const turnSig = useRef<string | null>(null);
  const rollingRef = useRef(false);
  const sendResult = useServerFn(submitMatchResult);

  // تفريغ طابور النتائج المؤجّلة عند تسجيل الدخول أو عودة الاتصال
  useEffect(() => {
    if (!user) return;
    const flush = () => {
      void flushQueue((data) => sendResult({ data })).then((n) => {
        if (n > 0) void refreshProfile();
      });
    };
    flush();
    return onReconnect(flush);
  }, [user, sendResult, refreshProfile]);
  const sendRoll = useServerFn(rollServerDie);
  const openTurn = useServerFn(startServerTurn);
  const endTurn = useServerFn(forfeitServerTurn);

  useEffect(() => {
    setMuted(loadMuted());
    setVolume(loadVolume());
    setHaptic(loadHaptics());
    const anim = loadAnimations();
    setAnimations(anim);
    applyAnimations(anim);
    const gp = loadGameplay();
    setGameplay(gp);
    applyGameplay(gp);
    setPlayerCount(gp.players);
  }, []);

  const changeVolume = (next: number) => {
    setVolume(next);
    persistVolume(next);
  };

  const changeHaptics = (next: boolean) => {
    setHaptic(next);
    persistHaptics(next);
    if (next) haptics.tap();
  };

  const changeGameplay = (next: GameplayPrefs) => {
    setGameplay(next);
    saveGameplay(next);
    if (!inRoom) setPlayerCount(next.players);
  };

  const changeAnimations = (next: boolean) => {
    setAnimations(next);
    persistAnimations(next);
  };

  const showCelebration = useCallback(
    (ms: number) => {
      if (!animations) return;
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), ms);
    },
    [animations],
  );

  const toggleMute = (value?: boolean) => {
    setMuted((prev) => {
      const next = value ?? !prev;
      persistMuted(next);
      if (!next) sfx.tap();
      return next;
    });
  };

  const moves = useMemo(
    () => (game.phase === "move" && game.dice ? legalMoves(game, game.dice) : []),
    [game],
  );
  const player = currentPlayer(game);

  const navigate = useCallback((next: Screen) => {
    initAudio();
    sfx.tap();
    haptics.tap();
    setScreen(next);
  }, []);

  const startGame = () => {
    initAudio();
    setInRoom(false);
    setGame(createGame(playerCount, Math.min(humanCount, playerCount)));
    savedFor.current = null;
    matchId.current = crypto.randomUUID();
    matchStart.current = Date.now();
    moveCount.current = 0;
    setEvents([]);
    sfx.start();
    setScreen("game");
    showCelebration(1600);
  };

  const startDomino = () => {
    initAudio();
    setInRoom(false);
    matchId.current = crypto.randomUUID();
    matchStart.current = Date.now();
    savedFor.current = null;
    sfx.start();
    setScreen("domino");
  };

  /** بدء مباراة غرفة حقيقية بمعرّف مباراة موحّد لكل الأعضاء */
  const launchRoomMatch = useCallback(
    (launch: RoomLaunch) => {
      initAudio();
      const count = Math.min(4, Math.max(2, launch.names.length)) as 2 | 3 | 4;
      setInRoom(true);
      setPlayerCount(count);
      setHumanCount(count);
      savedFor.current = null;
      matchId.current = launch.matchId;
      matchStart.current = Date.now();
      moveCount.current = 0;
      setEvents([]);
      sfx.start();
      if (launch.mode === "domino") {
        setScreen("domino");
        return;
      }
      setGame(createGame(count, count, launch.names.slice(0, count)));
      setScreen("game");
      showCelebration(1600);
    },
    [showCelebration],
  );

  const reportMatch = useCallback(
    (payload: {
      result: "win" | "loss";
      players: number;
      moves: number;
      mode: "ludo" | "domino";
    }) => {
      const key = `${matchId.current}-${payload.result}-${payload.mode}`;
      if (!user || !matchId.current || savedFor.current === key) return;
      savedFor.current = key;
      const entry = {
        matchId: matchId.current,
        result: payload.result,
        players: payload.players,
        moves: payload.moves,
        durationMs: Math.max(0, Date.now() - matchStart.current),
        mode: payload.mode,
      };

      // بدون اتصال: تُحفظ النتيجة والنقاط محليًا وتُرسل تلقائيًا عند عودة الشبكة
      if (!isOnline()) {
        enqueueResult(entry);
        return;
      }

      void sendResult({ data: entry })
        .then(() => refreshProfile())
        .catch(() => {
          enqueueResult(entry);
        });
    },
    [user, sendResult, refreshProfile],
  );

  // ===== المرحلة 9: رمية موثّقة من السيرفر =====
  const handleRoll = async () => {
    if (rolling || game.phase !== "roll") return;
    initAudio();
    rollingRef.current = true;
    setRolling(true);
    sfx.diceRoll();
    haptics.diceRoll();
    const seq = (rollSeq.current += 1);
    const spin = new Promise((resolve) => window.setTimeout(resolve, 620));
    let value = 0;
    let trusted = false;
    try {
      const [res] = await Promise.all([
        sendRoll({ data: { matchId: matchId.current, seq } }),
        spin,
      ]);
      value = res.value;
      trusted = Boolean(res.sig);
    } catch {
      await spin;
      value = rollDie();
      trusted = false;
    }
    setVerified(trusted);
    setGame((g) => {
      const next = applyRoll(g, value);
      if (next.turn !== g.turn)
        window.setTimeout(() => {
          sfx.turnPass();
          haptics.turnPass();
        }, 180);
      return next;
    });
    sfx.diceLand(value);
    haptics.diceLand();
    rollingRef.current = false;
    setRolling(false);
  };

  const commitMove = useCallback(
    (state: GameState, move: ReturnType<typeof legalMoves>[number]) => {
      moveCount.current += 1;
      const seat = currentPlayer(state).seat;
      const kind: MatchEvent["kind"] = move.captures.length
        ? "capture"
        : move.finishes
          ? "home"
          : move.entersBoard
            ? "enter"
            : "move";

      // الصوت والاهتزاز مضبوطان على توقيت انتقال القطعة (300ms)
      if (kind === "capture") {
        sfx.move();
        window.setTimeout(() => {
          sfx.capture();
          haptics.capture();
        }, 300);
      } else if (kind === "home") {
        sfx.move();
        window.setTimeout(() => {
          sfx.home();
          haptics.home();
        }, 300);
      } else if (kind === "enter") {
        sfx.enter();
        haptics.enter();
      } else {
        sfx.move();
        haptics.move();
      }

      setEvents((prev) => [
        ...prev.slice(-40),
        {
          kind,
          seat,
          seatLabel: currentPlayer(state).name,
          from: move.from,
          to: move.to,
          die: state.dice ?? 0,
          at: Date.now(),
        },
      ]);

      const next = applyMove(state, move);
      if (next.turn !== state.turn && next.phase !== "over") {
        window.setTimeout(() => {
          sfx.turnPass();
          haptics.turnPass();
        }, 420);
      }
      return next;
    },
    [],
  );

  const handleToken = (id: string) => {
    const move = moves.find((item) => item.tokenId === id);
    if (move) setGame((g) => commitMove(g, move));
  };

  // نوبة الروبوت
  useEffect(() => {
    if (screen !== "game" || game.phase === "over" || !player.isBot || rolling) return;
    const timer = window.setTimeout(() => {
      if (game.phase === "roll") {
        setRolling(true);
        sfx.diceRoll();
        window.setTimeout(() => {
          const value = rollDie();
          setGame((g) => applyRoll(g, value));
          sfx.diceLand(value);
          haptics.diceLand();
          setRolling(false);
        }, 560);
      } else if (moves.length) {
        setGame((g) => commitMove(g, pickBotMove(moves)));
      }
    }, 720);
    return () => window.clearTimeout(timer);
  }, [
    screen,
    game.phase,
    game.turn,
    game.dice,
    game.winner,
    player.isBot,
    rolling,
    moves,
    commitMove,
  ]);

  // حركة وحيدة تُنفّذ تلقائيًا
  useEffect(() => {
    if (game.phase !== "move" || player.isBot || moves.length !== 1) return;
    const only = moves[0];
    if (!only) return;
    const timer = window.setTimeout(() => setGame((g) => commitMove(g, only)), 420);
    return () => window.clearTimeout(timer);
  }, [game.phase, game.turn, game.dice, player.isBot, moves, commitMove]);

  // ===== المرحلة 12: مؤقت 15 ثانية بتوقيت السيرفر =====
  const timerActive = screen === "game" && game.phase !== "over" && !player.isBot;

  useEffect(() => {
    if (!timerActive) {
      setDeadline(null);
      return;
    }
    let alive = true;
    warned.current = 0;
    setRemaining(gameplay.turnSeconds);
    void openTurn({ data: { matchId: matchId.current, turn: game.turn } })
      .then((res) => {
        if (!alive) return;
        clockOffset.current = res.serverNow - Date.now();
        turnSig.current = res.sig;
        setDeadline(res.deadline);
        setServerSynced(true);
      })
      .catch(() => {
        if (!alive) return;
        turnSig.current = null;
        setDeadline(Date.now() + gameplay.turnSeconds * 1000);
        setServerSynced(false);
      });
    return () => {
      alive = false;
    };
    // بداية دور جديدة لكل لاعب
  }, [timerActive, game.turn, openTurn]);

  useEffect(() => {
    if (!timerActive || deadline === null) return;
    const turnNo = game.turn;
    const tick = window.setInterval(() => {
      const left = (deadline - (Date.now() + clockOffset.current)) / 1000;
      setRemaining(Math.max(0, left));
      const whole = Math.ceil(left);
      if (whole <= 5 && whole >= 1 && warned.current !== whole) {
        warned.current = whole;
        sfx.warn();
        haptics.tap();
      }
      if (left <= 0) {
        window.clearInterval(tick);
        // سباق: إذا كانت هناك رمية قيد التنفيذ لا يُنهى الدور حتى تكتمل نتيجتها
        if (rollingRef.current) return;
        const sig = turnSig.current;
        const finish = () => {
          sfx.timeout();
          haptics.turnPass();
          setDeadline(null);
          setVerified(false);
          setGame((g) => forfeitTurn(g));
        };
        if (!sig) {
          finish();
          return;
        }
        void endTurn({ data: { matchId: matchId.current, turn: turnNo, deadline, sig } })
          .then((verdict) => {
            // السيرفر هو من يقرّ انتهاء المهلة فعليًا
            if (verdict.ok) finish();
            else setDeadline(Date.now() + 1200);
          })
          .catch(() => finish());
      }
    }, 180);
    return () => window.clearInterval(tick);
  }, [timerActive, deadline, game.turn, endTurn]);

  // احتفال + حفظ النتيجة (يتم التحقق منها في السيرفر)
  useEffect(() => {
    if (game.phase !== "over" || game.winner === null) return;
    sfx.win();
    haptics.win();
    showCelebration(4200);

    const mySeat = game.players.find((p) => !p.isBot)?.seat;
    if (mySeat !== undefined) {
      reportMatch({
        result: game.winner === mySeat ? "win" : "loss",
        players: game.players.length,
        moves: moveCount.current,
        mode: "ludo",
      });
    }
  }, [game.phase, game.winner, game.players, reportMatch, showCelebration]);

  if (stage === "splash") {
    return <SplashScreen onDone={() => setStage(guestReady() || user ? "app" : "gate")} />;
  }

  if (stage === "gate" && !user && !guest) {
    return (
      <GateScreen
        onSignIn={() => {
          setStage("app");
          setScreen("account");
        }}
        onSignUp={() => {
          setStage("app");
          setScreen("account");
        }}
        onGuest={() => {
          markGuest();
          setGuest(true);
          setStage("app");
          setScreen("home");
        }}
      />
    );
  }

  if (screen === "domino") {
    return (
      <DominoGame
        playerCount={playerCount}
        humanCount={humanCount}
        muted={muted}
        onMute={() => toggleMute()}
        onHome={() => navigate(inRoom ? "rooms" : "home")}
        onFinish={({ winnerSeat, mySeat, players, moves }) => {
          showCelebration(3200);
          reportMatch({
            result: winnerSeat === mySeat ? "win" : "loss",
            players,
            moves,
            mode: "domino",
          });
        }}
      />
    );
  }

  if (screen === "game") {
    return (
      <GameScreen
        state={game}
        moves={moves}
        rolling={rolling}
        muted={muted}
        celebrate={celebrate}
        events={events}
        verified={verified}
        remaining={remaining}
        timerActive={timerActive}
        serverSynced={serverSynced}
        meName={game.players.find((p) => !p.isBot)?.name ?? "أنا"}
        chatContext={{
          myTurn: !player.isBot,
          secondsLeft: Math.ceil(remaining),
          lastEvent: events.length
            ? events[events.length - 1]!.kind === "capture"
              ? "capture"
              : events[events.length - 1]!.kind === "home"
                ? "home"
                : events[events.length - 1]!.kind === "enter"
                  ? "six"
                  : null
            : null,
        }}
        onMute={() => toggleMute()}

        onRoll={handleRoll}
        onToken={handleToken}
        onHome={() => navigate(inRoom ? "rooms" : "home")}
        onRules={() => navigate("rules")}
        onRestart={startGame}
      />
    );
  }

  return (
    <div className="ludo-shell min-h-screen" dir="rtl">
      <Starfield />
      <div className="relative mx-auto min-h-screen w-full max-w-md px-3 pb-24 pt-3 sm:pt-5">
        {screen !== "home" && (
        <TopBar
          muted={muted}
          onMute={() => toggleMute()}
          onMenu={() => navigate("home")}
          onAccount={() => navigate("account")}
        />
        )}
        {screen === "home" && <AnnouncementBar />}
        {screen === "home" && (
          <HomeScreen
            navigate={navigate}
            quickPlay={startGame}
            dominoPlay={startDomino}
            isAdmin={isAdmin}
          />
        )}
        {screen === "setup" && (
          <SetupScreen
            players={playerCount}
            humans={humanCount}
            setPlayers={setPlayerCount}
            setHumans={setHumanCount}
            onStart={startGame}
            onBack={() => navigate("home")}
          />
        )}
        {screen === "rooms" && (
          <PanelPage title="غرف اللعب" icon={<Users />} onBack={() => navigate("home")}>
            <RoomsPanel meId={user?.id ?? null} onLaunch={launchRoomMatch} />
          </PanelPage>
        )}
        {screen === "rewards" && <RewardsScreen onBack={() => navigate("home")} />}
        {screen === "tournaments" && <TournamentsScreen onBack={() => navigate("home")} />}
        {screen === "rules" && (
          <PanelPage title="قواعد اللعبة" icon={<BookOpen />} onBack={() => navigate("home")}>
            <RulesContent />
          </PanelPage>
        )}
        {screen === "leaderboard" && (
          <PanelPage title="لوحة المتصدرين" icon={<ListOrdered />} onBack={() => navigate("home")}>
            <Leaderboard meId={user?.id ?? null} />
          </PanelPage>
        )}
        {screen === "history" && (
          <PanelPage title="سجل المباريات" icon={<History />} onBack={() => navigate("home")}>
            <MatchHistory meId={user?.id ?? null} />
          </PanelPage>
        )}
        {screen === "settings" && (
          <PanelPage title="الإعدادات" icon={<Settings />} onBack={() => navigate("home")}>
            <SettingsPanel
              muted={muted}
              volume={volume}
              animations={animations}
              haptics={haptic}
              gameplay={gameplay}
              onGameplay={changeGameplay}
              onMuted={(v) => toggleMute(v)}
              onVolume={changeVolume}
              onAnimations={changeAnimations}
              onHaptics={changeHaptics}
            />
          </PanelPage>
        )}
        {screen === "missions" && (
          <PanelPage title="المهام" icon={<Target />} onBack={() => navigate("home")}>
            <MissionsPanel signedIn={Boolean(user)} onWalletChange={() => void refreshProfile()} />
          </PanelPage>
        )}
        {screen === "store" && (
          <PanelPage title="المتجر" icon={<Gift />} onBack={() => navigate("home")}>
            <StoreScreen />
          </PanelPage>
        )}
        {screen === "chests" && (
          <PanelPage title="الصناديق" icon={<Gift />} onBack={() => navigate("home")}>
            <ChestsPanel
              signedIn={Boolean(user)}
              animations={animations}
              onWalletChange={() => void refreshProfile()}
            />
          </PanelPage>
        )}
        {screen === "ledger" && (
          <PanelPage title="سجل المعاملات" icon={<History />} onBack={() => navigate("home")}>
            <LedgerPanel signedIn={Boolean(user)} />
          </PanelPage>
        )}
        {screen === "opened" && (
          <PanelPage title="الصناديق المفتوحة" icon={<Gift />} onBack={() => navigate("home")}>
            <OpenedChestsPanel signedIn={Boolean(user)} />
          </PanelPage>
        )}
        {screen === "admin" && (
          <PanelPage title="لوحة التحكم" icon={<ShieldCheck />} onBack={() => navigate("home")}>
            <AdminPanel />
          </PanelPage>
        )}
        {screen === "account" && (
          <PanelPage title="حسابي" icon={<UserCircle2 />} onBack={() => navigate("home")}>
            <AuthPanel />
          </PanelPage>
        )}
        {screen !== "home" && <BottomNav active={screen} navigate={navigate} />}
      </div>
      {celebrate && <Confetti />}
    </div>
  );
}

const GUEST_KEY = "abqor-guest";
function guestReady() {
  return typeof window !== "undefined" && window.localStorage.getItem(GUEST_KEY) === "1";
}
function markGuest() {
  if (typeof window !== "undefined") window.localStorage.setItem(GUEST_KEY, "1");
}

function TopBar({
  muted,
  onMute,
  onMenu,
  onAccount,
}: {
  muted: boolean;
  onMute: () => void;
  onMenu: () => void;
  onAccount: () => void;
}) {
  const { profile, user } = useAuth();
  const xp = (profile?.xp ?? 0) % 300;
  return (
    <header className="space-y-2">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <button type="button" onClick={onAccount} className="relative" aria-label="حسابي">
          <span className="level-orb">
            {user ? (
              profile?.avatar && profile.avatar.length <= 3 ? (
                <span>{profile.avatar}</span>
              ) : (
                <img src={avatarTiger} alt="" width={512} height={512} loading="lazy" />
              )
            ) : (
              <img src={avatarTiger} alt="" width={512} height={512} loading="lazy" />
            )}
          </span>
          <span className="level-chip">{user ? `مستوى ${profile?.level ?? 1}` : "دخول"}</span>
        </button>
        <div className="min-w-0">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onAccount}
              className="hud-pill press-3d reflect-gloss"
              aria-label="الذهب"
            >
              <img src={coinStack} alt="" width={512} height={512} loading="lazy" />
              <b>{user ? (profile?.gold ?? 0) : 0}</b>
              <span className="hud-plus">+</span>
            </button>
            <button
              type="button"
              onClick={onAccount}
              className="hud-pill press-3d reflect-gloss"
              aria-label="الجواهر"
            >
              <img src={gemEmerald} alt="" width={512} height={512} loading="lazy" />
              <b>{user ? (profile?.diamonds ?? 0) : 0}</b>
              <span className="hud-plus">+</span>
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="xp-track flex-1">
              <span className="xp-fill" style={{ width: `${(xp / 300) * 100}%` }} />
            </div>
            <small className="shrink-0 text-[10px] font-bold text-ludo-gold">{xp}/300 XP</small>
          </div>
        </div>
        <div className="grid gap-1">
          <Button
            variant="neonIcon"
            size="icon"
            className="press-3d"
            aria-label="القائمة"
            onClick={onMenu}
          >
            <Menu />
          </Button>
          <Button
            variant="neonIcon"
            size="icon"
            aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
            onClick={onMute}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        </div>
      </div>
      <Brand />
    </header>
  );
}

function Brand() {
  return (
    <div className="min-w-0 text-center">
      <img
        src={brandMark}
        alt="شعار عبقور لودو"
        width={512}
        height={512}
        className="asset-shine mx-auto -mb-2 size-16"
      />
      <h1 className="truncate font-display text-2xl font-black text-ludo-gold text-shadow-glow">
        ABQOR LUDO
      </h1>
      <p className="-mt-1 text-xs font-bold text-ludo-pink">عبقور لودو</p>
    </div>
  );
}

function HotSpot({
  label,
  onClick,
  style,
}: {
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute rounded-2xl outline-none transition active:scale-[.96] focus-visible:ring-2 focus-visible:ring-white/70"
      style={{ ...style, position: "absolute" }}
    />
  );
}

function HomeScreen({
  navigate,
  quickPlay,
  dominoPlay,
  isAdmin,
}: {
  navigate: (s: Screen) => void;
  quickPlay: () => void;
  dominoPlay: () => void;
  isAdmin?: boolean;
}) {
  return (
    <main className="relative -mx-3 -mt-3 pb-4">
      <div className="relative w-full" style={{ aspectRatio: "705 / 1568" }}>
        <img
          src={homeUi.url}
          alt="واجهة عبقور اللودو"
          className="absolute inset-0 h-full w-full select-none object-cover"
          draggable={false}
        />
        {/* الحساب */}
        <HotSpot label="حسابي" onClick={() => navigate("account")} style={{ left: "2.5%", top: "5%", width: "17.5%", height: "8%" }} />
        {/* الوقت / المكافآت */}
        <HotSpot label="المكافآت" onClick={() => navigate("rewards")} style={{ left: "23%", top: "6.6%", width: "22%", height: "3.6%" }} />
        {/* الذهب */}
        <HotSpot label="الذهب" onClick={() => navigate("chests")} style={{ left: "47.5%", top: "6.6%", width: "19.5%", height: "3.6%" }} />
        {/* الجواهر */}
        <HotSpot label="الجواهر" onClick={() => navigate("chests")} style={{ left: "68.5%", top: "6.6%", width: "19%", height: "3.6%" }} />
        {/* الإعدادات */}
        <HotSpot label="الإعدادات" onClick={() => navigate("settings")} style={{ left: "90%", top: "6.2%", width: "9%", height: "4.2%" }} />
        {/* زر الفيديو / المهام */}
        <HotSpot label="المهام" onClick={() => navigate("missions")} style={{ left: "1.5%", top: "13.8%", width: "15%", height: "6.6%" }} />
        {/* زر النرد / السجل */}
        <HotSpot label="سجل المباريات" onClick={() => navigate("history")} style={{ left: "1.5%", top: "22.6%", width: "14%", height: "5.4%" }} />
        {/* بطاقات الجوائز الوسطى */}
        <HotSpot label="جوائز مقفلة" onClick={() => navigate("rewards")} style={{ left: "33%", top: "13.2%", width: "15%", height: "7.4%" }} />
        <HotSpot label="ميجا وين" onClick={() => navigate("tournaments")} style={{ left: "51%", top: "13.2%", width: "15.5%", height: "7.4%" }} />
        {/* الصندوق المقفل يمين */}
        <HotSpot label="الصناديق" onClick={() => navigate("chests")} style={{ left: "86%", top: "15.5%", width: "12%", height: "5%" }} />
        {/* لافتة تعزيز الذهب */}
        <HotSpot label="تعزيز الذهب" onClick={() => navigate("chests")} style={{ left: "20%", top: "21.8%", width: "62%", height: "8.6%" }} />
        {/* 2 لاعبان */}
        <HotSpot label="لعب 2 لاعبان" onClick={quickPlay} style={{ left: "6%", top: "51.5%", width: "42.5%", height: "16%" }} />
        {/* 4 لاعبين */}
        <HotSpot label="لعب 4 لاعبين" onClick={() => navigate("setup")} style={{ left: "52.5%", top: "51.5%", width: "43%", height: "16%" }} />
        {/* الوضع الخاص */}
        <HotSpot label="الوضع الخاص" onClick={dominoPlay} style={{ left: "6%", top: "70.8%", width: "29%", height: "11.5%" }} />
        {/* تكوين فريق عبر الإنترنت */}
        <HotSpot label="تكوين فريق عبر الإنترنت" onClick={() => navigate("rooms")} style={{ left: "37.5%", top: "70.8%", width: "29%", height: "11.5%" }} />
        {/* فريق من الأصدقاء */}
        <HotSpot label="فريق من الأصدقاء" onClick={() => navigate("rooms")} style={{ left: "70%", top: "70.8%", width: "29%", height: "11.5%" }} />
        {/* الشريط السفلي */}
        <HotSpot label="المتجر" onClick={() => navigate("chests")} style={{ left: "0%", top: "86.5%", width: "19%", height: "12%" }} />
        <HotSpot label="الأصدقاء" onClick={() => navigate("rooms")} style={{ left: "19%", top: "86.5%", width: "20%", height: "12%" }} />
        <HotSpot label="الصفحة الرئيسية" onClick={() => navigate("home")} style={{ left: "39%", top: "84.5%", width: "23%", height: "14%" }} />
        <HotSpot label="الأندية" onClick={() => navigate("leaderboard")} style={{ left: "62%", top: "86.5%", width: "19%", height: "12%" }} />
        <HotSpot label="حزالة" onClick={() => navigate("opened")} style={{ left: "81%", top: "86.5%", width: "19%", height: "12%" }} />
      </div>

      {isAdmin && (
        <div className="px-3 pt-3">
          <Button variant="royal" size="xl" className="w-full" onClick={() => navigate("admin")}>
            <ShieldCheck /> لوحة تحكم المشرف
          </Button>
        </div>
      )}
    </main>
  );
}


function StatPill({
  icon,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press-3d flex items-center gap-1 rounded-full border border-ludo-gold/60 bg-ludo-plum px-2 py-1 text-xs font-black text-ludo-soft shadow-[0_3px_0_#25061f]"
    >
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="grid size-4 place-items-center rounded-full bg-ludo-green text-[10px] text-white">
        <Plus className="size-3" />
      </span>
    </button>
  );
}

function SideButton({
  img,
  label,
  badge,
  onClick,
}: {
  img: string;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press-3d relative grid size-14 place-items-center rounded-xl border-2 border-ludo-gold/80 bg-[linear-gradient(180deg,#5c1b52,#3a0d31)] shadow-[0_4px_0_#25061f]"
    >
      <img src={img} alt="" width={512} height={512} className="asset-shine size-9" />
      {badge && (
        <span className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-ludo-ruby text-[10px] font-black text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function BigModeCard({
  tone,
  img,
  title,
  onClick,
}: {
  tone: string;
  img: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("mode-tile press-3d reflect-gloss min-h-[9.5rem]", `tile-${tone}`)}
    >
      <img src={img} alt="" width={512} height={512} loading="lazy" />
      <b className="text-lg">{title}</b>
    </button>
  );
}

function MiniModeCard({
  img,
  title,
  icon,
  onClick,
}: {
  img: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press-3d reflect-gloss relative grid place-items-center gap-1 rounded-2xl border-2 border-ludo-gold/40 bg-[linear-gradient(180deg,#6b2160,#3a0d31)] p-2 shadow-[0_5px_0_#25061f,0_10px_18px_rgb(0_0_0/.4)]"
    >
      <span className="absolute -top-2 grid size-6 place-items-center rounded-full border border-ludo-gold/70 bg-ludo-plum text-ludo-gold">
        {icon}
      </span>
      <img src={img} alt="" width={512} height={512} loading="lazy" className="asset-shine size-12" />
      <small className="text-center text-[10px] font-bold leading-tight text-ludo-soft">
        {title}
      </small>
    </button>
  );
}

function SetupScreen({
  players,
  humans,
  setPlayers,
  setHumans,
  onStart,
  onBack,
}: {
  players: 2 | 3 | 4;
  humans: number;
  setPlayers: (v: 2 | 3 | 4) => void;
  setHumans: (v: number) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <PanelPage title="تجهيز الطاولة" icon={<Users />} onBack={onBack}>
      <p className="mb-3 text-center text-sm text-ludo-soft">
        اختر عدد المشاركين واللاعبين الحقيقيين
      </p>
      <SettingBlock title="عدد اللاعبين">
        <div className="grid grid-cols-3 gap-2">
          {([2, 3, 4] as const).map((n) => (
            <Button
              key={n}
              variant={players === n ? "royal" : "neon"}
              onClick={() => {
                setPlayers(n);
                setHumans(Math.min(humans, n));
              }}
            >
              {n} لاعبين
            </Button>
          ))}
        </div>
      </SettingBlock>
      <SettingBlock title="اللاعبون المحليون">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4]
            .filter((n) => n <= players)
            .map((n) => (
              <Button
                key={n}
                variant={humans === n ? "royal" : "neon"}
                onClick={() => setHumans(n)}
              >
                {n}
              </Button>
            ))}
        </div>
        <p className="mt-3 text-xs text-ludo-soft">سيكمل الروبوت المقاعد المتبقية تلقائيًا</p>
      </SettingBlock>
      <Button variant="play" size="xl" className="mt-5 w-full" onClick={onStart}>
        ابدأ اللعبة <Crown />
      </Button>
    </PanelPage>
  );
}

function RewardsScreen({ onBack }: { onBack: () => void }) {
  const items = [
    ["🪙", "1000 عملة"],
    ["🎁", "صندوق ملكي"],
    ["👑", "تاج الملك"],
    ["💎", "100 جوهرة"],
  ];
  return (
    <PanelPage title="المكافآت" icon={<Gift />} onBack={onBack}>
      <div className="reward-hero">
        <Gift className="size-20 text-ludo-gold" />
        <b>هدية يومية مميزة</b>
        <span>عد غدًا لمفاجأة جديدة</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {items.map(([icon, name], i) => (
          <div className="reward-card" key={name}>
            <span className="text-5xl">{icon}</span>
            <b>{name}</b>
            <Button variant={i === 0 ? "play" : "neon"} size="sm">
              {i === 0 ? "استلم" : "قريبًا"}
            </Button>
          </div>
        ))}
      </div>
    </PanelPage>
  );
}

function TournamentsScreen({ onBack }: { onBack: () => void }) {
  return (
    <PanelPage title="البطولات" icon={<Trophy />} onBack={onBack}>
      <div className="trophy-stage">
        <Trophy className="size-24 text-ludo-gold" fill="currentColor" />
        <h3>بطولة عبقور الكبرى</h3>
        <p>الجائزة الكبرى 20,000 عملة</p>
        <div className="countdown">
          <span>
            <b>05</b> أيام
          </span>
          <span>
            <b>12</b> ساعة
          </span>
          <span>
            <b>36</b> دقيقة
          </span>
        </div>
      </div>
      {["بطولة السرعة", "تحدّي الأصدقاء", "بطولة المحترفين"].map((x, i) => (
        <div className="list-card mt-2" key={x}>
          <Medal className="size-8 text-ludo-gold" />
          <span className="flex-1">
            <b className="block">{x}</b>
            <small className="text-ludo-soft">{i + 2} أيام متبقية</small>
          </span>
          <Button variant="neon" size="sm">
            التفاصيل
          </Button>
        </div>
      ))}
    </PanelPage>
  );
}

function PanelPage({
  title,
  icon,
  onBack,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="royal-panel glow-rise mt-4 p-3">
      <header className="title-ribbon mb-4 grid grid-cols-[auto_1fr_auto] items-center">
        <Button variant="ghostGold" size="icon" onClick={onBack}>
          <ChevronLeft className="rotate-180" />
        </Button>
        <h2 className="flex items-center justify-center gap-2 text-xl">
          {icon}
          {title}
        </h2>
        <span className="size-9" />
      </header>
      {children}
    </main>
  );
}

function SettingBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3 rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3">
      <h3 className="mb-3 font-bold text-ludo-gold">{title}</h3>
      {children}
    </section>
  );
}

function BottomNav({ active, navigate }: { active: Screen; navigate: (s: Screen) => void }) {
  const links: [Screen, string, string][] = [
    ["store", navStore, "المتجر"],
    ["rooms", navFriends, "الأصدقاء"],
    ["home", navHome, "الصفحة الرئيسية"],
    ["leaderboard", navTrophy, "الأندية"],
    ["opened", chestOpen, "جوائز"],
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-md grid-cols-5 gap-1 border-t-2 border-ludo-gold/70 bg-[linear-gradient(180deg,#5c1b52,#2c0824)] px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgb(0_0_0/.55)]">
      {links.map(([id, icon, label]) => (
        <button
          type="button"
          key={id}
          onClick={() => navigate(id)}
          className={cn("nav-3d press-3d", active === id && "nav-3d-active")}
        >
          <img src={icon} alt="" width={512} height={512} loading="lazy" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function GameScreen({
  state,
  moves,
  rolling,
  muted,
  celebrate,
  events,
  verified,
  remaining,
  timerActive,
  serverSynced,
  meName,
  chatContext,
  onMute,
  onRoll,
  onToken,
  onHome,
  onRules,
  onRestart,
}: {
  state: GameState;
  moves: ReturnType<typeof legalMoves>;
  rolling: boolean;
  muted: boolean;
  celebrate: boolean;
  events: MatchEvent[];
  verified: boolean;
  remaining: number;
  timerActive: boolean;
  serverSynced: boolean;
  meName: string;
  chatContext?: ChatContext | undefined;
  onMute: () => void;
  onRoll: () => void;
  onToken: (id: string) => void;
  onHome: () => void;
  onRules: () => void;
  onRestart: () => void;
}) {
  const { profile } = useAuth();
  const player = currentPlayer(state);
  const seat = SEATS[player.seat];
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<"quick" | "emoji" | "text">("quick");

  // ترتيب المقاعد كما في التصميم: أنا بالأسفل يمين اللوحة، والخصوم بالأعلى/الأسفل المقابل
  const mySeat = state.players.find((p) => !p.isBot)?.seat ?? 0;
  const others = state.players.filter((p) => p.seat !== mySeat);
  const me = state.players.find((p) => p.seat === mySeat)!;
  const topLeft = others[1] ?? null;
  const topRight = others[0] ?? null;
  const bottomRight = others[2] ?? null;

  const myTurn = player.seat === mySeat && !player.isBot;
  const pct = timerActive ? Math.max(0, Math.min(1, remaining / 15)) : 1;

  return (
    <div className="ludo-shell min-h-screen" dir="rtl">
      <Starfield />
      <div className="crown-pattern fixed inset-0" aria-hidden="true" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-3 pb-3 pt-2">
        {/* شريط علوي: قائمة، الفوز، مشاهدون، ثم الجواهر */}
        <div className="room-top-bar">
          <button
            type="button"
            className="room-pill press-3d"
            aria-label="الرئيسية"
            onClick={onHome}
          >
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            className="room-pill press-3d"
            aria-label="القواعد والفوز"
            onClick={onRules}
          >
            <Trophy className="size-5" />
          </button>
          <button
            type="button"
            className="room-pill press-3d"
            aria-label="المشاهدون"
            onClick={() => {
              setChatTab("quick");
              setChatOpen(true);
            }}
          >
            <Eye className="size-5" />
            <b>{events.length}</b>
          </button>
          <LiveVoiceButton roomId={`ludo-${state.players.length}`} meName={meName} />
          <button
            type="button"
            className="room-pill press-3d"
            aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
            onClick={onMute}
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <span className="room-gems">
            <img src={gemEmerald} alt="" width={512} height={512} loading="lazy" />
            <b>{profile?.diamonds ?? 0}</b>
          </span>
        </div>

        {/* مقاعد الخصوم أعلى اللوحة */}
        <div className="mt-2 grid min-h-[5.6rem] grid-cols-2 items-end gap-2">
          <div className="justify-self-start">
            {topLeft && <RoomSeat state={state} seatId={topLeft.seat} align="start" />}
          </div>
          <div className="justify-self-end">
            {topRight && <RoomSeat state={state} seatId={topRight.seat} align="end" />}
          </div>
        </div>

        <section className="board-wood reflect-gloss relative mx-auto my-1 w-full max-w-[min(94vw,34rem)]">
          <LudoBoard state={state} moves={moves} onTokenClick={onToken} />
        </section>

        {/* أنا بالأسفل مع حلقة المؤقت والنرد، والخصم المقابل يمينًا */}
        <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <div className="room-seat">
            <span className="room-name">{me.name}</span>
            <div className="flex items-center gap-2">
              <span
                className="room-ring"
                style={{
                  ["--seat" as string]: `var(--ludo-${SEATS[mySeat].token})`,
                  ["--pct" as string]: pct,
                }}
              >
                <span>
                  {me.isBot ? (
                    <Bot className="size-6 text-ludo-gold" />
                  ) : (
                    <img
                      src={avatarTiger}
                      alt=""
                      width={512}
                      height={512}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </span>
              </span>
              <span className="room-dice-bubble">
                <Dice
                  value={state.dice}
                  rolling={rolling}
                  disabled={state.phase !== "roll" || player.isBot}
                  onRoll={onRoll}
                  seatToken={seat.token}
                  verified={verified}
                />
              </span>
              <button
                type="button"
                className="room-pill press-3d"
                aria-label="جولة جديدة"
                onClick={onRestart}
              >
                <RotateCcw className="size-5" />
              </button>
            </div>
          </div>
          <div aria-hidden="true" />

          <div className="justify-self-end">
            {bottomRight && <RoomSeat state={state} seatId={bottomRight.seat} align="end" />}
          </div>
        </div>

        {/* شريط حالة الدور والمؤقت بعرض كامل حتى لا يتراكم مع المقاعد */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {myTurn && <span className="room-arrow" aria-hidden="true" />}
          <p className="text-xs font-bold text-ludo-gold">{state.message}</p>
          {timerActive && state.phase !== "over" && (
            <TurnTimer
              remaining={remaining}
              limit={15}
              name={player.name}
              serverSynced={serverSynced}
            />
          )}
        </div>

        {/* أزرار الدردشة والإيموجي كما في التصميم */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="neon"
            size="sm"
            className="press-3d"
            onClick={() => {
              setChatTab("emoji");
              setChatOpen(true);
              sfx.tap();
            }}
          >
            <Smile /> إيموجي
          </Button>
          <Button
            variant="neon"
            size="sm"
            className="press-3d"
            onClick={() => {
              setChatTab("text");
              setChatOpen(true);
              sfx.tap();
            }}
          >
            <MessageSquare /> الدردشة
          </Button>
          <span className="ms-auto flex items-center gap-1.5 rounded-full border border-ludo-gold/40 bg-ludo-panel/70 px-2 py-1 text-xs font-bold text-ludo-gold">
            <img
              src={coinStack}
              alt=""
              width={512}
              height={512}
              loading="lazy"
              className="size-5"
            />
            {profile?.gold ?? 0}
          </span>
        </div>

        {state.phase === "over" && (
          <MatchSummary
            winnerName={player.name}
            events={events}
            onRestart={onRestart}
            onHome={onHome}
          />
        )}
      </main>
      <MatchChat
        meName={meName}
        context={chatContext}
        open={chatOpen}
        onOpenChange={setChatOpen}
        tab={chatTab}
        hideFab
      />
      {celebrate && <Confetti />}
    </div>
  );
}

/** مقعد لاعب داخل الغرفة: صورة دائرية بإطار لونه لون المقعد + شريط الاسم */
function RoomSeat({
  state,
  seatId,
  align,
}: {
  state: GameState;
  seatId: 0 | 1 | 2 | 3;
  align: "start" | "end";
}) {
  const p = state.players.find((x) => x.seat === seatId);
  if (!p) return null;
  const s = SEATS[seatId];
  const active = currentPlayer(state).seat === seatId;
  return (
    <div
      className={cn("room-seat", align === "end" ? "items-end" : "items-start")}
      style={{ ["--seat" as string]: `var(--ludo-${s.token})` }}
    >
      <span className={cn("room-avatar", active && "room-avatar-active")}>
        {p.isBot ? (
          <Bot className="size-7 text-ludo-gold" />
        ) : (
          <Crown className="size-7 text-ludo-gold" />
        )}
        <b className="absolute -top-1 -start-1 grid size-6 place-items-center rounded-full bg-ludo-panel/90 text-[10px] text-ludo-gold">
          {tokensDone(state, seatId)}
        </b>
      </span>
      <span className="room-name">{p.name}</span>
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2 + Math.random() * 1.6,
        color: [
          "var(--ludo-gold)",
          "var(--ludo-pink)",
          "var(--ludo-palm)",
          "var(--ludo-lagoon)",
          "var(--ludo-ruby)",
        ][Math.floor(Math.random() * 5)],
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function Starfield() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="stars stars-a" />
      <div className="stars stars-b" />
    </div>
  );
}
