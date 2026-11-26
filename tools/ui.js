"use strict";

(() => {
  const gameCards = Array.from(document.querySelectorAll("[data-game-open]"));
  const gamePanels = Array.from(document.querySelectorAll("[data-game-panel]"));
  const gameFolders = { blocks: "blockblast", word: "wordle", "2048": "2048", typing: "typing" };
  const loadedGames = new Map();
  // The build replaces this empty map with content hashes; source preview needs no build.
  const assetVersions = /* ASSET_VERSIONS */ {};
  let latestGameRequest = 0;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = assetVersions[src] ? `${src}?v=${assetVersions[src]}` : src;
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(new Error(`Could not load ${src}`)); };
      document.head.append(script);
    });
  }

  function loadGame(name) {
    if (!loadedGames.has(name)) {
      const folder = gameFolders[name];
      const loading = loadScript(`tools/${folder}/mechanics.js`)
        .then(() => name === "blocks" ? loadScript("tools/blockblast/achievements.js") : undefined)
        .then(() => loadScript(`tools/${folder}/game.js`))
        .catch((error) => { loadedGames.delete(name); throw error; });
      loadedGames.set(name, loading);
    }
    return loadedGames.get(name);
  }

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
    card.addEventListener("click", async () => {
      const request = ++latestGameRequest;
      const panel = document.querySelector(`[data-game-panel="${card.dataset.gameOpen}"]`);
      if (panel && !panel.hidden) {
        closeGame(panel);
      } else {
        card.disabled = true;
        try {
          await loadGame(card.dataset.gameOpen);
          if (request === latestGameRequest) openGame(card.dataset.gameOpen);
        } catch (error) {
          console.error(error);
          window.alert("The game could not be loaded. Please try again.");
        } finally {
          card.disabled = false;
        }
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
