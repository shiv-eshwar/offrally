import { Capacitor } from "@capacitor/core";
export type Room = {
  code: string;
  minutes: number;
  stage: "waiting" | "running" | "finished" | "expired";
  seat: "host" | "guest";
  host: string;
  guest: string | null;
  hostMs: number;
  guestMs: number;
  remainingMs: number;
};
export type Action = "create" | "join" | "look" | "beat" | "rest";
function token() {
  let id = localStorage.getItem("club.device");
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join("");
    localStorage.setItem("club.device", id);
  }
  return id;
}
export async function request(
  action: Action,
  invite = "",
  nickname = "",
  duration = 5,
): Promise<Room> {
  const base = Capacitor.isNativePlatform()
    ? "https://offrally.vercel.app"
    : "";
  const res = await fetch(base + "/api/round", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, invite, nickname, duration }),
    signal: AbortSignal.timeout(12000),
  });
  const json = await res
    .json()
    .catch(() => ({ error: "Round service unavailable." }));
  if (!res.ok) throw Error(json.error);
  return json;
}
