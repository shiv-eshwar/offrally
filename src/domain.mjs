export function startSession(minutes, now = Date.now()) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120)
    throw Error("Choose 1–120 minutes.");
  return { start: now, goal: minutes * 60000 };
}
export function result(s, now, reason) {
  const elapsed = Math.max(0, Math.min(s.goal, now - s.start));
  return {
    ...s,
    elapsed,
    ended: now,
    outcome:
      reason === "deadline" && elapsed === s.goal ? "finished" : "interrupted",
  };
}
export function displayTime(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return (
    String(Math.floor(sec / 60)).padStart(2, "0") +
    ":" +
    String(sec % 60).padStart(2, "0")
  );
}
