"use strict";

(() => {
  const M = window.TypingMechanics;
  const targetEl = document.getElementById("tt-target");
  const inputEl = document.getElementById("tt-input");
  const statusEl = document.getElementById("tt-status");
  const statsEl = document.getElementById("tt-stats");
  const newTestBtn = document.getElementById("tt-new");
  const resetStatsBtn = document.getElementById("tt-reset-stats");
  const statsDialog = document.getElementById("tt-stats-dialog");
  const statsBody = document.getElementById("tt-stats-body");
  const STATS_KEY = "alone.typing.stats.v1";

  let target = "";
  let typed = "";
  let startTime = null;
  let finished = false;
  let duration = 0;
  let stats = readStats();

  function defaultStats() {
    return { tests: 0, lastWpm: 0, lastAccuracy: 0, bestWpm: 0, bestAccuracy: 0, avgWpm: 0 };
  }

  function readStats() {
    try {
      const saved = window.localStorage.getItem(STATS_KEY);
      return saved ? { ...defaultStats(), ...JSON.parse(saved) } : defaultStats();
    } catch (error) {
      console.error("Could not read the typing test stats.", error);
      return defaultStats();
    }
  }

  function saveStats() {
    try {
      window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error("Could not save the typing test stats.", error);
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  function startTest() {
    target = M.generateText(6, Math.random);
    typed = "";
    startTime = null;
    finished = false;
    duration = 0;
    inputEl.value = "";
    inputEl.disabled = false;
    inputEl.maxLength = target.length;
    renderTarget();
    renderStats();
  }

  function renderTarget() {
    let html = "";
    const n = finished ? target.length : Math.min(typed.length, target.length);
    const cursor = finished ? -1 : Math.min(inputEl.selectionStart, target.length);
    for (let i = 0; i <= target.length; i++) {
      if (i === cursor) html += '<span class="tt-cursor" aria-hidden="true"></span>';
      if (i === target.length) break;
      const state = i >= n ? "is-rest" : typed[i] === target[i] ? "is-correct" : "is-error";
      html += `<span class="tt-char ${state}">${escapeHtml(target[i])}</span>`;
    }
    targetEl.innerHTML = html;
  }

  function liveWpm() {
    const raw = startTime ? M.computeWpm(typed.length, M.elapsedSeconds(startTime)) : 0;
    return Math.min(raw, 999);
  }

  function liveAccuracy() {
    return startTime ? M.computeAccuracy(typed, target) : 100;
  }

  function renderStats() {
    if (finished && startTime) {
      statusEl.textContent = `${stats.lastWpm} wpm · ${stats.lastAccuracy}% accuracy · ${Math.round(duration)}s`;
    } else {
      statusEl.textContent = `live ${liveWpm()} wpm · ${liveAccuracy()}%`;
    }
    statsEl.textContent = `tests ${stats.tests} · best ${stats.bestWpm} wpm · best ${stats.bestAccuracy}%`;
  }

  function onInput() {
    if (finished) return;
    typed = inputEl.value;
    if (startTime === null && typed.length > 0) startTime = Date.now();
    renderTarget();
    renderStats();
    if (!finished && typed.length >= target.length) finishTest();
  }

  function finishTest() {
    if (finished) return;
    finished = true;
    duration = M.elapsedSeconds(startTime);
    inputEl.disabled = true;
    const rawWpm = M.computeWpm(typed.length, duration);
    const wpm = Math.min(rawWpm, 999);
    const accuracy = M.computeAccuracy(typed, target);
    stats.tests += 1;
    stats.lastWpm = wpm;
    stats.lastAccuracy = accuracy;
    stats.bestWpm = Math.max(stats.bestWpm, wpm);
    stats.bestAccuracy = Math.max(stats.bestAccuracy, accuracy);
    stats.avgWpm = (stats.avgWpm * (stats.tests - 1) + wpm) / stats.tests;
    saveStats();
    renderTarget();
    renderStats();
    renderStatsDialog();
  }

  function renderStatsDialog() {
    statsBody.replaceChildren();
    const rows = [
      ["tests", stats.tests],
      ["avg wpm", stats.avgWpm],
      ["best wpm", stats.bestWpm],
      ["best accuracy", stats.bestAccuracy],
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = String(value);
      const span = document.createElement("span");
      span.textContent = label;
      row.append(strong, span);
      statsBody.append(row);
    });
  }

  function resetStats() {
    stats = defaultStats();
    saveStats();
    renderStatsDialog();
    renderStats();
    statusEl.textContent = "Stats reset.";
  }

  inputEl.addEventListener("input", onInput);
  inputEl.addEventListener("click", renderTarget);
  inputEl.addEventListener("keyup", renderTarget);
  newTestBtn.addEventListener("click", () => {
    startTest();
    inputEl.focus();
    statusEl.textContent = "Type the text.";
  });
  resetStatsBtn.addEventListener("click", resetStats);
  document.getElementById("tt-stats-open").addEventListener("click", () => {
    renderStatsDialog();
    if (typeof statsDialog.showModal === "function") statsDialog.showModal();
  });

  startTest();
  statusEl.textContent = "Start typing…";
})();
