import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Flag,
  History,
  House,
  Minus,
  Plus,
  SlidersHorizontal,
  Swords,
  Trophy,
} from "lucide-react";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "./style.css";
import { TrackArt } from "./Hero";
import { Feeds, Badge, type Site } from "./Feeds";
import Duels from "./Duels";
import { catalogs, displayTime, result, startSession } from "./domain.mjs";
import { read, save, type Flags, type Entry } from "./store";
type Page = "Club" | "Feeds" | "Duels" | "Log";
const nav = [
  [House, "Club"],
  [SlidersHorizontal, "Feeds"],
  [Swords, "Duels"],
  [Activity, "Log"],
] as const;
function Shell() {
  const [data, setData] = useState(() => {
    const d = read();
    if (d.active) {
      d.history = [
        { ...d.active, elapsed: 0, ended: Date.now(), outcome: "interrupted" },
        ...d.history,
      ].slice(0, 180);
      d.active = null;
      save(d);
    }
    return d;
  });
  const ref = useRef(data);
  const [page, setPage] = useState<Page>("Club"),
    [site, setSite] = useState<Site>("instagram"),
    [setup, setSetup] = useState(false),
    [now, tick] = useState(Date.now()),
    [message, setMessage] = useState("");
  function modify(d: typeof data) {
    save(d);
    ref.current = d;
    setData(d);
  }
  function finish(reason: string) {
    const d = ref.current;
    if (!d.active) return;
    const e = result(d.active, Date.now(), reason);
    modify({ ...d, active: null, history: [e, ...d.history].slice(0, 180) });
    setMessage(
      e.outcome === "finished"
        ? "Lap complete. Saved to your log."
        : "Lap ended early. Your time is in the log.",
    );
  }
  useEffect(() => {
    function hidden() {
      if (document.hidden) finish("background");
    }
    function away() {
      finish("background");
    }
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", away);
    const sub = Capacitor.isNativePlatform()
      ? NativeApp.addListener("appStateChange", (s) => {
          if (!s.isActive) away();
        })
      : null;
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", away);
      void sub?.then((s) => s.remove());
    };
  }, []);
  useEffect(() => {
    if (!data.active) return;
    const id = setInterval(() => {
      const n = Date.now();
      tick(n);
      if (
        ref.current.active &&
        n >= ref.current.active.start + ref.current.active.goal
      )
        finish(document.hidden ? "background" : "deadline");
    }, 200);
    return () => clearInterval(id);
  }, [data.active]);
  const minutes = data.minutes,
    active = data.active;
  const total = data.history.reduce((sum, e) => sum + e.elapsed, 0),
    completed = data.history.filter((e) => e.outcome === "finished").length;
  function go(p: Page) {
    setPage(p);
    setSetup(false);
    setMessage("");
    window.scrollTo(0, 0);
  }
  function feeds(s: Site) {
    setSite(s);
    go("Feeds");
  }
  function minute(m: number) {
    modify({ ...data, minutes: Math.min(120, Math.max(1, m)) });
  }
  function start() {
    const s = startSession(minutes);
    tick(s.start);
    modify({ ...data, active: s });
    setSetup(false);
    setMessage("");
  }
  const focus = active || setup;
  return (
    <div className="shell">
      <header>
        <div className="brand">
          <img src="/mark.svg" alt="" />
          offrally
        </div>
        <div className="clubmark">
          <span />
          FOCUS CLUB
        </div>
      </header>
      <main key={focus ? "focus" : page}>
        {focus ? (
          <>
            <div className="eyebrow">
              <Flag size={15} /> SOLO SESSION
            </div>
            <h1>
              {active ? "On the clock" : "Set your pace"}
              <span>.</span>
            </h1>
            <p className="lede">
              Keep this screen open. Leaving the app ends your lap.
            </p>
            <div className="timer-face">
              <span className="ticker">
                {active ? "TIME LEFT" : "LAP LENGTH"}
              </span>
              <b>
                {active
                  ? displayTime(active.start + active.goal - now)
                  : displayTime(minutes * 60000)}
              </b>
              <div className="track-line">
                <i
                  style={{
                    width: active
                      ? Math.max(
                          0,
                          (100 * (now - active.start)) / active.goal,
                        ) + "%"
                      : "0%",
                  }}
                />
              </div>
            </div>
            {active ? (
              <button className="secondary full" onClick={() => finish("stop")}>
                End lap early
              </button>
            ) : (
              <>
                <div className="step">
                  <button
                    aria-label="Decrease minutes"
                    onClick={() => minute(minutes - 1)}
                  >
                    <Minus />
                  </button>
                  <strong>{minutes} min</strong>
                  <button
                    aria-label="Increase minutes"
                    onClick={() => minute(minutes + 1)}
                  >
                    <Plus />
                  </button>
                </div>
                <div className="presets">
                  {[1, 10, 25, 50].map((m) => (
                    <button
                      key={m}
                      aria-pressed={m === minutes}
                      onClick={() => minute(m)}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <button className="primary" onClick={start}>
                  Start timer <ArrowRight />
                </button>
                <button className="back" onClick={() => setSetup(false)}>
                  <ArrowLeft size={16} /> Back to club
                </button>
              </>
            )}
          </>
        ) : page === "Club" ? (
          <>
            <div className="eyebrow">
              <span className="dot" /> CLUBHOUSE
            </div>
            <h1>
              Focus club<span>.</span>
            </h1>
            <p className="lede">Your next lap starts here.</p>
            <section className="hero">
              <div className="hero-code">
                <Flag size={15} /> SOLO LAP
              </div>
              <div className="hero-time">
                {minutes}
                <i>min</i>
              </div>
              <TrackArt />
              <button
                className="hero-start"
                onClick={() => {
                  setSetup(true);
                  setMessage("");
                }}
              >
                Start a focus lap <ArrowRight size={19} />
              </button>
            </section>
            {message && (
              <p role="status" className="notice">
                {message}
              </p>
            )}
            <div className="section-head">
              <h2>Clean feeds</h2>
              <button onClick={() => feeds("instagram")}>
                Customize <ChevronRight size={15} />
              </button>
            </div>
            <div className="feed-pair">
              {(Object.keys(catalogs) as Site[]).map((s) => (
                <button
                  className={"feed-card " + s}
                  key={s}
                  onClick={() => feeds(s)}
                >
                  <Badge site={s} />
                  <ArrowUpRight className="corner" size={17} />
                  <strong>{catalogs[s].name}</strong>
                  <small>
                    <span />
                    {
                      catalogs[s].items.filter(
                        ([k]) => data.flags[k as keyof Flags],
                      ).length
                    }{" "}
                    active
                  </small>
                </button>
              ))}
            </div>
            <button className="duel-link" onClick={() => go("Duels")}>
              <span className="duel-icon">
                <Swords />
              </span>
              <span>
                <strong>Friend duel</strong>
                <small>Go head-to-head on focus time.</small>
              </span>
              <ArrowRight />
            </button>
          </>
        ) : page === "Feeds" ? (
          <Feeds
            initial={site}
            flags={data.flags}
            change={(k) =>
              modify({ ...data, flags: { ...data.flags, [k]: !data.flags[k] } })
            }
          />
        ) : page === "Duels" ? (
          <Duels />
        ) : (
          <>
            <div className="eyebrow">
              <History size={15} /> TRAINING RECORD
            </div>
            <h1>
              Lap log<span>.</span>
            </h1>
            <p className="lede">Your solo sessions on this device.</p>
            <div className="metrics">
              <div>
                <Clock3 />
                <strong>
                  {Math.floor(total / 60000)}
                  <i>min</i>
                </strong>
                <small>Time focused</small>
              </div>
              <div>
                <Trophy />
                <strong>{completed}</strong>
                <small>Finished laps</small>
              </div>
            </div>
            <h2>Recent sessions</h2>
            {data.history.length === 0 ? (
              <div className="panel empty">
                <Flag />
                <h3>Your first lap goes here.</h3>
                <button
                  className="secondary"
                  onClick={() => {
                    go("Club");
                    setSetup(true);
                  }}
                >
                  Set up a lap <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="panel">
                {data.history.map((e: Entry, i) => (
                  <div className="logrow" key={e.start + "-" + i}>
                    {e.outcome === "finished" ? <Check /> : <Clock3 />}
                    <span>
                      <strong>
                        {e.outcome === "finished"
                          ? "Finished lap"
                          : "Ended early"}
                      </strong>
                      <small>
                        {new Date(e.ended).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </small>
                    </span>
                    <b>{displayTime(e.elapsed)}</b>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      {!focus && (
        <nav aria-label="Main navigation">
          {nav.map(([Icon, p]) => (
            <button
              className={page === p ? "selected" : ""}
              aria-current={page === p ? "page" : undefined}
              key={p}
              onClick={() => go(p)}
            >
              <Icon size={20} />
              {p}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Shell />);
