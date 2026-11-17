// Run against a dedicated test deployment. Both seats stay active until the final eight seconds.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
const url = process.env.CLUB_TEST_URL;
if (!url) throw Error("Set CLUB_TEST_URL");
const players = [
  randomBytes(32).toString("hex"),
  randomBytes(32).toString("hex"),
];
let invite = "";
async function send(i, action) {
  const r = await fetch(url + "/api/round", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + players[i],
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      invite,
      duration: 1,
      nickname: i ? "Teal" : "Mint",
    }),
  });
  const room = await r.json();
  assert.equal(r.status, 200, JSON.stringify(room));
  return room;
}
invite = (await send(0, "create")).code;
let room = await send(1, "join");
while (room.stage === "running" && room.remainingMs > 5500) {
  await Promise.all([send(0, "beat"), send(1, "beat")]);
  await new Promise((r) => setTimeout(r, 2000));
  room = await send(0, "look");
}
assert.equal(room.stage, "running");
await Promise.all([send(0, "beat"), send(1, "beat")]);
room = await send(0, "look");
await new Promise((r) => setTimeout(r, room.remainingMs + 200));
const final = await send(0, "look");
assert.equal(final.stage, "finished");
assert.ok(final.hostMs > room.hostMs);
assert.ok(final.guestMs > room.guestMs);
const late = await send(1, "beat");
assert.equal(late.hostMs, final.hostMs);
assert.equal(late.guestMs, final.guestMs);
console.log(
  "Both active seats settled on first final read. Later beat preserved both scores.",
);
