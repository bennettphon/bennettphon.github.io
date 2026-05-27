const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}

function cleanName(value) {
  const name = String(value || "anonymous").trim().slice(0, 80);
  return name || "anonymous";
}

function cleanStrategy(value) {
  if (value === undefined || value === null) return null;
  const text = JSON.stringify(value);
  return text.length > 50000 ? text.slice(0, 50000) : text;
}

function assertEntry(body) {
  const type = String(body.type || "");
  if (type !== "classical" && type !== "quantum") throw new Error("type must be classical or quantum");

  const value = Number(body.value);
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error("value must be a number between 0 and 1");

  const ringId = String(body.ringId || body.ring_id || "").trim().slice(0, 80);
  if (!ringId) throw new Error("ringId is required");

  const wins = body.wins === undefined || body.wins === null ? null : Number(body.wins);
  const total = body.total === undefined || body.total === null ? null : Number(body.total);
  if (wins !== null && (!Number.isInteger(wins) || wins < 0)) throw new Error("wins must be a nonnegative integer");
  if (total !== null && (!Number.isInteger(total) || total < 1)) throw new Error("total must be a positive integer");
  if (wins !== null && total !== null && wins > total) throw new Error("wins cannot exceed total");
  const simWins = body.simWins === undefined || body.simWins === null ? null : Number(body.simWins);
  const simTotal = body.simTotal === undefined || body.simTotal === null ? null : Number(body.simTotal);
  const simValue = body.simValue === undefined || body.simValue === null ? null : Number(body.simValue);
  if (simWins !== null && (!Number.isInteger(simWins) || simWins < 0)) throw new Error("simWins must be a nonnegative integer");
  if (simTotal !== null && (!Number.isInteger(simTotal) || simTotal < 1)) throw new Error("simTotal must be a positive integer");
  if (simWins !== null && simTotal !== null && simWins > simTotal) throw new Error("simWins cannot exceed simTotal");
  if (simValue !== null && (!Number.isFinite(simValue) || simValue < 0 || simValue > 1)) throw new Error("simValue must be between 0 and 1");

  return {
    type,
    ringId,
    ringName: String(body.ringName || body.ring_name || ringId).trim().slice(0, 120),
    playerName: cleanName(body.name || body.player_name),
    value,
    wins,
    total,
    simWins,
    simTotal,
    simValue,
    strategyJson: cleanStrategy(body.strategy)
  };
}

async function listEntries(request, env) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const ringId = url.searchParams.get("ringId") || url.searchParams.get("ring_id");
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);

  if (type !== "classical" && type !== "quantum") return json({ error: "type must be classical or quantum" }, 400);
  if (!ringId) return json({ error: "ringId is required" }, 400);

  const result = await env.DB.prepare(
    `SELECT id, type, ring_id AS ringId, ring_name AS ringName,
            player_name AS name, value, wins, total,
            sim_wins AS simWins, sim_total AS simTotal, sim_value AS simValue,
            created_at AS date
       FROM leaderboard_entries
      WHERE type = ? AND ring_id = ?
      ORDER BY value DESC, created_at ASC
      LIMIT ?`
  ).bind(type, ringId, limit).all();

  return json({ entries: result.results || [] });
}

async function createEntry(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: "invalid JSON" }, 400);
  }

  let entry;
  try {
    entry = assertEntry(body);
  } catch (err) {
    return json({ error: err.message }, 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO leaderboard_entries
       (type, ring_id, ring_name, player_name, value, wins, total, sim_wins, sim_total, sim_value, strategy_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    entry.type,
    entry.ringId,
    entry.ringName,
    entry.playerName,
    entry.value,
    entry.wins,
    entry.total,
    entry.simWins,
    entry.simTotal,
    entry.simValue,
    entry.strategyJson
  ).run();

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") return json({ ok: true });

    if (url.pathname === "/leaderboard") {
      if (request.method === "GET") return listEntries(request, env);
      if (request.method === "POST") return createEntry(request, env);
    }

    return json({ error: "not found" }, 404);
  }
};
