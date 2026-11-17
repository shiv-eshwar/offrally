import { useState } from "react";
import {
  ArrowUpRight,
  SlidersHorizontal,
  Youtube,
  Instagram,
} from "lucide-react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { catalogs } from "./domain.mjs";
import type { Flags } from "./store";
export type Site = keyof typeof catalogs;
const browser = registerPlugin<{
  open(options: { site: Site; flags: Flags }): Promise<void>;
}>("ClubBrowser");
export function Badge({ site }: { site: Site }) {
  return (
    <span className={"badge " + site}>
      {site === "instagram" ? <Instagram /> : <Youtube />}
    </span>
  );
}
export function Feeds({
  flags,
  change,
  initial,
}: {
  flags: Flags;
  change: (key: keyof Flags) => void;
  initial: Site;
}) {
  const [site, pick] = useState(initial),
    [note, setNote] = useState("");
  const c = catalogs[site];
  async function open() {
    if (!Capacitor.isNativePlatform()) {
      setNote("Open Offrally on iOS or Android to browse with these filters.");
      return;
    }
    try {
      await browser.open({ site, flags });
      setNote("");
    } catch {
      setNote("Could not open this feed. Try again.");
    }
  }
  return (
    <>
      <div className="eyebrow">
        <SlidersHorizontal size={15} /> FEED STUDIO
      </div>
      <h1>
        Your feeds<span>.</span>
      </h1>
      <p className="lede">Choose what shows up inside Offrally.</p>
      <div className="seg">
        {(Object.keys(catalogs) as Site[]).map((s) => (
          <button
            aria-pressed={site === s}
            key={s}
            onClick={() => {
              pick(s);
              setNote("");
            }}
          >
            {s === "instagram" ? <Instagram /> : <Youtube />}
            {catalogs[s].name}
          </button>
        ))}
      </div>
      <div className="panel toggles">
        <div className="panel-head">
          <Badge site={site} />
          <div>
            <h2>{c.name}</h2>
            <small>Feed controls</small>
          </div>
        </div>
        {c.items.map(([id, title, description]) => (
          <button
            className="toggle-row"
            key={id}
            role="switch"
            aria-checked={flags[id as keyof Flags]}
            onClick={() => change(id as keyof Flags)}
          >
            <span>
              <strong>Hide {title}</strong>
              <small>{description}</small>
            </span>
            <i className={"switch " + (flags[id as keyof Flags] ? "on" : "")} />
          </button>
        ))}
      </div>
      <button className="primary" onClick={open}>
        Open {c.name}
        <ArrowUpRight />
      </button>
      {note && (
        <p role="status" className="notice">
          {note}
        </p>
      )}
      <p className="footnote">
        Filters apply to the website opened here. You can still use the original
        apps separately.
      </p>
    </>
  );
}
