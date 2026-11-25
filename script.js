"use strict";

const projectGrid = document.querySelector(".project-grid");
const projectStatus = document.getElementById("project-status");
const projectCount = document.getElementById("project-count");
const projectCardThemes = ["project-card--olive", "project-card--blue", "project-card--rose"];

function createProjectCard(repository, index) {
  const card = document.createElement("a");
  card.className = `project-card ${projectCardThemes[index % projectCardThemes.length]}`;
  card.href = repository.html_url;
  card.target = "_blank";
  card.rel = "noreferrer";

  const title = document.createElement("span");
  title.className = "project-title";
  const displayName = repository.name === "eco-ai-engineers-future-2027"
    ? "ECO AI · Future 2027"
    : repository.name;
  title.textContent = displayName;

  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = " ↗";
  title.append(arrow);

  const description = document.createElement("p");
  description.textContent = repository.description || "No description on GitHub yet.";

  const tags = document.createElement("span");
  tags.className = "tag-row";
  const language = document.createElement("span");
  language.textContent = (repository.language || "project").toLowerCase();
  const stars = document.createElement("span");
  stars.textContent = `${repository.stargazers_count} stars`;
  tags.append(language, stars);

  card.append(title, description, tags);
  return card;
}

async function loadGitHubProjects() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    // This uses only public repository data; the saved cards remain visible if GitHub is unavailable.
    const response = await fetch(
      "https://api.github.com/users/d6s8/repos?sort=pushed&per_page=100",
      {
        headers: { Accept: "application/vnd.github+json" },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new Error(`GitHub returned HTTP ${response.status}.`);
    }

    const repositories = await response.json();
    if (!Array.isArray(repositories)) {
      throw new Error("GitHub returned an unexpected repository list.");
    }

    const projects = repositories
      .filter((repository) => !repository.fork && !repository.archived)
      .slice(0, 3);
    if (projects.length === 0) {
      throw new Error("No public projects were returned.");
    }

    projectGrid.replaceChildren(...projects.map(createProjectCard));
    projectCount.textContent = `${String(projects.length).padStart(2, "0")} projects`;
    projectStatus.textContent = "synced from public GitHub repositories";
  } catch (error) {
    projectStatus.textContent = "GitHub is unavailable; showing the saved project list.";
    console.error("Could not load projects from GitHub.", error);
  } finally {
    window.clearTimeout(timeout);
  }
}

loadGitHubProjects();

// Build the date explicitly so the visible format never depends on browser locale.
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
