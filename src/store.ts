export type Session = { start: number; goal: number };
export type Entry = Session & {
  elapsed: number;
  ended: number;
  outcome: string;
};
type Data = {
  minutes: number;
  active: Session | null;
  history: Entry[];
};
const key = "offrally.local.v1";
const empty = (): Data => ({
  minutes: 25,
  active: null,
  history: [],
});
export function read(): Data {
  try {
    const d = JSON.parse(localStorage.getItem(key) || "null");
    if (!d) return empty();
    const active =
      d.active &&
      Number.isFinite(d.active.start) &&
      Number.isFinite(d.active.goal)
        ? d.active
        : null;
    return {
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
