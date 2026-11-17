import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/policy", { recursive: true });
for (const name of ["rules.json", "filter.js"])
  await copyFile("policy/" + name, "public/policy/" + name);
