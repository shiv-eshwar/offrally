// Two isolated browser contexts exercise the deployed mobile layouts with independent device identities.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const url = process.env.CLUB_TEST_URL;
if (!url) throw Error("Set CLUB_TEST_URL");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  await mkdir("artifacts", { recursive: true });
  const [c1, c2] = await Promise.all(
    [1, 2].map(() =>
      browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      }),
    ),
  );
  const [host, guest] = await Promise.all([c1.newPage(), c2.newPage()]);
  const errors = [];
  for (const p of [host, guest])
    p.on("pageerror", (e) => errors.push(e.message));
  await host.goto(url);
  await host.getByRole("heading", { name: "Focus club." }).waitFor();
  await host.getByRole("button", { name: "Protect", exact: true }).click();
  await host.getByRole("heading", { name: "On your phone" }).waitFor();
  assert.equal(
    await host
      .getByRole("button", {
        name: /Open Instagram|Open YouTube|Connect Accessibility/,
      })
      .count(),
    0,
  );
  await host.getByRole("button", { name: "Club", exact: true }).click();
  await host.getByRole("button", { name: "Start a focus lap" }).click();
  await host.getByRole("button", { name: "Start timer" }).click();
  await host.getByRole("button", { name: "End lap early" }).click();
  await host.getByRole("button", { name: "Log", exact: true }).click();
  await host.getByText("Ended early", { exact: true }).waitFor();
  await guest.goto(url);
  for (const p of [host, guest])
    await p.getByRole("button", { name: "Duels", exact: true }).click();
  await host.getByLabel("Your nickname").fill("Pace");
  await host.getByRole("button", { name: "1 min", exact: true }).click();
  await host.getByRole("button", { name: "Create a duel" }).click();
  const code = (
    await host.getByRole("button", { name: /Copy invite code/ }).innerText()
  ).trim();
  await guest.getByRole("button", { name: "Join room", exact: true }).click();
  await guest.getByLabel("Your nickname").fill("Tempo");
  await guest.getByLabel("Invite code").fill(code);
  await guest.getByRole("button", { name: "Join duel", exact: true }).click();
  await host.getByText("Tempo", { exact: true }).waitFor();
  await guest.getByText("Pace", { exact: true }).waitFor();
  await host.screenshot({ path: "artifacts/duel-web.png" });
  await host.getByRole("button", { name: "Club", exact: true }).click();
  await host.screenshot({ path: "artifacts/club-web.png" });
  assert.equal(
    await host.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Two-browser UI pass: mobile protection availability, timer, history, create, join, live scoreboard, mobile width.",
  );
} finally {
  await browser.close();
}
