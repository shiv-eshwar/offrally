// Opt-in live test. Creates a private one-minute round on the selected deployment.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
const base = process.env.CLUB_TEST_URL;
if (!base) throw Error("Set CLUB_TEST_URL to the deployment under test.");
const [a, b, outsider] = Array.from({ length: 3 }, () =>
  randomBytes(32).toString("hex"),
);
async function call(id, action, invite = "", nickname = "") {
  const r = await fetch(base + "/api/round", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + id,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, invite, nickname, duration: 1 }),
  });
  return { status: r.status, body: await r.json() };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const create = await call(a, "create", "", "Orbit");
assert.equal(create.status, 200, JSON.stringify(create.body));
const { code } = create.body;
assert.equal(create.body.stage, "waiting");
assert.equal((await call(outsider, "look", code)).status, 400);
assert.equal((await call(b, "join", code, "Comet")).body.seat, "guest");
assert.equal((await call(outsider, "join", code, "Extra")).status, 400);
await call(a, "beat", code);
await call(b, "beat", code);
await wait(1250);
const score = (await call(a, "beat", code)).body.hostMs;
assert.ok(score >= 1000 && score < 8000);
await call(a, "rest", code);
const frozen = (await call(a, "look", code)).body.hostMs;
await wait(8400);
assert.equal((await call(b, "beat", code)).body.guestMs, 0);
assert.equal((await call(a, "beat", code)).body.hostMs, frozen);
console.log(
  "Two seats admitted. Third player denied. Server clock scored focus and excluded inactive time.",
);
await wait(52000);
const done = (await call(b, "look", code)).body;
assert.equal(done.stage, "finished");
assert.ok(done.hostMs > done.guestMs);
console.log(
  "One-minute live duel finished. Winner and totals consistent on both devices.",
);
assert.equal((await call(a, "look", code)).body.hostMs, done.hostMs);
