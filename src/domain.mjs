export const catalogs = {
  instagram: {
    name: "Instagram",
    slug: "IG",
    items: [
      ["reels", "Reels", "Hide the tab, reel links and reel feeds."],
      ["explore", "Explore", "Hide the discovery grid and its entry points."],
      ["stories", "Stories", "Hide the story tray and story links."],
    ],
  },
  youtube: {
    name: "YouTube",
    slug: "YT",
    items: [
      ["shorts", "Shorts", "Hide the Shorts tab, shelves and short videos."],
      ["home", "Home feed", "Open Subscriptions instead of recommendations."],
      ["related", "Up next", "Hide related videos under the player."],
      ["comments", "Comments", "Hide comments below videos."],
    ],
  },
};
export const defaults = {
  reels: true,
  explore: false,
  stories: false,
  shorts: true,
  home: false,
  related: false,
  comments: false,
};
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
