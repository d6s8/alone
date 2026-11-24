"use strict";

(() => {
  const gameCards = Array.from(document.querySelectorAll("[data-game-open]"));
  const gamePanels = Array.from(document.querySelectorAll("[data-game-panel]"));

  function openGame(name) {
    gameCards.forEach((card) => {
      const selected = card.dataset.gameOpen === name;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-expanded", String(selected));
    });
    gamePanels.forEach((panel) => {
      panel.hidden = panel.dataset.gamePanel !== name;
    });
    const activePanel = document.querySelector(`[data-game-panel="${name}"]`);
    if (activePanel) {
      activePanel.focus();
      activePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function closeGame(panel) {
    panel.hidden = true;
    const card = document.querySelector(`[data-game-open="${panel.dataset.gamePanel}"]`);
    if (card) {
      card.classList.remove("is-selected");
      card.setAttribute("aria-expanded", "false");
      card.focus();
    }
  }

  gameCards.forEach((card) => {
    card.addEventListener("click", () => {
      const panel = document.querySelector(`[data-game-panel="${card.dataset.gameOpen}"]`);
      if (panel && !panel.hidden) {
        closeGame(panel);
      } else {
        openGame(card.dataset.gameOpen);
      }
    });
  });

  gamePanels.forEach((panel) => {
    panel.querySelector("[data-game-close]").addEventListener("click", () => closeGame(panel));
  });

  function readSavedValue(key) {
    try {
      const rawValue = window.localStorage.getItem(key);
      return rawValue === null ? null : JSON.parse(rawValue);
    } catch (error) {
      console.error(`Could not read saved game data "${key}".`, error);
      return null;
    }
  }

  function writeSavedValue(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Could not save game data "${key}".`, error);
      return false;
    }
  }

  function currentUtcDateKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function dateKeyToShortDate(dateKey) {
    const [year, month, day] = dateKey.split("-");
    return `${day}.${month}.${year.slice(-2)}`;
  }

  function dateKeyNumber(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  }

  function seededRandom(seedText) {
    // Daily boards use a deterministic seed, so every visitor gets the same piece sequence.
    let state = 2166136261;
    for (const character of seedText) {
      state = Math.imul(state ^ character.charCodeAt(0), 16777619);
    }

    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

Object.assign(window, { readSavedValue, writeSavedValue, currentUtcDateKey, dateKeyToShortDate, dateKeyNumber, seededRandom });
})();
