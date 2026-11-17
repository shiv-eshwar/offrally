import { defaults } from "./domain.mjs";
export type Session = { start: number; goal: number };
export type Entry = Session & {
  elapsed: number;
  ended: number;
  outcome: string;
};
export type Flags = Record<keyof typeof defaults, boolean>;
type Data = {
  flags: Flags;
  minutes: number;
  active: Session | null;
  history: Entry[];
};
const key = "offrally.local.v1";
const empty = (): Data => ({
  flags: { ...defaults },
  minutes: 25,
  active: null,
  history: [],
});
export function read(): Data {
  try {
    const d = JSON.parse(localStorage.getItem(key) || "null");
    if (!d) return empty();
    const flags = { ...defaults };
    for (const k of Object.keys(flags) as (keyof Flags)[])
      if (typeof d.flags?.[k] === "boolean") flags[k] = d.flags[k];
    const active =
      d.active &&
      Number.isFinite(d.active.start) &&
      Number.isFinite(d.active.goal)
        ? d.active
        : null;
    return {
      flags,
      minutes:
        Number.isInteger(d.minutes) && d.minutes >= 1 && d.minutes <= 120
          ? d.minutes
          : 25,
      active,
      history: Array.isArray(d.history)
        ? d.history
            .filter(
              (e: Entry) =>
                e && Number.isFinite(e.elapsed) && Number.isFinite(e.ended),
            )
            .slice(0, 180)
        : [],
    };
  } catch {
    return empty();
  }
}
export function save(data: Data) {
  localStorage.setItem(key, JSON.stringify(data));
}
