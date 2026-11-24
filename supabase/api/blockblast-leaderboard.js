"use strict";

const { createHmac } = require("node:crypto");

const scoreTable = "/rest/v1/blockblast_daily_scores";
const firstPuzzleDate = "2026-04-20";
const playerIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function parseBody(rawBody) {
  if (rawBody && typeof rawBody === "object" && !Buffer.isBuffer(rawBody)) {
    return rawBody;
  }

  const text = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody || "");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getClientIp(request) {
  const headers = request.headers || {};
  const forwarded = headers["x-forwarded-for"];
  const forwardedIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
  const realIp = headers["x-real-ip"];
  return (typeof realIp === "string" && realIp.trim()) ||
    forwardedIp ||
    request.socket?.remoteAddress ||
    "unknown";
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function isRateLimited(request, baseUrl, headers, serviceRoleKey, signal) {
  const ipHash = createHmac("sha256", serviceRoleKey)
    .update(getClientIp(request))
    .digest("hex");
  const response = await fetch(`${baseUrl}/rest/v1/rpc/consume_blockblast_rate_limit`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ p_ip_hash: ipHash }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Supabase leaderboard rate-limit check failed with HTTP ${response.status}.`);
  }
  return await response.json() !== true;
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    sendJson(response, 503, { error: "The shared leaderboard is not configured." });
    return;
  }

  const baseUrl = supabaseUrl.replace(/\/+$/, "");
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    if (request.method === "GET") {
      const requestUrl = new URL(request.url, "http://localhost");
      const date = requestUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);
      const playerId = requestUrl.searchParams.get("playerId");
      const today = new Date().toISOString().slice(0, 10);
      if (!isValidDateKey(date) || date < firstPuzzleDate || date > today) {
        sendJson(response, 400, { error: "Choose a valid daily puzzle date." });
        return;
      }
      if (playerId && !playerIdPattern.test(playerId)) {
        sendJson(response, 400, { error: "Invalid player ID." });
        return;
      }
      if (await isRateLimited(request, baseUrl, headers, serviceRoleKey, controller.signal)) {
        sendJson(response, 429, { error: "Too many leaderboard requests. Please try again later." });
        return;
      }

      const query = new URLSearchParams({
        select: "player_id,score,updated_at",
        daily_date: `eq.${date}`,
        order: "score.desc,updated_at.asc",
        limit: "100",
      });
      const result = await fetch(`${baseUrl}${scoreTable}?${query}`, {
        headers: { ...headers, Prefer: "count=exact" },
        signal: controller.signal,
      });
      if (!result.ok) {
        throw new Error(`Supabase leaderboard read failed with HTTP ${result.status}.`);
      }

      const rows = await result.json();
      if (
        !Array.isArray(rows) ||
        rows.some((row) =>
          !row ||
          typeof row.player_id !== "string" ||
          !Number.isSafeInteger(row.score) ||
          row.score < 0
        )
      ) {
        throw new Error("Supabase returned an invalid leaderboard response.");
      }

      const contentRange = result.headers.get("content-range") || "";
      const totalText = contentRange.split("/")[1];
      const playerCount = /^\d+$/.test(totalText) ? Number(totalText) : rows.length;
      const players = rows.map((row, index) => ({
        rank: index + 1,
        name: row.player_id === playerId ? "you" : `player ${index + 1}`,
        score: row.score,
      }));
      sendJson(response, 200, { date, playerCount, players });
      return;
    }

    const contentLength = Number(request.headers?.["content-length"] || 0);
    if (contentLength > 4096) {
      sendJson(response, 413, { error: "Request is too large." });
      return;
    }

    const body = parseBody(request.body);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      sendJson(response, 400, { error: "A JSON object is required." });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (!isValidDateKey(body.date) || body.date !== today) {
      sendJson(response, 400, { error: "Scores can only be submitted for today's puzzle." });
      return;
    }
    if (typeof body.playerId !== "string" || !playerIdPattern.test(body.playerId)) {
      sendJson(response, 400, { error: "A valid player ID is required." });
      return;
    }
    if (!Number.isSafeInteger(body.score) || body.score < 0 || body.score > 10000000) {
      sendJson(response, 400, { error: "Score is outside the accepted range." });
      return;
    }

    if (await isRateLimited(request, baseUrl, headers, serviceRoleKey, controller.signal)) {
      sendJson(response, 429, { error: "Too many score submissions. Please try again later." });
      return;
    }

    const savedScore = await fetch(`${baseUrl}/rest/v1/rpc/submit_blockblast_daily_score`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_daily_date: body.date,
        p_player_id: body.playerId,
        p_score: body.score,
      }),
      signal: controller.signal,
    });
    if (!savedScore.ok) {
      throw new Error(`Supabase leaderboard write failed with HTTP ${savedScore.status}.`);
    }
    const result = await savedScore.json();
    if (!Array.isArray(result) || result.length !== 1 || !Number.isSafeInteger(result[0].score)) {
      throw new Error("Supabase returned an invalid saved score.");
    }

    sendJson(response, 200, { score: result[0].score });
  } catch (error) {
    console.error("BlockBlast leaderboard API request failed.", error);
    sendJson(response, 502, { error: "The shared leaderboard is temporarily unavailable." });
  } finally {
    clearTimeout(timeout);
  }
};
