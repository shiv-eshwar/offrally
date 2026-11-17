import { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Ghost,
  Instagram,
  Music2,
  Shield,
  ShieldCheck,
  Smartphone,
  Youtube,
} from "lucide-react";

type Mode = "allow" | "section" | "whole";
type Rule = {
  id: "instagram" | "youtube" | "snapchat" | "tiktok";
  name: string;
  section: string;
  installed: boolean;
  mode: Mode;
};
type Status = {
  available: boolean;
  authorized: boolean;
  active: boolean;
  count: number;
  apps?: Rule[];
  note?: string;
};
const platform = Capacitor.getPlatform();
const native = registerPlugin<{
  status(): Promise<Status>;
  requestAccess(): Promise<Status>;
  chooseApps(): Promise<Status>;
  setMode(options: { id: string; mode: Mode }): Promise<Status>;
  setActive(options: { active: boolean }): Promise<Status>;
}>("AppProtection");

export function useProtection() {
  const [state, setState] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const serial = useRef(0);
  const editing = useRef(false);
  async function refresh() {
    if (platform === "web" || editing.current) return;
    const id = ++serial.current;
    try {
      const next = await native.status();
      if (id === serial.current) {
        setState(next);
        setError("");
      }
    } catch {
      if (id === serial.current) setError("Could not read app protection.");
    }
  }
  useEffect(() => {
    if (platform === "web") return;
    void refresh();
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void refresh();
    });
    return () => {
      serial.current++;
      void listener.then((handle) => handle.remove());
    };
  }, []);
  async function act(action: () => Promise<Status>) {
    if (editing.current) return;
    editing.current = true;
    ++serial.current;
    setBusy(true);
    setError("");
    try {
      setState(await action());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update protection.");
    } finally {
      editing.current = false;
      setBusy(false);
    }
  }
  return { state, busy, error, act, refresh };
}

type Guard = ReturnType<typeof useProtection>;
const symbols = {
  instagram: Instagram,
  youtube: Youtube,
  snapchat: Ghost,
  tiktok: Music2,
};
const countLabel = (n: number) => n + (n === 1 ? " app" : " apps");

export function GuardLink({ guard, open }: { guard: Guard; open: () => void }) {
  const s = guard.state;
  return (
    <button className="guard-link" onClick={open}>
      <span className="guard-icon">
        {s?.active ? <ShieldCheck /> : <Shield />}
      </span>
      <span>
        <strong>App protection</strong>
        <small>
          {platform === "web"
            ? "Available on mobile"
            : guard.error
              ? "Check protection status"
              : !s
                ? "Checking this device…"
                : s.active
                  ? countLabel(s.count) + " protected"
                  : s.authorized && s.count
                    ? "Paused · " + countLabel(s.count) + " selected"
                    : "Manage your installed apps"}
        </small>
      </span>
      <ArrowRight size={19} />
    </button>
  );
}

export function Protection({ guard }: { guard: Guard }) {
  const { state, busy, error, act, refresh } = guard;
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    void refresh();
  }, []);
  const ios = platform === "ios";
  const device = ios ? "Screen Time" : "Accessibility";
  const ruleText = (rule: Rule) =>
    rule.mode === "whole"
      ? "Pause entire app"
      : rule.mode === "section"
        ? "Skip " + rule.section
        : "Allow everything";
  return (
    <>
      <div className="eyebrow">
        <Shield size={15} /> DEVICE CONTROLS
      </div>
      <h1>
        App protection<span>.</span>
      </h1>
      <p className="lede">
        {platform === "web"
          ? "Manage your installed apps from your phone."
          : ios
            ? "Shield the apps you choose on this device."
            : "Choose where to draw the line in your social apps."}
      </p>
      {platform === "web" ? (
        <div className="panel device-only">
          <Smartphone />
          <h2>On your phone</h2>
          <p>
            Android can skip short-video screens or pause an app. iPhone can
            shield selected apps with Screen Time.
          </p>
          <a href="https://github.com/shiv-eshwar/offrally/releases/tag/v1.1.0">
            Get the mobile build <ArrowRight size={16} />
          </a>
        </div>
      ) : (
        <>
          {state && (
            <div className={"guard-banner" + (state.active ? " live" : "")}>
              <div className="guard-banner-head">
                <span className="guard-icon">
                  {state.active ? <ShieldCheck /> : <Shield />}
                </span>
                <div>
                  <h2>{state.active ? "Protection on" : "Protection off"}</h2>
                  <small>
                    {!state.available
                      ? state.note
                      : !state.authorized
                        ? device + " access required"
                        : state.count
                          ? countLabel(state.count) + " selected"
                          : "Choose apps below"}
                  </small>
                </div>
              </div>
              {state.available &&
                (!state.authorized ? (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void act(() => native.requestAccess())}
                  >
                    Connect {device} <ArrowRight size={17} />
                  </button>
                ) : (
                  state.count > 0 && (
                    <button
                      className={state.active ? "secondary full" : "primary"}
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          native.setActive({ active: !state.active }),
                        )
                      }
                    >
                      {state.active ? "Pause protection" : "Turn on protection"}
                    </button>
                  )
                ))}
            </div>
          )}
          {!state && !error && <p role="status">Checking this device…</p>}
          {error && (
            <p className="notice" role="alert">
              {error}{" "}
              <button className="retry" onClick={() => void refresh()}>
                Refresh
              </button>
            </p>
          )}
          {state &&
            (ios ? (
              <div className="panel picker-panel">
                <h2>Selected apps</h2>
                <p>
                  Apple’s picker keeps your choices private. A shield covers
                  each selected app until you pause protection.
                </p>
                <button
                  className="secondary full"
                  disabled={busy || !state.authorized || !state.available}
                  onClick={() => void act(() => native.chooseApps())}
                >
                  {state.count ? "Edit selected apps" : "Choose apps"}
                </button>
              </div>
            ) : (
              <>
                <div className="section-head">
                  <h2>Your apps</h2>
                </div>
                <div className="rule-list">
                  {state.apps?.map((rule) => {
                    const Icon = symbols[rule.id];
                    const open = expanded === rule.id;
                    return (
                      <div className="rule-card" key={rule.id}>
                        <button
                          className="rule-heading"
                          aria-expanded={open}
                          aria-controls={"choices-" + rule.id}
                          onClick={() => setExpanded(open ? null : rule.id)}
                        >
                          <span className={"badge " + rule.id}>
                            <Icon />
                          </span>
                          <span>
                            <strong>{rule.name}</strong>
                            <small>
                              {ruleText(rule)}
                              {!rule.installed && " · Not installed"}
                            </small>
                          </span>
                          <ChevronDown
                            size={18}
                            className={open ? "rotated" : ""}
                          />
                        </button>
                        {open && (
                          <div
                            className="rule-choices"
                            id={"choices-" + rule.id}
                            role="group"
                            aria-label={rule.name + " protection rule"}
                          >
                            {(["allow", "section", "whole"] as const).map(
                              (mode) => (
                                <button
                                  key={mode}
                                  disabled={busy}
                                  aria-pressed={rule.mode === mode}
                                  onClick={() =>
                                    void act(() =>
                                      native.setMode({ id: rule.id, mode }),
                                    )
                                  }
                                >
                                  <span>{ruleText({ ...rule, mode })}</span>
                                  {rule.mode === mode && <Check size={16} />}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="footnote">
                  Skip leaves a recognized video screen when it opens. If an app
                  update changes that screen, you can pause the entire app.
                </p>
              </>
            ))}
        </>
      )}
    </>
  );
}
