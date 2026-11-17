// Use a disposable emulator with the local test-only APKs and Accessibility connected.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const serial = process.env.ANDROID_SERIAL;
assert.match(serial || "", /^emulator-\d+$/);
const adb = (...args) =>
  execFileSync(process.env.ADB || "adb", ["-s", serial, ...args], {
    encoding: "utf8",
  }).trim();
const shell = (...args) => adb("shell", ...args);
assert.equal(shell("getprop", "ro.kernel.qemu"), "1");
const sections = [
  ["Instagram", "Reels", "com.instagram.android"],
  ["YouTube", "Shorts", "com.google.android.youtube"],
  ["Facebook", "Reels", "com.facebook.katana"],
  ["Snapchat", "Spotlight", "com.snapchat.android"],
  ["TikTok", "For You", "com.zhiliaoapp.musically"],
];
const reddit = "com.reddit.frontpage";
const custom = "app.offrally.qafixture.other";
for (const pkg of [...sections.map(([, , pkg]) => pkg), reddit, custom]) {
  const info = shell("dumpsys", "package", pkg);
  assert.match(info, /versionName=fixture\b/);
  assert.match(info, /TEST_ONLY/);
}
const top = () =>
  shell("dumpsys", "activity", "activities")
    .split("\n")
    .find((row) => row.includes("topResumedActivity=")) || "";
const launcher = shell(
  "cmd",
  "package",
  "resolve-activity",
  "--brief",
  "-a",
  "android.intent.action.MAIN",
  "-c",
  "android.intent.category.HOME",
)
  .split("\n")
  .at(-1)
  .split("/")[0];
const overlay = () => {
  const dump = shell("dumpsys", "accessibility");
  const match = dump.match(
    /A11yWindow\[AccessibilityWindowInfo\[title=Offrally protection,[^\n]*?bounds=Rect\((-?\d+), (-?\d+) - (-?\d+), (-?\d+)\)/,
  );
  return match && match.slice(1).map(Number);
};
const contains = (box, [x, y]) =>
  box && x >= box[0] && x < box[2] && y >= box[1] && y < box[3];
async function until(fn, message) {
  for (let i = 0; i < 50; i++) {
    if (fn()) return;
    await delay(80);
  }
  throw Error(message + " (" + top() + ")");
}
async function screen(pkg, kind = "ordinary") {
  const ticket = randomUUID();
  shell(
    "am",
    "start",
    "-S",
    "-n",
    pkg + "/app.offrally.qafixture.Screen",
    "--es",
    "screen",
    kind,
    "--es",
    "ticket",
    ticket,
  );
  const events = () =>
    adb("logcat", "-d", "-s", "OffrallyFixture:I")
      .split("\n")
      .filter((line) => line.includes(pkg + " " + ticket + " "))
      .map((line) => line.split(ticket + " ")[1]);
  await until(() => events().includes(kind), pkg + " did not open " + kind);
  function point(key) {
    const row = events().findLast((line) => line.startsWith(key + " "));
    assert.ok(row, key + " unavailable");
    return row.split(" ").slice(1).map(Number);
  }
  return { events, point };
}
function tap([x, y]) {
  shell("input", "tap", String(x), String(y));
}
async function checkTab(pkg, kind = "ordinary") {
  const { events, point } = await screen(pkg, kind);
  await until(
    () =>
      events().some((s) => s.startsWith("targetPoint ")) &&
      contains(overlay(), point("targetPoint")),
    "Tab cover missing for " + pkg,
  );
  const box = overlay();
  for (const key of ["bodyPoint", "safePoint", "rightPoint"])
    assert.ok(!contains(box, point(key)), key + " covered");
  tap(point("targetPoint"));
  tap(point("safePoint"));
  await until(
    () => events().includes("neighborTap"),
    "Neighbor must be usable",
  );
  assert.ok(
    !events().includes("targetTap") && !events().includes("viewer"),
    "A tap reached the covered tab",
  );
}
async function whole(pkg) {
  const { events, point } = await screen(pkg);
  await until(
    () =>
      events().some((s) => s.startsWith("bodyPoint ")) &&
      contains(overlay(), point("bodyPoint")),
    pkg + " shield missing",
  );
  const box = overlay();
  // Tap an ordinary part of the shield, away from its deliberate Home action.
  tap([box[0] + 25, box[1] + 40]);
  await delay(1050);
  assert.ok(
    top().includes(pkg + "/") && contains(overlay(), point("bodyPoint")),
    "Shield must stay until the user leaves",
  );
  assert.ok(
    !events().some((item) => item.endsWith("Tap")),
    "Tap passed through shield",
  );
  return box;
}

function setting(group, key, value) {
  if (value === "null" || value === "") shell("settings", "delete", group, key);
  else shell("settings", "put", group, key, value);
}

async function rotateTab(pkg) {
  const auto = shell("settings", "get", "system", "accelerometer_rotation");
  const rotation = shell("settings", "get", "system", "user_rotation");
  const { events, point } = await screen(pkg);
  await until(
    () =>
      events().some((s) => s.startsWith("targetPoint ")) &&
      contains(overlay(), point("targetPoint")),
    "Initial tab missing",
  );
  const initial = point("targetPoint");
  try {
    setting("system", "accelerometer_rotation", "0");
    setting("system", "user_rotation", rotation === "1" ? "0" : "1");
    await until(
      () =>
        point("targetPoint")[0] !== initial[0] &&
        contains(overlay(), point("targetPoint")),
      "Tab did not follow rotation",
    );
    tap(point("targetPoint"));
    tap(point("safePoint"));
    await until(
      () => events().includes("neighborTap"),
      "Neighbor should work after rotation",
    );
    assert.ok(!events().includes("targetTap"));
  } finally {
    setting("system", "user_rotation", rotation);
    setting("system", "accelerometer_rotation", auto);
  }
}

async function revokeAndRestore() {
  const key = "enabled_accessibility_services";
  const enabled = shell("settings", "get", "secure", key);
  const services = enabled.split(":");
  const others = services.filter((s) => !s.startsWith("app.offrally.club/"));
  assert.ok(others.length < services.length);
  try {
    setting("secure", key, others.join(":"));
    await until(
      () => !overlay(),
      "Revoking Accessibility must remove the shield",
    );
  } finally {
    setting("secure", key, enabled);
  }
  await until(
    () => overlay(),
    "Reconnecting should restore the rule on the current window",
  );
}

const browser = await chromium.connectOverCDP(
  process.env.WEBVIEW_CDP || "http://127.0.0.1:19330",
  { noDefaults: true },
);
try {
  const p = browser
    .contexts()[0]
    .pages()
    .find((page) => page.url().startsWith("https://localhost"));
  p.setDefaultTimeout(7000);
  async function guard() {
    shell("am", "start", "-n", "app.offrally.club/.MainActivity");
    await until(
      () => !overlay() && top().includes("app.offrally.club/"),
      "Overlay did not leave with app",
    );
    await p.getByRole("button", { name: "Protect", exact: true }).click();
  }
  async function choices(name) {
    const header = p.getByRole("button", {
      name: new RegExp("^" + name + " "),
    });
    if ((await header.getAttribute("aria-expanded")) !== "true")
      await header.click();
    return p.getByRole("group", { name: name + " protection rule" });
  }
  async function mode(name, label) {
    const choice = (await choices(name)).getByRole("button", {
      name: label,
      exact: true,
    });
    await choice.click();
    await p.waitForFunction(
      (el) => el.getAttribute("aria-pressed") === "true",
      await choice.elementHandle(),
    );
  }
  await guard();
  const pause = p.getByRole("button", {
    name: "Pause protection",
    exact: true,
  });
  if (await pause.isVisible()) await pause.click();
  for (const [name, section] of sections) await mode(name, "Skip " + section);
  for (const name of [
    "Reddit",
    "X",
    "Threads",
    "Twitch",
    "Pinterest",
    "Discord",
  ]) {
    assert.equal(await (await choices(name)).getByRole("button").count(), 2);
  }
  await mode("Reddit", "Pause entire app");
  if (
    !(await p.getByRole("button", { name: /^Offrally QA fixture / }).count())
  ) {
    await p.getByRole("button", { name: "Add another installed app" }).click();
    await p
      .getByRole("button", { name: "Offrally QA fixture", exact: true })
      .click();
  }
  await p
    .getByRole("button", { name: "Turn on protection", exact: true })
    .click();
  await p.getByRole("heading", { name: "Protection on" }).waitFor();
  for (const [name, , pkg] of sections) {
    await checkTab(pkg);
    if (name === "Facebook") await checkTab(pkg, "bottom");
    const { events } = await screen(pkg, "viewer");
    await until(
      () => events().includes("home") && top().includes(pkg + "/"),
      name + " viewer should return to app home",
    );
    if (["Instagram", "YouTube", "Facebook"].includes(name)) {
      const linked = await screen(pkg, "link");
      await until(
        () => linked.events().includes("home"),
        name + " standalone viewer should leave",
      );
    }
    if (name === "TikTok") {
      const sticky = await screen(pkg, "sticky");
      await until(
        () => sticky.events().includes("home"),
        "An ignored tab action should fall back to Back",
      );
    }
    await screen(pkg, "article");
    await until(
      () => !overlay() && top().includes(pkg + "/"),
      "Ordinary screen still covered",
    );
    await delay(150);
    assert.equal(
      overlay(),
      null,
      name + " ordinary article should remain uncovered",
    );
    console.log(name + " covered only its tab and left the recognized viewer.");
  }
  await rotateTab(sections[1][2]);
  await guard();
  for (const [name] of sections) await mode(name, "Pause entire app");
  for (const pkg of [...sections.map(([, , pkg]) => pkg), reddit, custom])
    await whole(pkg);
  shell("cmd", "statusbar", "expand-notifications");
  try {
    await until(() => !overlay(), "Shield covered the notification shade");
  } finally {
    shell("cmd", "statusbar", "collapse");
  }
  await until(() => overlay(), "Shield missing after closing the shade");
  await revokeAndRestore();
  const box = overlay();
  const density = Number(shell("wm", "density").match(/(\d+)\s*$/)[1]) / 160;
  tap([
    Math.round((box[0] + box[2]) / 2),
    Math.round((box[1] + box[3]) / 2 + 39 * density),
  ]);
  await until(
    () => top().includes(launcher + "/") && !overlay(),
    "Home action did not leave the shield",
  );
  await guard();
  await pause.click();
  await p.getByRole("heading", { name: "Protection off" }).waitFor();
  for (const pkg of [...sections.map(([, , pkg]) => pkg), reddit, custom]) {
    const { events, point } = await screen(pkg);
    await until(
      () => events().some((s) => s.startsWith("targetPoint ")) && !overlay(),
      "Paused cover still present",
    );
    tap(point("targetPoint"));
    await until(
      () => events().includes("viewer"),
      "Pausing must restore the native button",
    );
  }
  await guard();
  for (const [name] of sections) await mode(name, "Allow everything");
  await mode("Reddit", "Allow everything");
  await (
    await choices("Offrally QA fixture")
  )
    .getByRole("button", { name: "Allow everything" })
    .click();
  await p
    .getByRole("button", { name: /^Offrally QA fixture / })
    .waitFor({ state: "detached" });
  assert.equal(
    await p.getByRole("button", { name: "Turn on protection" }).count(),
    0,
  );
  console.log(
    "Whole-app shields, custom picker, Home, pause, and clearing rules passed.",
  );
} finally {
  await browser.close();
}
