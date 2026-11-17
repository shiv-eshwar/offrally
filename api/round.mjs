import postgres from "postgres";
import { createHash } from "node:crypto";

let connection;
const actions = new Set(["create", "join", "look", "beat", "rest"]);
export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (
    origin === "capacitor://localhost" ||
    origin === "https://localhost" ||
    origin === "http://localhost" ||
    origin === "https://" + req.headers.host
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).end();
  const bearer = /^Bearer ([a-f0-9]{64})$/.exec(
    req.headers.authorization || "",
  );
  if (!bearer)
    return res.status(401).json({ error: "Device identity required." });
  const { action, invite = "", nickname = "", duration = 5 } = req.body || {};
  if (
    !actions.has(action) ||
    typeof invite !== "string" ||
    invite.length > 10 ||
    typeof nickname !== "string" ||
    nickname.length > 20 ||
    ![1, 5, 15, 25].includes(duration)
  )
    return res.status(400).json({ error: "Check the room details." });
  // An installation owns a random 256-bit bearer secret. Only its irreversible identifier goes into Postgres.
  const actor = createHash("sha256")
    .update(bearer[1])
    .digest("hex")
    .slice(0, 32);
  try {
    connection ??= postgres(process.env.CLUB_DATABASE_URL, {
      max: 2,
      prepare: false,
      ssl: "require",
      idle_timeout: 10,
      connect_timeout: 8,
    });
    const state = await connection.begin(async (sql) => {
      await sql`select set_config('request.jwt.claim.sub', ${actor}, true)`;
      const [row] =
        await sql`select public.club_round(${action}, ${invite}, ${nickname}, ${duration}) as room`;
      return row.room;
    });
    return res.status(200).json(state);
  } catch (error) {
    if (error.code === "P0001")
      return res.status(400).json({ error: error.message });
    console.error(
      "round service",
      String(error.code || "unavailable").slice(0, 32),
    );
    return res
      .status(503)
      .json({ error: "Round service unavailable. Try again shortly." });
  }
}
