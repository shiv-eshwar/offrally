import { chromium } from "@playwright/test";
const browser = await chromium.connectOverCDP(
  process.env.WEBVIEW_CDP || "http://127.0.0.1:19330",
  { noDefaults: true },
);
try {
  const context = browser.contexts()[0];
  const page = context
    .pages()
    .find((p) => p.url().startsWith("https://localhost"));
  await page.getByRole("heading", { name: "Focus club." }).waitFor();
  await page.screenshot({ path: "artifacts/clubhouse-android.png" });
  await page.getByRole("button", { name: "Start a focus lap" }).click();
  await page.getByRole("button", { name: "1 min", exact: true }).click();
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.getByRole("button", { name: "End lap early" }).click();
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByText("Ended early", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Feeds", exact: true }).click();
  await page.getByRole("button", { name: "YouTube", exact: true }).click();
  const toggle = page.getByRole("switch", { name: /Hide Shorts/ });
  await toggle.click();
  await toggle.click();
  await page.getByRole("button", { name: "Open YouTube" }).click();
  await new Promise((r) => setTimeout(r, 3500));
  console.log(
    "Visited native shell, timer, log and feed controls. Native browser launch requested.",
  );
} finally {
  await browser.close();
}
