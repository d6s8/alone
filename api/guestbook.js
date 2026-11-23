"use strict";

const { createHmac } = require("node:crypto");

const guestbookTable = "/rest/v1/guestbook_entries";

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
  const forwarded = request.headers["x-forwarded-for"];
  const forwardedIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
  const realIp = request.headers["x-real-ip"];
  return (typeof realIp === "string" && realIp.trim()) ||
    forwardedIp ||
    request.socket.remoteAddress ||
    "unknown";
}

function normalizeText(value, allowNewlines) {
  const controlCharacters = allowNewlines
    ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
    : /[\u0000-\u001f\u007f]/g;
  return value.replace(controlCharacters, allowNewlines ? "" : " ").trim();
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
    sendJson(response, 503, { error: "Guestbook service is not configured." });
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
      const query = new URLSearchParams({
        select: "id,name,message,created_at",
        status: "eq.approved",
        order: "created_at.desc",
        limit: "20",
      });
      const result = await fetch(`${baseUrl}${guestbookTable}?${query}`, {
        headers,
        signal: controller.signal,
      });
      if (!result.ok) {
        throw new Error(`Supabase read failed with HTTP ${result.status}.`);
      }

      const entries = await result.json();
      if (!Array.isArray(entries)) {
        throw new Error("Supabase returned an invalid guestbook response.");
      }
      sendJson(response, 200, { entries });
      return;
    }

    const contentLength = Number(request.headers["content-length"] || 0);
    if (contentLength > 4096) {
      sendJson(response, 413, { error: "Message is too large." });
      return;
    }

    const body = parseBody(request.body);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      sendJson(response, 400, { error: "A JSON object is required." });
      return;
    }

    const rawName = typeof body.name === "string" ? body.name : "";
    const rawMessage = typeof body.message === "string" ? body.message : "";
    const name = Array.from(normalizeText(rawName, false)).slice(0, 24).join("") || "anonymous";
    const message = normalizeText(rawMessage, true);
    if (!message || Array.from(message).length > 240) {
      sendJson(response, 400, { error: "Message must contain between 1 and 240 characters." });
      return;
    }

    const ipHash = createHmac("sha256", serviceRoleKey)
      .update(getClientIp(request))
      .digest("hex");
    const rateLimit = await fetch(`${baseUrl}/rest/v1/rpc/consume_guestbook_rate_limit`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ p_ip_hash: ipHash }),
      signal: controller.signal,
    });
    if (!rateLimit.ok) {
      throw new Error(`Supabase rate-limit check failed with HTTP ${rateLimit.status}.`);
    }
    if (await rateLimit.json() !== true) {
      sendJson(response, 429, { error: "Please wait before posting another note." });
      return;
    }

    const insert = await fetch(`${baseUrl}${guestbookTable}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ name, message, status: "pending" }),
      signal: controller.signal,
    });
    if (!insert.ok) {
      throw new Error(`Supabase insert failed with HTTP ${insert.status}.`);
    }

    sendJson(response, 202, { submitted: true });
  } catch (error) {
    console.error("Guestbook API request failed.", error);
    sendJson(response, 502, { error: "Guestbook service is temporarily unavailable." });
  } finally {
    clearTimeout(timeout);
  }
};
