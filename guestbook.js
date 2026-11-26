"use strict";// Build the date explicitly so the visible format never depends on browser locale.
window.formatDateDDMMYY = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
};

const guestbookForm = document.getElementById("guestbook-form");
const guestbookStatus = document.getElementById("guestbook-status");
const guestbookNotice = document.getElementById("guestbook-notice");
const guestbookModeLabel = document.getElementById("guestbook-mode");
const guestbookMessage = guestbookForm.querySelector("textarea[name='message']");
const wallList = document.getElementById("wall-list");
const guestbookKey = "alone.local-wall.v1";
let guestbookMode = "connecting";

// The message is stored with simple markers so the toolbar can add styling to text.
const formatMarkers = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  underline: ["__", "__"],
  strike: ["~~", "~~"],
};

function escapeWallText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatWallText(text) {
  return escapeWallText(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function applyFormatting(formatName) {
  const markers = formatMarkers[formatName];
  if (!markers || !guestbookMessage) return;

  const [openMarker, closeMarker] = markers;
  const value = guestbookMessage.value;
  const start = guestbookMessage.selectionStart;
  const end = guestbookMessage.selectionEnd;

  // Unwrap when the selection is already wrapped with the same markers.
  const wrapped = value.slice(start - openMarker.length, start) === openMarker &&
    value.slice(end, end + closeMarker.length) === closeMarker;
  if (wrapped) {
    const inner = value.slice(start, end);
    guestbookMessage.setRangeText(inner, start - openMarker.length, end + closeMarker.length, "select");
  } else {
    const selected = value.slice(start, end);
    const replacement = selected === ""
      ? openMarker + closeMarker
      : openMarker + selected + closeMarker;
    guestbookMessage.setRangeText(replacement, start, end, "end");
  }
  guestbookMessage.focus();
}

guestbookForm.querySelectorAll("[data-format]").forEach((button) => {
  button.addEventListener("click", () => {
    applyFormatting(button.dataset.format);
    if (guestbookStatus.textContent.startsWith("Saved")) {
      guestbookStatus.textContent = "";
    }
  });
});

function isLocalPreview() {
  return location.protocol === "file:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";
}

function readLocalGuestbookEntries() {
  const rawEntries = window.localStorage.getItem(guestbookKey);
  if (rawEntries === null) {
    return [];
  }

  const entries = JSON.parse(rawEntries);
  if (!Array.isArray(entries)) {
    throw new Error("Saved guestbook data is not a list.");
  }

  return entries.filter((entry) =>
    entry &&
    typeof entry.name === "string" &&
    typeof entry.message === "string" &&
    typeof entry.createdAt === "string"
  ).slice(0, 20);
}

function renderGuestbookEntries(entries, emptyMessage) {
  wallList.replaceChildren();

  if (entries.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "game-status";
    emptyState.textContent = emptyMessage;
    wallList.append(emptyState);
    return;
  }

  entries.forEach((entry) => {
    const article = document.createElement("article");
    article.className = "wall-entry";

    const heading = document.createElement("header");
    const author = document.createElement("strong");
    author.textContent = entry.name || "anonymous";
    const date = document.createElement("time");
    const createdAt = entry.created_at || entry.createdAt;
    const parsedDate = new Date(createdAt);
    date.dateTime = Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString();
    date.textContent = Number.isNaN(parsedDate.getTime())
      ? "saved locally"
      : window.formatDateDDMMYY(parsedDate);
    heading.append(author, date);

    const message = document.createElement("p");
    message.innerHTML = formatWallText(entry.message);
    article.append(heading, message);
    wallList.append(article);
  });
}

function useLocalGuestbook() {
  guestbookMode = "local";
  guestbookModeLabel.textContent = "local preview";
  guestbookNotice.textContent = "This preview saves entries only in this browser; it is not shared with other visitors.";
  guestbookForm.querySelector("button[type='submit']").disabled = false;
  renderGuestbookEntries(readLocalGuestbookEntries(), "No local notes yet. You can leave the first one.");
}

async function loadGuestbook() {
  guestbookMode = "connecting";
  guestbookForm.querySelector("button[type='submit']").disabled = true;

  if (location.hostname.endsWith(".github.io")) {
    guestbookMode = "error";
    guestbookModeLabel.textContent = "coming soon";
    guestbookNotice.textContent = "The shared wall is not connected yet.";
    guestbookStatus.textContent = "";
    wallList.replaceChildren();
    return;
  }

  // Local preview is opt-in to the API so opening the static site never looks like a live failure.
  if (isLocalPreview() && new URLSearchParams(location.search).get("guestbook") !== "live") {
    try {
      useLocalGuestbook();
    } catch (error) {
      guestbookMode = "error";
      guestbookModeLabel.textContent = "unavailable";
      guestbookNotice.textContent = "Local storage is unavailable in this browser.";
      guestbookStatus.textContent = "The local guestbook preview could not be loaded.";
      guestbookForm.querySelector("button[type='submit']").disabled = true;
      console.error("Could not load the local guestbook preview.", error);
    }
    return;
  }

  try {
    const response = await fetch("/api/guestbook", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 404 && isLocalPreview()) {
      useLocalGuestbook();
      return;
    }
    if (!response.ok) {
      throw new Error(`Guestbook API returned HTTP ${response.status}.`);
    }

    const result = await response.json();
    if (!result || !Array.isArray(result.entries)) {
      throw new Error("Guestbook API returned an unexpected response.");
    }

    guestbookMode = "live";
    guestbookModeLabel.textContent = "shared wall · moderated";
    guestbookNotice.textContent = "Public messages are reviewed before they appear.";
    guestbookForm.querySelector("button[type='submit']").disabled = false;
    renderGuestbookEntries(result.entries, "No approved notes yet. Leave one for review.");
  } catch (error) {
    if (isLocalPreview()) {
      try {
        useLocalGuestbook();
        return;
      } catch (localError) {
        console.error("Could not load the local guestbook preview.", localError);
      }
    }

    guestbookMode = "error";
    guestbookModeLabel.textContent = "unavailable";
    guestbookNotice.textContent = "The shared wall could not be loaded. Please try again later.";
    guestbookStatus.textContent = "The guestbook service is unavailable.";
    wallList.replaceChildren();
    guestbookForm.querySelector("button[type='submit']").disabled = true;
    console.error("Could not load the guestbook.", error);
  }
}

guestbookForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (guestbookMode === "connecting" || guestbookMode === "error") {
    guestbookStatus.textContent = "The guestbook is not ready yet.";
    return;
  }

  const formData = new FormData(guestbookForm);
  const name = Array.from(String(formData.get("name") || "").trim()).slice(0, 24).join("") || "anonymous";
  const message = String(formData.get("message") || "").trim();

  if (!message || Array.from(message).length > 240) {
    guestbookStatus.textContent = "Write a message up to 240 characters.";
    return;
  }

  if (guestbookMode === "local") {
    try {
      const entries = readLocalGuestbookEntries();
      entries.unshift({ name, message, createdAt: new Date().toISOString() });
      window.localStorage.setItem(guestbookKey, JSON.stringify(entries.slice(0, 20)));
      guestbookForm.reset();
      guestbookStatus.textContent = "Saved only in this browser.";
      renderGuestbookEntries(readLocalGuestbookEntries(), "No local notes yet. You can leave the first one.");
    } catch (error) {
      guestbookStatus.textContent = "Could not save the note in this browser.";
      console.error("Could not save a local guestbook entry.", error);
    }
    return;
  }

  try {
    const response = await fetch("/api/guestbook", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, message }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result && result.error ? result.error : `Guestbook API returned HTTP ${response.status}.`);
    }
    if (!result || result.submitted !== true) {
      throw new Error("Guestbook API did not confirm the submission.");
    }

    guestbookForm.reset();
    guestbookStatus.textContent = "Sent for review. Thanks for leaving a note!";
  } catch (error) {
    guestbookStatus.textContent = "Could not send your note. Please try again later.";
    console.error("Could not submit a guestbook entry.", error);
  }
});

loadGuestbook();
