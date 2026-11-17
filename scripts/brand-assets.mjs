// Render first-party vector art at the native templates' existing pixel sizes.
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const mark = await fs.readFile("public/mark.svg", "utf8");
  async function walk(dir) {
    const all = [];
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) all.push(...(await walk(p)));
      else if (p.endsWith(".png")) all.push(p);
    }
    return all;
  }
  const files = [
    ...(await walk("android/app/src/main/res")),
    ...(await walk("ios/App/App/Assets.xcassets")),
  ];
  for (const p of files) {
    const png = await fs.readFile(p);
    const w = png.readUInt32BE(16),
      h = png.readUInt32BE(20);
    const splash = p.toLowerCase().includes("splash");
    const size = splash
      ? Math.min(w, h) * 0.2
      : p.includes("foreground")
        ? w * 0.58
        : w * 0.77;
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      "<style>*{margin:0}body{height:100vh;display:grid;place-items:center;background:" +
        (splash ? "#151620" : "#c5fa70") +
        "}svg{width:" +
        size +
        "px;height:" +
        size +
        "px}</style>" +
        mark,
    );
    await page.screenshot({ path: p });
  }
} finally {
  await browser.close();
}
