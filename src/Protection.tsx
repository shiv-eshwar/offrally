import { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  ArrowRight,
  AtSign,
  Check,
  ChevronDown,
  Facebook,
  Ghost,
  Hash,
  Instagram,
  MessageCircle,
  MessagesSquare,
  Music2,
  Pin,
  Shield,
  ShieldCheck,
  Smartphone,
  Twitch,
  Youtube,
} from "lucide-react";

type Mode = "allow" | "section" | "whole";
type Rule = {
  id: string;
  name: string;
  section?: string;
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
  otherApps(): Promise<{ apps: Pick<Rule, "id" | "name">[] }>;
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
const symbols: Record<string, typeof Smartphone> = {
  instagram: Instagram,
  youtube: Youtube,
  snapchat: Ghost,
  tiktok: Music2,
  facebook: Facebook,
  reddit: MessageCircle,
  x: Hash,
  threads: AtSign,
  twitch: Twitch,
  pinterest: Pin,
  discord: MessagesSquare,
};
const countLabel = (n: number) => n + (n === 1 ? " app" : " apps");

function OtherAppPicker({ guard }: { guard: Guard }) {
  const [apps, setApps] = useState<Pick<Rule, "id" | "name">[] | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    setLoading(true);
    setError("");
    setFilter("");
    try {
      setApps((await native.otherApps()).apps);
    } catch {
      setError("Could not load installed apps. Try again.");
    } finally {
      setLoading(false);
    }
  }
  if (apps === null)
    return (
      <>
        <button
          className="secondary full other-apps"
          disabled={loading || guard.busy}
          onClick={() => void open()}
        >
          {loading ? "Loading apps…" : "Add another installed app"}
        </button>
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
      </>
    );
  const visible = apps.filter((app) =>
    app.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <div className="panel picker-panel">
      <h2>Pause another app</h2>
      <p>Choose an installed app to add a whole-app rule.</p>
      <input
        type="search"
        aria-label="Search installed apps"
        placeholder="Search installed apps"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <div className="rule-choices other-app-choices">
        {visible.map((app) => (
          <button
            disabled={guard.busy}
            key={app.id}
            onClick={() => {
              setApps(null);
              void guard.act(() =>
                native.setMode({ id: app.id, mode: "whole" }),
              );
            }}
          >
            {app.name}
          </button>
        ))}
        {visible.length === 0 && (
          <p>
            {apps.length
              ? "No matching apps."
              : "No more eligible apps installed."}
          </p>
        )}
      </div>
      <button className="secondary full" onClick={() => setApps(null)}>
        Cancel
      </button>
    </div>
  );
}

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
                    const Icon = symbols[rule.id] ?? Smartphone;
                    const modes: Mode[] = rule.section
                      ? ["allow", "section", "whole"]
                      : ["allow", "whole"];
                    const open = expanded === rule.id;
                    return (
                      <div className="rule-card" key={rule.id}>
                        <button
                          className="rule-heading"
                          aria-expanded={open}
                          aria-controls={"choices-" + rule.id}
                          onClick={() => setExpanded(open ? null : rule.id)}
                        >
                          <span
                            className={
                              "badge " + (symbols[rule.id] ? rule.id : "")
                            }
                          >
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
                            {modes.map((mode) => (
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
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <OtherAppPicker guard={guard} />
                <p className="footnote">
                  Skip covers recognized feed tabs and leaves the feed if you
                  open it another way. Coverage depends on the app’s layout and
                  language. A whole-app rule shows a pause screen when you open
                  the app.
                </p>
              </>
            ))}
        </>
      )}
    </>
  );
}
