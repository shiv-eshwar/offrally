// Run only in a disposable emulator with the four local, test-only fixture APKs installed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
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
const cases = [
  ["Instagram", "Reels", "com.instagram.android"],
  ["YouTube", "Shorts", "com.google.android.youtube"],
  ["Snapchat", "Spotlight", "com.snapchat.android"],
  ["TikTok", "For You", "com.zhiliaoapp.musically"],
];
for (const [, , pkg] of cases) {
  const installed = shell("dumpsys", "package", pkg);
  assert.match(installed, /versionName=fixture\b/);
  assert.match(installed, /TEST_ONLY/);
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
assert.ok(launcher.includes("."));
async function until(fn, message) {
  for (let i = 0; i < 30; i++) {
    if (fn()) return;
    await delay(120);
  }
  throw Error(message + " (" + top() + ")");
}
const browser = await chromium.connectOverCDP(
  process.env.WEBVIEW_CDP || "http://127.0.0.1:19330",
  { noDefaults: true },
);
try {
  const p = browser
    .contexts()[0]
    .pages()
    .find((p) => p.url().startsWith("https://localhost"));
  p.setDefaultTimeout(7000);
  async function guard() {
    shell("am", "start", "-n", "app.offrally.club/.MainActivity");
    await p.getByRole("button", { name: "Protect", exact: true }).click();
    await p.getByRole("heading", { name: "App protection." }).waitFor();
  }
  async function mode(name, label) {
    const header = p.getByRole("button", {
      name: new RegExp("^" + name + " "),
    });
    if ((await header.getAttribute("aria-expanded")) !== "true")
      await header.click();
    const choice = p
      .getByRole("group", { name: name + " protection rule" })
      .getByRole("button", { name: label, exact: true });
    await choice.click();
    await p.waitForFunction(
      (el) => el.getAttribute("aria-pressed") === "true",
      await choice.elementHandle(),
    );
  }
  async function screen(pkg, kind, outcome) {
    if (outcome === "launcher") {
      await guard();
      await until(
        () => top().includes("app.offrally.club/"),
        "Expected Offrally before launch",
      );
    }
    const ticket = randomUUID();
    const launch = shell(
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
    assert.ok(
      launch.includes(pkg + "/app.offrally.qafixture.Screen") &&
        !launch.includes("Error:"),
      launch,
    );
    const logged = (state) =>
      adb("logcat", "-d", "-s", "OffrallyFixture:I").includes(
        pkg + " " + ticket + " " + state,
      );
    // A whole-package rule may send the splash window Home before Activity.onCreate.
    if (outcome !== "launcher")
      await until(() => logged(kind), pkg + " did not open " + kind);
    if (outcome === "back") {
      await until(
        () => logged("home") && top().includes(pkg + "/"),
        pkg + " should return to its own home screen",
      );
    } else if (outcome === "launcher") {
      await until(
        () => top().includes(launcher + "/"),
        pkg + " should leave to Android Home",
      );
    } else {
      await delay(1450);
      assert.ok(
        top().includes(pkg + "/"),
        pkg + " should stay in the foreground",
      );
      if (kind !== "home")
        assert.equal(
          logged("home"),
          false,
          pkg + " was unexpectedly sent back",
        );
    }
  }
  await guard();
  // Each run starts paused; opt in with the actual Android permission dialog first.
  const pause = p.getByRole("button", {
    name: "Pause protection",
    exact: true,
  });
  if (await pause.isVisible()) await pause.click();
  for (const [name, section] of cases) await mode(name, "Skip " + section);
  await screen(cases[0][2], "viewer", "stay");
  await guard();
  await p
    .getByRole("button", { name: "Turn on protection", exact: true })
    .click();
  await p.getByRole("heading", { name: "Protection on" }).waitFor();
  for (const [name, , pkg] of cases) {
    await screen(pkg, "ordinary", "stay");
    await screen(pkg, "viewer", "back");
    console.log(
      name + ": ordinary page allowed, selected section returned to app home",
    );
  }
  await guard();
  for (const [name] of cases) await mode(name, "Pause entire app");
  for (const [name, , pkg] of cases) {
    await screen(pkg, "ordinary", "launcher");
    console.log(name + ": whole-app rule returned to Android Home");
  }
  await guard();
  for (const [name, section] of cases.slice(0, 3))
    await mode(name, "Skip " + section);
  const header = p.getByRole("button", { name: /^Snapchat / });
  if ((await header.getAttribute("aria-expanded")) === "true")
    await header.click();
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/android-app-protection.png",
    execFileSync(
      process.env.ADB || "adb",
      ["-s", serial, "exec-out", "screencap", "-p"],
      { maxBuffer: 8 * 1024 * 1024 },
    ),
  );
  await pause.click();
  await p.getByRole("heading", { name: "Protection off" }).waitFor();
  for (const [, , pkg] of cases) await screen(pkg, "viewer", "stay");
  await guard();
  for (const [name] of cases) await mode(name, "Allow everything");
  assert.equal(
    await p
      .getByRole("button", { name: "Turn on protection", exact: true })
      .count(),
    0,
  );
  console.log(
    "Pause restored access for all four apps. Clearing every rule removed the enable action.",
  );
} finally {
  await browser.close();
}
