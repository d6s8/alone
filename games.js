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

  const blockBoardElement = document.getElementById("block-board");
  const blockPiecesElement = document.getElementById("block-pieces");
  const blockScoreElement = document.getElementById("block-score");
  const blockMovesElement = document.getElementById("block-moves");
  const blockStatusElement = document.getElementById("block-status");
  const blockDailyHeader = document.getElementById("block-daily-header");
  const blockDailyDate = document.getElementById("block-daily-date");
  const blockDailyBest = document.getElementById("block-daily-best");
  const blockDailyStatus = document.getElementById("block-daily-status");
  const blockLeaderboardOpen = document.getElementById("block-leaderboard-open");
  const blockLeaderboardDialog = document.getElementById("block-leaderboard-dialog");
  const blockLeaderboardDate = document.getElementById("block-leaderboard-date");
  const blockLeaderboardMessage = document.getElementById("block-leaderboard-message");
  const blockLeaderboardList = document.getElementById("block-leaderboard-list");
  const blockHoldWrap = document.getElementById("block-hold-wrap");
  const blockHoldButton = document.getElementById("block-hold-button");
  const blockHoldPreview = document.getElementById("block-hold-preview");
  const blockHoldLabel = document.getElementById("block-hold-label");
  const blockHaptics = document.getElementById("block-haptics");
  const blockAchievementSummary = document.getElementById("block-achievement-summary");
  const blockAchievementList = document.getElementById("block-achievement-list");
  const blockComboElement = document.getElementById("block-combo");
  const blockComboMultElement = document.getElementById("block-combo-mult");
  const blockFloatingScoresElement = document.getElementById("block-floating-scores");
  const blockModeTabs = Array.from(document.querySelectorAll("[data-block-mode]"));

  // Shapes are represented as occupied row/column coordinates and do not rotate.
  // Piece catalogue compatible with starkow.dev block-blast-engine (no rotations).
  const blockShapes = [
    [[0, 0]],                                                                        // 1x1
    [[0, 0], [0, 1]],                                                                // 1x2
    [[0, 0], [0, 1], [0, 2]],                                                        // 1x3
    [[0, 0], [0, 1], [0, 2], [0, 3]],                                                // 1x4
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],                                        // 1x5
    [[0, 0], [1, 0]],                                                                // 2x1
    [[0, 0], [1, 0], [2, 0]],                                                        // 3x1
    [[0, 0], [1, 0], [2, 0], [3, 0]],                                                // 4x1
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],                                        // 5x1
    [[0, 0], [0, 1], [1, 0], [1, 1]],                                                // 2x2
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],        // 3x3
    [[0, 0], [0, 1], [1, 0]],                                                        // L-small-ne
    [[0, 0], [0, 1], [1, 1]],                                                        // L-small-nw
    [[0, 0], [1, 0], [1, 1]],                                                        // L-small-se
    [[0, 1], [1, 0], [1, 1]],                                                        // L-small-sw
    [[0, 0], [0, 1], [1, 0], [2, 0]],                                                // L-big-ne
    [[0, 1], [1, 1], [2, 0], [2, 1]],                                                // L-big-sw
    [[0, 0], [0, 1], [0, 2], [1, 2]],                                                // J-big-nw
    [[0, 0], [1, 0], [1, 1], [1, 2]],                                                // J-big-se
    [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],                                        // corner5-tl
    [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],                                        // corner5-tr
    [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],                                        // corner5-bl
    [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]],                                        // corner5-br
    [[0, 0], [0, 1], [0, 2], [1, 1]],                                                // T-n
    [[0, 1], [1, 0], [1, 1], [2, 1]],                                                // T-e
    [[0, 1], [1, 0], [1, 1], [1, 2]],                                                // T-s
    [[0, 0], [1, 0], [1, 1], [2, 0]],                                                // T-w
    [[0, 1], [0, 2], [1, 0], [1, 1]],                                                // S-h
    [[0, 0], [1, 0], [1, 1], [2, 1]],                                                // S-v
    [[0, 0], [0, 1], [1, 1], [1, 2]],                                                // Z-h
    [[0, 1], [1, 0], [1, 1], [2, 0]],                                                // Z-v
  ];

  // ---- Weighted piece generation (starkow.dev block-blast-engine port) ----

  const PIECE_IDS = [
    '1x1', '1x2', '1x3', '1x4', '1x5',
    '2x1', '3x1', '4x1', '5x1',
    '2x2', '3x3',
    'L-small-ne', 'L-small-nw', 'L-small-se', 'L-small-sw',
    'L-big-ne', 'L-big-sw',
    'J-big-nw', 'J-big-se',
    'corner5-tl', 'corner5-tr', 'corner5-bl', 'corner5-br',
    'T-n', 'T-e', 'T-s', 'T-w',
    'S-h', 'S-v', 'Z-h', 'Z-v',
  ];

  const SCORE_BRACKETS = [0, 300, 500, 700, 1000, 1400, 1800, 2200, 2500, 3000, 3800, 4500, 5200, 6000, 6800, 7600, 8400];

  const WEIGHTS_BY_PIECE = {
    '1x1': [30, 15, 16, 16, 22, 16, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    '2x1': [10, 20, 10, 6, 12, 15, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    '1x2': [0, 10, 10, 12, 12, 15, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17],
    '3x1': [0, 0, 12, 18, 20, 11, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
    '1x3': [23, 16, 12, 12, 12, 12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    'L-small-ne': [23, 20, 14, 10, 18, 20, 17, 17, 17, 17, 15, 15, 15, 15, 15, 15, 15],
    '4x1': [23, 16, 24, 12, 15, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
    'J-big-se': [18, 16, 16, 8, 20, 11, 11, 11, 5, 5, 5, 5, 4, 4, 4, 4, 4],
    '2x2': [25, 18, 10, 12, 15, 16, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17],
    'T-s': [9, 20, 20, 12, 20, 16, 20, 20, 20, 10, 10, 10, 10, 10, 9, 9, 6],

    '1x5': [30, 20, 18, 12, 14, 9, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24],
    'corner5-tr': [35, 15, 12, 14, 18, 25, 11, 6, 6, 6, 6, 5, 5, 4, 4, 4, 4],
    '3x3': [26, 20, 16, 16, 12, 15, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    'S-h': [0, 0, 1, 8, 6, 5, 5.5, 5.5, 5.5, 5.5, 5.5, 10, 8, 8, 8, 8, 8],
    'L-small-nw': [0, 0, 0, 0, 20, 11, 24, 24, 24, 24, 15, 15, 15, 15, 15, 15, 15],
    'S-v': [0, 0, 0, 0, 4.5, 9, 7, 7, 7, 7, 7, 5, 8, 8, 8, 8, 8],
    '1x4': [0, 0, 0, 0, 0, 15, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11],
    'Z-h': [0, 0, 1, 8, 6, 5, 5.5, 5.5, 5.5, 5.5, 5.5, 10, 8, 8, 8, 8, 8],
    'Z-v': [0, 0, 0, 0, 4.5, 9, 7, 7, 7, 7, 7, 5, 8, 8, 8, 8, 8],

    'T-w': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 6],
    'corner5-tl': [0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 8, 5, 5, 4, 4, 4, 4],
    '5x1': [0, 0, 0, 0, 0, 0, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17],
    'corner5-bl': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 4, 4, 4, 4],
    'corner5-br': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4],
    'T-e': [0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 14, 14, 14, 14, 9, 9, 6],
    'T-n': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
    'L-small-se': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 15, 15, 15, 15, 15, 15],
    'L-small-sw': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 15, 15, 15, 15, 15, 15],
    'L-big-sw': [0, 0, 0, 0, 0, 0, 0, 0, 6, 6, 6, 6, 4, 4, 4, 4, 4],
    'J-big-nw': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4],
    'L-big-ne': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4],
  };

  const PIECES_BY_SIZE = blockShapes
    .map((cells, index) => ({ index, length: cells.length }))
    .sort((a, b) => a.length - b.length)
    .map((p) => p.index);

  function poolForScore(score) {
    let bracket = 0;
    while (bracket + 1 < SCORE_BRACKETS.length && score >= SCORE_BRACKETS[bracket + 1]) {
      bracket += 1;
    }
    const pieces = [];
    const weights = [];
    for (const [id, column] of Object.entries(WEIGHTS_BY_PIECE)) {
      const weight = column[bracket];
      if (weight > 0) {
        const index = PIECE_IDS.indexOf(id);
        if (index !== -1) {
          pieces.push(index);
          weights.push(weight);
        }
      }
    }
    const total = weights.reduce((sum, w) => sum + w, 0);
    return { pieces, weights, total };
  }

  function drawFromPool(rng, pool) {
    let r = rng() * pool.total;
    for (let i = 0; i < pool.pieces.length; i++) {
      r -= pool.weights[i];
      if (r < 0) return pool.pieces[i];
    }
    return pool.pieces[pool.pieces.length - 1];
  }

  function pieceFitsAt(shapeIndex, r, c, board, size) {
    const shape = blockShapes[shapeIndex];
    for (const [dr, dc] of shape) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) return false;
      if (board[rr][cc] !== 0) return false;
    }
    return true;
  }

  function anyPieceFits(shapeIndex, board, size) {
    const shape = blockShapes[shapeIndex];
    const h = Math.max(...shape.map(([dr]) => dr)) + 1;
    const w = Math.max(...shape.map(([, dc]) => dc)) + 1;
    for (let r = 0; r + h <= size; r++) {
      for (let c = 0; c + w <= size; c++) {
        if (pieceFitsAt(shapeIndex, r, c, board, size)) return true;
      }
    }
    return false;
  }

  function canPlaceAll(board, size, shapeIndices) {
    if (shapeIndices.length === 0) return true;
    const tried = new Set();
    for (let i = 0; i < shapeIndices.length; i++) {
      const id = shapeIndices[i];
      if (tried.has(id)) continue;
      tried.add(id);
      const rest = shapeIndices.slice(0, i).concat(shapeIndices.slice(i + 1));
      const shape = blockShapes[id];
      const h = Math.max(...shape.map(([dr]) => dr)) + 1;
      const w = Math.max(...shape.map(([, dc]) => dc)) + 1;
      for (let r = 0; r + h <= size; r++) {
        for (let c = 0; c + w <= size; c++) {
          if (!pieceFitsAt(id, r, c, board, size)) continue;
          const next = board.map(row => row.slice());
          for (const [dr, dc] of shape) next[r + dr][c + dc] = 1;
          if (canPlaceAll(next, size, rest)) return true;
        }
      }
    }
    return false;
  }

  function everyPieceFitsNow(board, size, shapeIndices) {
    return shapeIndices.every((shapeIndex) => anyPieceFits(shapeIndex, board, size));
  }

  function blockCoversCell(shape, top, left, row, column) {
    return shape.some(([dr, dc]) => top + dr === row && left + dc === column);
  }

  // These placement heuristics mirror block-blast-engine/grid.ts.
  function blockPlacementStats(board, size, shapeIndex, top, left) {
    const shape = blockShapes[shapeIndex];
    const blocked = (row, column) =>
      row < 0 || column < 0 || row >= size || column >= size ||
      board[row][column] !== 0 || blockCoversCell(shape, top, left, row, column);
    let edges = 0;
    let touching = 0;
    let sealed = 0;

    for (const [dr, dc] of shape) {
      for (const [row, column] of [
        [top + dr - 1, left + dc], [top + dr + 1, left + dc],
        [top + dr, left + dc - 1], [top + dr, left + dc + 1],
      ]) {
        if (blockCoversCell(shape, top, left, row, column)) continue;
        edges++;
        if (blocked(row, column)) {
          touching++;
        } else if (
          blocked(row - 1, column) && blocked(row + 1, column) &&
          blocked(row, column - 1) && blocked(row, column + 1)
        ) {
          sealed++;
        }
      }
    }

    const next = board.map(row => row.slice());
    for (const [dr, dc] of shape) next[top + dr][left + dc] = 1;
    const candidateRows = new Set(shape.map(([dr]) => top + dr));
    const candidateColumns = new Set(shape.map(([, dc]) => left + dc));
    let lines = 0;
    for (const row of candidateRows) if (next[row].every(value => value !== 0)) lines++;
    for (const column of candidateColumns) if (next.every(row => row[column] !== 0)) lines++;

    return { contact: edges ? touching / edges : 0, sealed, lines, touching };
  }

  function blockPlacementFit(board, size, shapeIndex, top, left) {
    const stats = blockPlacementStats(board, size, shapeIndex, top, left);
    return stats.contact - 0.6 * stats.sealed + 0.5 * Math.min(stats.lines, 2);
  }

  function greedyPlacement(board, size, shapeIndex) {
    const shape = blockShapes[shapeIndex];
    const h = Math.max(...shape.map(([dr]) => dr)) + 1;
    const w = Math.max(...shape.map(([, dc]) => dc)) + 1;
    let best = null;
    let bestScore = -Infinity;
    const filledBefore = board.reduce((sum, row) => sum + row.reduce((s, v) => s + v, 0), 0) + shape.length;

    for (let r = 0; r + h <= size; r++) {
      for (let c = 0; c + w <= size; c++) {
        if (!pieceFitsAt(shapeIndex, r, c, board, size)) continue;
        const next = board.map(row => row.slice());
        for (const [dr, dc] of shape) next[r + dr][c + dc] = 1;
        const fullRows = next
          .map((row, index) => row.every(value => value !== 0) ? index : -1)
          .filter(index => index >= 0);
        const fullColumns = Array.from({ length: size }, (_, column) => column)
          .filter(column => next.every(row => row[column] !== 0));
        for (let rr = 0; rr < size; rr++) {
          for (let cc = 0; cc < size; cc++) {
            if (fullRows.includes(rr) || fullColumns.includes(cc)) next[rr][cc] = 0;
          }
        }
        const filledAfter = next.reduce((sum, row) => sum + row.reduce((s, v) => s + v, 0), 0);
        const snugness = blockPlacementStats(board, size, shapeIndex, r, c).touching;
        const score = (filledBefore - filledAfter) * 10 + snugness;
        if (score > bestScore) { bestScore = score; best = next; }
      }
    }
    return best;
  }

  function greedyPlacesAll(board, size, tray) {
    const ORDERS = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
    return ORDERS.some((order) => {
      let current = board.map(row => row.slice());
      for (const index of order) {
        const next = greedyPlacement(current, size, tray[index]);
        if (next === null) return false;
        current = next;
      }
      return true;
    });
  }

  const TRAY_ATTEMPTS = 30;
  const FIT_NOW_ATTEMPTS = 22;
  const FIT_CANDIDATES = 6;
  const SLOT_ATTEMPTS = 40;
  const ASSIST_CHANCE_START = 0.9;
  const ASSIST_CHANCE_FLOOR = 0.5;
  const ASSIST_FADE_SCORE = 9000;
  const GENEROUS_FADE_SCORE = 5000;
  const NEAR_FULL_EMPTY_CELLS = 3;

  function hasNearFullLine(board, size) {
    for (let i = 0; i < size; i++) {
      let rowEmpty = 0, colEmpty = 0;
      for (let j = 0; j < size; j++) {
        if (board[i][j] === 0) rowEmpty++;
        if (board[j][i] === 0) colEmpty++;
      }
      if ((rowEmpty > 0 && rowEmpty <= NEAR_FULL_EMPTY_CELLS) || (colEmpty > 0 && colEmpty <= NEAR_FULL_EMPTY_CELLS)) return true;
    }
    return false;
  }

  function clearsALine(board, size, shapeIndex) {
    const shape = blockShapes[shapeIndex];
    const h = Math.max(...shape.map(([dr]) => dr)) + 1;
    const w = Math.max(...shape.map(([, dc]) => dc)) + 1;
    for (let r = 0; r + h <= size; r++) {
      for (let c = 0; c + w <= size; c++) {
        if (!pieceFitsAt(shapeIndex, r, c, board, size)) continue;
        const next = board.map(row => row.slice());
        for (const [dr, dc] of shape) next[r + dr][c + dc] = 1;
        let lines = 0;
        for (let rr = 0; rr < size; rr++) { if (next[rr].every(v => v !== 0)) lines++; }
        for (let cc = 0; cc < size; cc++) { if (next.every(row => row[cc] !== 0)) lines++; }
        if (lines > 0) return true;
      }
    }
    return false;
  }

  function clearingSubPool(board, size, pool) {
    const pieces = [];
    const weights = [];
    for (let i = 0; i < pool.pieces.length; i++) {
      if (clearsALine(board, size, pool.pieces[i])) {
        pieces.push(pool.pieces[i]);
        weights.push(pool.weights[i]);
      }
    }
    const total = weights.reduce((sum, w) => sum + w, 0);
    return { pieces, weights, total };
  }

  // ---- Floating score pop-ups ----

  function spawnFloatingPoints(clientX, clientY, value) {
    const rect = blockBoardElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const el = document.createElement("div");
    el.className = "block-floating-score";
    el.textContent = "+" + value;
    el.style.left = x + "px";
    el.style.top = y + "px";
    blockFloatingScoresElement.appendChild(el);
    floatingScores.push({ x, y, value, life: 1.0, el });
  }

  function updateFloatingScores(delta) {
    for (let i = floatingScores.length - 1; i >= 0; i--) {
      const fs = floatingScores[i];
      fs.life -= delta * 1.2;
      fs.y -= delta * 60;
      fs.el.style.top = fs.y + "px";
      fs.el.style.opacity = String(Math.max(0, fs.life));
      fs.el.style.transform = "translateY(" + String(-(1 - fs.life) * 40) + "px)";
      if (fs.life <= 0) {
        fs.el.remove();
        floatingScores.splice(i, 1);
      }
    }
  }

  // ---- Drag ghost (smooth following piece under cursor) ----

  function createDragGhost(shapeIndex) {
    if (blockDragGhost) removeDragGhost();
    const shape = blockShapes[shapeIndex];
    const cellSize = 40; // matches .block-cell sizing on desktop
    const ghost = document.createElement("div");
    ghost.className = "block-drag-ghost";
    const maxR = Math.max(...shape.map(([dr]) => dr));
    const maxC = Math.max(...shape.map(([, dc]) => dc));
    const w = (maxC + 1) * cellSize;
    const h = (maxR + 1) * cellSize;
    ghost.style.width = w + "px";
    ghost.style.height = h + "px";
    ghost.style.display = "grid";
    ghost.style.gridTemplateColumns = "repeat(" + (maxC + 1) + ", " + cellSize + "px)";
    ghost.style.gridTemplateRows = "repeat(" + (maxR + 1) + ", " + cellSize + "px)";
    ghost.style.gap = "4px";
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "50";
    ghost.style.opacity = "0.85";
    for (const [dr, dc] of shape) {
      const cell = document.createElement("div");
      cell.className = "block-drag-cell block-color-" + ((shapeIndex % 5) + 1);
      cell.style.width = cellSize + "px";
      cell.style.height = cellSize + "px";
      cell.style.borderRadius = "2px";
      ghost.appendChild(cell);
    }
    document.body.appendChild(ghost);
    blockDragGhost = ghost;
    blockDragGhostShape = shape;
  }

  function updateDragGhost(clientX, clientY) {
    if (!blockDragGhost) return;
    blockDragGhost.style.left = (clientX - blockDragGhostOffset.x) + "px";
    blockDragGhost.style.top = (clientY - blockDragGhostOffset.y) + "px";
  }

  function removeDragGhost() {
    if (blockDragGhost) {
      blockDragGhost.remove();
      blockDragGhost = null;
      blockDragGhostShape = null;
    }
  }

  function renderBlockCombo() {
    if (blockComboElement) {
      blockComboElement.textContent = String(blockCombo);
      if (blockCombo > 0) {
        blockComboElement.classList.add("is-active");
        blockComboMultElement.textContent = blockCombo > 1 ? "×" + blockCombo : "";
      } else {
        blockComboElement.classList.remove("is-active");
        blockComboMultElement.textContent = "";
      }
    }
  }

  const blockAchievementDefinitions = [
    ["first-place", "place your first block", (stats, run) => stats.totalPlacements >= 1],
    ["first-clear", "clear a row or column", (stats, run) => stats.totalLines >= 1],
    ["double-clear", "clear two lines at once", (stats, run) => run.linesAtOnce >= 2],
    ["triple-clear", "clear three lines at once", (stats, run) => run.linesAtOnce >= 3],
    ["five-clear", "clear five lines at once", (stats, run) => run.linesAtOnce >= 5],
    ["combo-three", "clear lines three moves in a row", (stats, run) => run.combo >= 3],
    ["combo-five", "clear lines five moves in a row", (stats, run) => run.combo >= 5],
    ["score-100", "score 100 points in one run", (stats, run) => run.score >= 100],
    ["score-250", "score 250 points in one run", (stats, run) => run.score >= 250],
    ["score-500", "score 500 points in one run", (stats, run) => run.score >= 500],
    ["score-1000", "score 1,000 points in one run", (stats, run) => run.score >= 1000],
    ["score-2500", "score 2,500 points in one run", (stats, run) => run.score >= 2500],
    ["place-10", "place ten blocks in one run", (stats, run) => run.placements >= 10],
    ["place-25", "place 25 blocks in one run", (stats, run) => run.placements >= 25],
    ["place-50", "place 50 blocks in one run", (stats, run) => run.placements >= 50],
    ["lifetime-100", "place 100 blocks in total", (stats) => stats.totalPlacements >= 100],
    ["lines-10", "clear ten lines in total", (stats) => stats.totalLines >= 10],
    ["lines-50", "clear 50 lines in total", (stats) => stats.totalLines >= 50],
    ["use-hold", "use the hold slot", (stats, run) => run.usedHold],
    ["play-big", "play on the 10 × 10 board", (stats) => stats.modesPlayed.includes("big")],
    ["play-limited", "play the 50-move mode", (stats) => stats.modesPlayed.includes("limited")],
    ["finish-limited", "finish all 50 limited moves", (stats, run) => run.finishedLimited],
    ["play-daily", "try the daily board", (stats) => stats.modesPlayed.includes("daily")],
    ["all-modes", "try every game mode", (stats) => stats.modesPlayed.length === 5],
  ];

  const savedBlockStats = readSavedValue("alone.block.stats.v1") || {};
  const blockLifetimeStats = {
    totalPlacements: Number(savedBlockStats.totalPlacements) || 0,
    totalLines: Number(savedBlockStats.totalLines) || 0,
    modesPlayed: Array.isArray(savedBlockStats.modesPlayed)
      ? savedBlockStats.modesPlayed.filter((mode) =>
        ["classic", "limited", "big", "hold", "daily"].includes(mode)
      )
      : [],
  };
  const savedAchievements = readSavedValue("alone.block.achievements.v1");
  const unlockedBlockAchievements = new Set(
    Array.isArray(savedAchievements)
      ? savedAchievements.filter((id) => blockAchievementDefinitions.some(([knownId]) => knownId === id))
      : [],
  );
  let blockMode = "classic";
  let blockSize = 8;
  let blockBoard = [];
  let blockPieces = [];
  let blockHeldShape = null;
  let blockSelectedPiece = -1;
  let blockDraggingPiece = -1;
  let blockIgnoreNextPieceClick = false;
  let blockHoldArmed = false;
  let blockHoldUsedThisTurn = false;
  let blockPreview = null;
  let blockScore = 0;
  let blockMoves = 0;
  let blockFinished = false;
  let blockCombo = 0;

  // Floating score pop-ups
  const floatingScores = []; // { x, y, value, life, el }

  // Drag ghost (smooth following piece under cursor)
  let blockDragGhost = null;
  let blockDragGhostShape = null;
  let blockDragGhostOffset = { x: 0, y: 0 };
  let blockRandom = Math.random;
  let blockDailyKey = currentUtcDateKey();
  let blockRun = {};

  function newBlockRun() {
    return {
      score: 0,
      placements: 0,
      linesAtOnce: 0,
      combo: 0,
      comboMisses: 0,
      usedHold: false,
      finishedLimited: false,
    };
  }

  function saveBlockStats() {
    writeSavedValue("alone.block.stats.v1", blockLifetimeStats);
    writeSavedValue("alone.block.achievements.v1", Array.from(unlockedBlockAchievements));
  }

  function renderBlockAchievements() {
    blockAchievementList.replaceChildren();
    blockAchievementSummary.textContent =
      `achievements · ${unlockedBlockAchievements.size}/${blockAchievementDefinitions.length}`;

    blockAchievementDefinitions.forEach(([id, label]) => {
      const item = document.createElement("li");
      item.textContent = label;
      if (unlockedBlockAchievements.has(id)) {
        item.classList.add("is-unlocked");
      }
      blockAchievementList.append(item);
    });
  }

  function checkBlockAchievements() {
    let unlockedNewAchievement = false;
    blockAchievementDefinitions.forEach(([id, , isComplete]) => {
      if (!unlockedBlockAchievements.has(id) && isComplete(blockLifetimeStats, blockRun)) {
        unlockedBlockAchievements.add(id);
        unlockedNewAchievement = true;
      }
    });
    if (unlockedNewAchievement) {
      saveBlockStats();
      blockStatusElement.textContent = "Achievement unlocked!";
    }
    renderBlockAchievements();
  }

  function refillBlockPieces() {
    const pool = poolForScore(blockScore);
    const size = blockSize;
    const assistChance = Math.max(ASSIST_CHANCE_FLOOR, ASSIST_CHANCE_START - (ASSIST_CHANCE_START - ASSIST_CHANCE_FLOOR) * blockScore / ASSIST_FADE_SCORE);
    const generous = blockRandom() < 1 - blockScore / GENEROUS_FADE_SCORE;
    const fitByPiece = new Map();
    let best = null;
    let bestFit = -Infinity;
    let candidates = 0;

    const clearers = hasNearFullLine(blockBoard, size) ? clearingSubPool(blockBoard, size, pool) : null;

    for (let attempt = 0; attempt < TRAY_ATTEMPTS && candidates < FIT_CANDIDATES; attempt++) {
      const tray = [drawFromPool(blockRandom, pool), drawFromPool(blockRandom, pool), drawFromPool(blockRandom, pool)];

      if (clearers !== null && clearers.total > 0 && !tray.some(p => clearers.pieces.includes(p)) && blockRandom() < assistChance) {
        tray[Math.floor(blockRandom() * 3)] = drawFromPool(blockRandom, clearers);
      }

      const acceptable = attempt >= FIT_NOW_ATTEMPTS
        ? canPlaceAll(blockBoard, size, tray)
        : everyPieceFitsNow(blockBoard, size, tray) && (generous ? greedyPlacesAll(blockBoard, size, tray) : canPlaceAll(blockBoard, size, tray));

      if (!acceptable) continue;

      const fits = tray.map((pieceIndex) => {
        let fit = fitByPiece.get(pieceIndex);
        if (fit === undefined) {
          const shape = blockShapes[pieceIndex];
          const h = Math.max(...shape.map(([dr]) => dr)) + 1;
          const w = Math.max(...shape.map(([, dc]) => dc)) + 1;
          let bestFitScore = -Infinity;
          for (let r = 0; r + h <= size; r++) {
            for (let c = 0; c + w <= size; c++) {
              if (!pieceFitsAt(pieceIndex, r, c, blockBoard, size)) continue;
              bestFitScore = Math.max(bestFitScore, blockPlacementFit(blockBoard, size, pieceIndex, r, c));
            }
          }
          fit = bestFitScore;
          fitByPiece.set(pieceIndex, fit);
        }
        return fit;
      });
      const trayFit = Math.min(...fits) + (fits[0] + fits[1] + fits[2]) / 6;

      if (trayFit > bestFit) {
        best = tray;
        bestFit = trayFit;
      }
      candidates++;
    }

    if (best !== null) {
      blockPieces = best;
    } else {
      const tray = [];
      for (let slot = 0; slot < 3; slot++) {
        let chosen = null;
        for (let i = 0; i < SLOT_ATTEMPTS && chosen === null; i++) {
          const candidate = drawFromPool(blockRandom, pool);
          if (canPlaceAll(blockBoard, size, [...tray, candidate])) chosen = candidate;
        }
        if (chosen === null) {
          const fallback = PIECES_BY_SIZE.find(p => canPlaceAll(blockBoard, size, [...tray, p]));
          chosen = fallback !== undefined ? fallback : drawFromPool(blockRandom, pool);
        }
        tray.push(chosen);
      }
      blockPieces = tray;
    }
    blockSelectedPiece = -1;
  }

  function blockShapeFits(shapeIndex, top, left) {
    return blockShapes[shapeIndex].every(([row, column]) => {
      const boardRow = top + row;
      const boardColumn = left + column;
      return (
        boardRow >= 0 &&
        boardRow < blockSize &&
        boardColumn >= 0 &&
        boardColumn < blockSize &&
        !blockBoard[boardRow][boardColumn]
      );
    });
  }

  function anyBlockShapeFits() {
    const candidates = blockPieces.filter((shapeIndex) => shapeIndex !== null);
    if (blockMode === "hold" && blockHeldShape !== null) {
      candidates.push(blockHeldShape);
    }

    return candidates.some((shapeIndex) => {
      for (let row = 0; row < blockSize; row += 1) {
        for (let column = 0; column < blockSize; column += 1) {
          if (blockShapeFits(shapeIndex, row, column)) {
            return true;
          }
        }
      }
      return false;
    });
  }

  function drawShapePreview(container, shapeIndex) {
    container.replaceChildren();
    if (shapeIndex === null || shapeIndex === undefined) {
      return;
    }

    const preview = document.createElement("span");
    preview.className = "shape-preview";
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        const square = document.createElement("i");
        const occupied = blockShapes[shapeIndex].some(
          ([shapeRow, shapeColumn]) => shapeRow === row && shapeColumn === column,
        );
        if (occupied) {
          square.classList.add(`shape-color-${(shapeIndex % 5) + 1}`);
        } else {
          square.className = "is-empty";
        }
        preview.append(square);
      }
    }
    container.append(preview);
  }

  function renderBlockBoard() {
    blockBoardElement.replaceChildren();
    blockBoardElement.style.setProperty("--board-size", String(blockSize));
    blockBoardElement.setAttribute(
      "aria-label",
      `BlockBlast ${blockSize} by ${blockSize} board`,
    );

    for (let row = 0; row < blockSize; row += 1) {
      for (let column = 0; column < blockSize; column += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "block-cell";
        cell.dataset.row = String(row);
        cell.dataset.column = String(column);
        cell.setAttribute("role", "gridcell");

        const color = blockBoard[row][column];
        if (color) {
          cell.classList.add("is-filled", `block-color-${color}`);
        }

        if (blockPreview && blockPreview.cells.has(`${row},${column}`)) {
          cell.classList.add(blockPreview.valid ? "is-preview-valid" : "is-preview-invalid");
        }
        cell.setAttribute(
          "aria-label",
          `Row ${row + 1}, column ${column + 1}${color ? ", filled" : ""}`,
        );
        blockBoardElement.append(cell);
      }
    }
  }

  function renderBlockPieces() {
    blockPiecesElement.replaceChildren();
    blockPieces.forEach((shapeIndex, pieceIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "shape-option";
      button.dataset.pieceIndex = String(pieceIndex);
      button.disabled = shapeIndex === null || blockFinished;
      button.setAttribute("aria-pressed", String(blockSelectedPiece === pieceIndex));
      button.setAttribute(
        "aria-label",
        shapeIndex === null ? `Piece ${pieceIndex + 1}, used` : `Select piece ${pieceIndex + 1}`,
      );
      if (blockSelectedPiece === pieceIndex) {
        button.classList.add("is-selected");
      }
      drawShapePreview(button, shapeIndex);
      blockPiecesElement.append(button);
    });
  }

  function renderBlockHold() {
    const isHoldMode = blockMode === "hold";
    blockHoldWrap.hidden = !isHoldMode;
    blockHoldButton.disabled = blockHoldUsedThisTurn || blockFinished;
    blockHoldButton.setAttribute("aria-pressed", String(blockHoldArmed));
    blockHoldButton.setAttribute(
      "aria-label",
      blockHeldShape === null ? "Store a selected shape in the empty hold slot" : "Swap a selected shape with the held shape",
    );
    blockHoldLabel.textContent = blockHoldUsedThisTurn
      ? "hold · used this turn"
      : blockHeldShape === null
        ? "hold · choose a piece"
        : "hold · swap with this piece";
    drawShapePreview(blockHoldPreview, blockHeldShape);
  }

  function motionIsReduced() {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function animateBlockClears(rows, columns) {
    if (motionIsReduced() || typeof Element.prototype.animate !== "function") return;
    const rect = blockBoardElement.getBoundingClientRect();
    const overlay = blockBoardElement.cloneNode(true);
    overlay.removeAttribute("id");
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: "0",
      zIndex: "1000",
      pointerEvents: "none",
    });
    document.body.append(overlay);

    const rowSet = new Set(rows);
    const columnSet = new Set(columns);
    const animations = [];
    overlay.querySelectorAll(".block-cell").forEach((cell) => {
      const row = Number(cell.dataset.row);
      const column = Number(cell.dataset.column);
      if (!rowSet.has(row) && !columnSet.has(column)) return;
      animations.push(cell.animate(
        [
          { transform: "scale(1) rotate(0deg)", opacity: 1 },
          { transform: "scale(.15) rotate(12deg)", opacity: 0 },
        ],
        { duration: 230, delay: (row + column) * 9, easing: "cubic-bezier(.3,0,.7,1)", fill: "forwards" },
      ));
    });
    Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
      .then(() => overlay.remove());
  }

  function animateBlockPlacement(shape, top, left, clearedLineCount) {
    if (motionIsReduced() || typeof Element.prototype.animate !== "function") return;
    shape.forEach(([dr, dc], index) => {
      const cell = blockBoardElement.querySelector(`[data-row="${top + dr}"][data-column="${left + dc}"]`);
      if (!cell || !cell.classList.contains("is-filled")) return;
      cell.animate(
        [
          { transform: "scale(.55)", opacity: 0.45 },
          { transform: "scale(1.08)", opacity: 1, offset: 0.72 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 210, delay: index * 18, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    });
    if (clearedLineCount > 0) {
      blockBoardElement.animate(
        [
          { filter: "brightness(1)" },
          { filter: "brightness(1.45)" },
          { filter: "brightness(1)" },
        ],
        { duration: 260, easing: "ease-out" },
      );
    }
  }

  function renderBlockGame() {
    renderBlockBoard();
    renderBlockPieces();
    renderBlockHold();
    blockScoreElement.textContent = String(blockScore);
    renderBlockCombo();
    blockMovesElement.textContent = blockMode === "limited" ? `${blockMoves} / 50` : String(blockMoves);
    blockDailyHeader.hidden = blockMode !== "daily";
    if (blockMode === "daily") {
      blockDailyDate.textContent = dateKeyToShortDate(blockDailyKey);
      blockDailyBest.textContent = String(readDailyBlockBest());
      blockLeaderboardDate.textContent = `leaderboard · ${dateKeyToShortDate(blockDailyKey)}`;
    }
  }

  function readDailyBlockBest() {
    try {
      const value = Number(window.localStorage.getItem(`alone.block.daily.${blockDailyKey}`));
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      console.error("Could not read the daily BlockBlast score.", error);
      return 0;
    }
  }

  function saveDailyBlockBest() {
    if (blockMode !== "daily") {
      return;
    }
    try {
      const best = readDailyBlockBest();
      if (blockScore > best) {
        window.localStorage.setItem(`alone.block.daily.${blockDailyKey}`, String(blockScore));
      }
    } catch (error) {
      console.error("Could not save the daily BlockBlast score.", error);
    }
  }

  function getBlockPlayerId() {
    const savedId = readSavedValue("alone.block.player-id.v1");
    if (typeof savedId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(savedId)) {
      return savedId;
    }

    if (!window.crypto || typeof window.crypto.randomUUID !== "function") {
      throw new Error("This browser cannot create a private leaderboard ID.");
    }
    const playerId = window.crypto.randomUUID();
    if (!writeSavedValue("alone.block.player-id.v1", playerId)) {
      throw new Error("Could not save the private leaderboard ID in browser storage.");
    }
    return playerId;
  }

  async function blockLeaderboardRequest(url, options) {
    const response = await fetch(url, options);
    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error(`The leaderboard returned invalid JSON (HTTP ${response.status}).`, { cause: error });
    }
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error("The shared leaderboard is not configured on the server yet.");
      }
      if (response.status === 429) {
        throw new Error("Too many leaderboard requests. Please try again later.");
      }
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : `The leaderboard request failed with HTTP ${response.status}.`,
      );
    }
    return payload;
  }

  async function loadBlockLeaderboard() {
    blockLeaderboardMessage.textContent = "Loading scores…";
    blockLeaderboardList.replaceChildren();
    try {
      const playerId = getBlockPlayerId();
      const query = new URLSearchParams({
        date: blockDailyKey,
        playerId,
      });
      const payload = await blockLeaderboardRequest(
        `/api/blockblast-leaderboard?${query}`,
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      if (
        !payload ||
        !Array.isArray(payload.players) ||
        !Number.isInteger(payload.playerCount) ||
        payload.playerCount < payload.players.length
      ) {
        throw new Error("The leaderboard response has an invalid shape.");
      }

      blockLeaderboardMessage.textContent = payload.playerCount === 0
        ? "No runs yet — be the first."
        : `${payload.playerCount} ${payload.playerCount === 1 ? "player" : "players"}`;
      payload.players.forEach((player, index) => {
        if (
          !player ||
          !Number.isInteger(player.rank) ||
          typeof player.name !== "string" ||
          !Number.isSafeInteger(player.score) ||
          player.score < 0
        ) {
          throw new Error("The leaderboard contains an invalid score entry.");
        }
        const row = document.createElement("li");
        const rank = document.createElement("span");
        rank.textContent = String(player.rank || index + 1);
        const name = document.createElement("span");
        name.textContent = player.name;
        const score = document.createElement("strong");
        score.textContent = String(player.score);
        row.append(rank, name, score);
        blockLeaderboardList.append(row);
      });
    } catch (error) {
      console.error("Could not load the daily BlockBlast leaderboard.", error);
      blockLeaderboardMessage.textContent = error.message;
    }
  }

  async function submitDailyBlockScore() {
    blockDailyStatus.textContent = "Submitting your daily score…";
    try {
      const payload = await blockLeaderboardRequest("/api/blockblast-leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          date: blockDailyKey,
          playerId: getBlockPlayerId(),
          score: blockScore,
        }),
      });
      if (!Number.isSafeInteger(payload.score) || payload.score < blockScore) {
        throw new Error("The leaderboard did not confirm the submitted score.");
      }
      blockDailyStatus.textContent = "Daily score submitted.";
      if (blockLeaderboardDialog.open) {
        loadBlockLeaderboard();
      }
    } catch (error) {
      console.error("Could not submit the daily BlockBlast score.", error);
      blockDailyStatus.textContent = error.message;
    }
  }

  function startBlockGame(mode = blockMode) {
    if (blockLeaderboardDialog.open) {
      blockLeaderboardDialog.close();
    }
    blockMode = mode;
    blockSize = mode === "big" ? 10 : 8;
    blockDailyKey = currentUtcDateKey();
    blockRandom = mode === "daily"
      ? seededRandom(`alone-block-${blockDailyKey}`)
      : Math.random;
    blockBoard = Array.from({ length: blockSize }, () => Array(blockSize).fill(0));
    blockHeldShape = null;
    blockHoldArmed = false;
    blockHoldUsedThisTurn = false;
    blockPreview = null;
    blockScore = 0;
    blockMoves = 0;
    blockCombo = 0;
    blockFinished = false;
    blockRun = newBlockRun();
    refillBlockPieces();

    blockModeTabs.forEach((tab) => {
      const selected = tab.dataset.blockMode === blockMode;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });

    if (!blockLifetimeStats.modesPlayed.includes(mode)) {
      blockLifetimeStats.modesPlayed.push(mode);
      saveBlockStats();
    }
    blockStatusElement.textContent = mode === "limited"
      ? "Place blocks and score as much as you can in 50 moves."
      : mode === "daily"
        ? "Today's board is the same for everyone."
        : "Choose a piece, then place it on the board.";
    blockDailyStatus.textContent = mode === "daily"
      ? "Your score is shared when this daily run ends."
      : "";
    checkBlockAchievements();
    renderBlockGame();
  }

  function clearBlockPreview() {
    blockPreview = null;
    blockBoardElement.querySelectorAll(".is-preview-valid, .is-preview-invalid").forEach((cell) => {
      cell.classList.remove("is-preview-valid", "is-preview-invalid");
    });
  }

  function updateBlockPreview(row, column, pieceIndex) {
    const shapeIndex = blockPieces[pieceIndex];
    if (shapeIndex === null || shapeIndex === undefined) {
      return;
    }

    const shape = blockShapes[shapeIndex];
    const cells = new Set(shape.map(([shapeRow, shapeColumn]) =>
      `${row + shapeRow},${column + shapeColumn}`
    ));
    blockPreview = {
      row,
      column,
      cells,
      valid: blockShapeFits(shapeIndex, row, column),
    };
    blockStatusElement.textContent = blockPreview.valid
      ? "Release to place the shape."
      : "That shape does not fit there.";
    renderBlockBoard();
  }

  function swapBlockHold(pieceIndex) {
    const shapeIndex = blockPieces[pieceIndex];
    if (shapeIndex === null || shapeIndex === undefined || blockHoldUsedThisTurn) {
      return;
    }

    // An empty hold slot leaves this tray slot empty; the tray refills when all three slots are empty.
    blockPieces[pieceIndex] = blockHeldShape;
    blockHeldShape = shapeIndex;
    blockHoldUsedThisTurn = true;
    blockHoldArmed = false;
    blockSelectedPiece = -1;
    blockRun.usedHold = true;
    if (blockPieces.every((piece) => piece === null)) {
      refillBlockPieces();
    }
    blockStatusElement.textContent = "Shape stored. Place a block to use hold again.";
    checkBlockAchievements();
    if (!anyBlockShapeFits()) {
      finishBlockGame(`No more possible placements. Final score: ${blockScore}.`);
    }
    renderBlockGame();
  }

  function finishBlockGame(message, limitedRunFinished = false) {
    if (blockFinished) {
      return;
    }
    blockFinished = true;
    blockRun.finishedLimited = limitedRunFinished;
    blockStatusElement.textContent = message;
    if (limitedRunFinished) {
      checkBlockAchievements();
    }
    if (blockMode === "daily" && blockMoves > 0) {
      submitDailyBlockScore();
    }
  }

  function placeBlockShape(pieceIndex, top, left) {
    const shapeIndex = blockPieces[pieceIndex];
    if (shapeIndex === null || shapeIndex === undefined || blockFinished) {
      return false;
    }
    if (!blockShapeFits(shapeIndex, top, left)) {
      blockStatusElement.textContent = "That shape does not fit there.";
      return false;
    }

    const shape = blockShapes[shapeIndex];
    shape.forEach(([row, column]) => {
      blockBoard[top + row][left + column] = (shapeIndex % 5) + 1;
    });
    blockPieces[pieceIndex] = null;
    blockSelectedPiece = -1;
    blockPreview = null;
    blockMoves += 1;
    blockRun.placements += 1;
    blockLifetimeStats.totalPlacements += 1;
    blockHoldUsedThisTurn = false;

    const fullRows = blockBoard
      .map((row, rowIndex) => row.every(Boolean) ? rowIndex : -1)
      .filter((rowIndex) => rowIndex >= 0);
    const fullColumns = Array.from({ length: blockSize }, (_, columnIndex) => columnIndex)
      .filter((columnIndex) => blockBoard.every((row) => row[columnIndex]));
    const clearedLineCount = fullRows.length + fullColumns.length;

    if (clearedLineCount > 0) {
      renderBlockBoard();
      animateBlockClears(fullRows, fullColumns);
    }

    if (clearedLineCount > 0) {
      // Snapshot complete lines before clearing so row/column intersections score only once.
      const clearedRows = new Set(fullRows);
      const clearedColumns = new Set(fullColumns);
      for (let row = 0; row < blockSize; row += 1) {
        for (let column = 0; column < blockSize; column += 1) {
          if (clearedRows.has(row) || clearedColumns.has(column)) {
            blockBoard[row][column] = 0;
          }
        }
      }
      blockCombo += 1;
      blockRun.combo = Math.max(blockRun.combo, blockCombo);
      blockRun.comboMisses = 0;
      blockRun.linesAtOnce = Math.max(blockRun.linesAtOnce, clearedLineCount);
      blockLifetimeStats.totalLines += clearedLineCount;
      if (blockHaptics.checked && typeof navigator.vibrate === "function") {
        navigator.vibrate(clearedLineCount > 1 ? [35, 25, 55] : 45);
      }
    } else {
      blockRun.comboMisses += 1;
      if (blockRun.comboMisses > 2) {
        blockCombo = 0;
        blockRun.comboMisses = 0;
      }
    }

    const boardCleared = clearedLineCount > 0 && blockBoard.every(row => row.every(value => value === 0));
    let linePoints = 0;
    if (clearedLineCount === 1) {
      linePoints = 10 * blockCombo;
    } else if (clearedLineCount > 1) {
      linePoints = 10 * blockCombo * clearedLineCount * (clearedLineCount - 1);
    }
    const boardClearBonus = boardCleared ? 300 : 0;
    const pointsGained = shape.length + linePoints + boardClearBonus;
    blockScore += pointsGained;
    blockRun.score = blockScore;

    // Floating score pop-up at the placed piece centre
    if (clearedLineCount > 0 || boardClearBonus > 0) {
      const rect = blockBoardElement.getBoundingClientRect();
      const cellSize = rect.width / blockSize;
      const shapeH = Math.max(...shape.map(([dr]) => dr)) + 1;
      const shapeW = Math.max(...shape.map(([, dc]) => dc)) + 1;
      const cx = rect.left + (left + shapeW / 2) * cellSize;
      const cy = rect.top + (top + shapeH / 2) * cellSize;
      spawnFloatingPoints(cx, cy, pointsGained);
    }

    if (blockPieces.every((shapeItem) => shapeItem === null)) {
      refillBlockPieces();
    }

    blockHoldArmed = false;
    saveDailyBlockBest();
    saveBlockStats();
    checkBlockAchievements();

    if (blockMode === "limited" && blockMoves >= 50) {
      finishBlockGame(`50 moves complete. Final score: ${blockScore}.`, true);
    } else if (!anyBlockShapeFits()) {
      finishBlockGame(`No more possible placements. Final score: ${blockScore}.`);
    } else {
      blockStatusElement.textContent = clearedLineCount > 0
        ? `Cleared ${clearedLineCount} ${clearedLineCount === 1 ? "line" : "lines"}${blockCombo > 1 ? ` · ${blockCombo}× combo` : ""}.`
        : "Nice. Keep placing blocks.";
    }

    renderBlockGame();
    animateBlockPlacement(shape, top, left, clearedLineCount);
    return true;
  }

  function selectBlockPiece(pieceIndex) {
    if (blockHoldArmed) {
      swapBlockHold(pieceIndex);
      return;
    }
    blockSelectedPiece = pieceIndex;
    blockStatusElement.textContent = "Tap a board cell or drag this shape into place.";
    renderBlockPieces();
  }

  blockModeTabs.forEach((tab) => {
    tab.addEventListener("click", () => startBlockGame(tab.dataset.blockMode));
  });

  blockPiecesElement.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".shape-option");
    if (!button || button.disabled || event.button !== 0) {
      return;
    }
    blockDraggingPiece = Number(button.dataset.pieceIndex);
    blockSelectedPiece = blockDraggingPiece;
    blockIgnoreNextPieceClick = false;
    event.preventDefault();

    // Create drag ghost following the cursor
    const shapeIndex = blockDraggingPiece;
    const shape = blockShapes[shapeIndex];
    const maxR = Math.max(...shape.map(([dr]) => dr));
    const maxC = Math.max(...shape.map(([, dc]) => dc));
    const cellSize = 40;
    blockDragGhostOffset.x = (maxC / 2) * cellSize; // centre ghost on cursor
    blockDragGhostOffset.y = (maxR / 2) * cellSize;
    createDragGhost(shapeIndex);
    updateDragGhost(event.clientX, event.clientY);
  });

  document.addEventListener("pointermove", (event) => {
    if (blockDraggingPiece < 0 || document.getElementById("game-blocks").hidden) {
      return;
    }
    updateDragGhost(event.clientX, event.clientY);
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const cell = target && target.closest(".block-cell");
    if (!cell || !blockBoardElement.contains(cell)) {
      clearBlockPreview();
      return;
    }
    updateBlockPreview(Number(cell.dataset.row), Number(cell.dataset.column), blockDraggingPiece);
  });

  document.addEventListener("pointerup", (event) => {
    if (blockDraggingPiece < 0) {
      return;
    }
    const pieceIndex = blockDraggingPiece;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const cell = target && target.closest(".block-cell");
    const holdSlot = target && target.closest("#block-hold-button");

    if (holdSlot && blockMode === "hold") {
      swapBlockHold(pieceIndex);
    } else if (cell && blockBoardElement.contains(cell)) {
      placeBlockShape(pieceIndex, Number(cell.dataset.row), Number(cell.dataset.column));
    } else {
      clearBlockPreview();
      blockSelectedPiece = pieceIndex;
      renderBlockPieces();
    }

    blockDraggingPiece = -1;
    blockIgnoreNextPieceClick = true;
    removeDragGhost();
    window.setTimeout(() => {
      blockIgnoreNextPieceClick = false;
    }, 0);
  });

  document.addEventListener("pointercancel", () => {
    if (blockDraggingPiece >= 0) {
      blockDraggingPiece = -1;
      clearBlockPreview();
      removeDragGhost();
    }
  });

  blockPiecesElement.addEventListener("click", (event) => {
    if (blockIgnoreNextPieceClick) {
      blockIgnoreNextPieceClick = false;
      return;
    }
    const button = event.target.closest(".shape-option");
    if (!button || button.disabled) {
      return;
    }
    selectBlockPiece(Number(button.dataset.pieceIndex));
  });

  blockBoardElement.addEventListener("click", (event) => {
    const cell = event.target.closest(".block-cell");
    if (!cell || blockSelectedPiece < 0 || blockFinished) {
      return;
    }
    placeBlockShape(
      blockSelectedPiece,
      Number(cell.dataset.row),
      Number(cell.dataset.column),
    );
  });

  blockHoldButton.addEventListener("click", () => {
    if (blockHoldUsedThisTurn) {
      return;
    }
    blockHoldArmed = !blockHoldArmed;
    blockHoldButton.setAttribute("aria-pressed", String(blockHoldArmed));
    blockStatusElement.textContent = blockHoldArmed
      ? "Choose a piece to store or swap."
      : "Hold cancelled.";
  });

  document.getElementById("blocks-reset").addEventListener("click", () => {
    startBlockGame(blockMode);
  });
  blockLeaderboardOpen.addEventListener("click", () => {
    blockLeaderboardDate.textContent = `leaderboard · ${dateKeyToShortDate(blockDailyKey)}`;
    if (typeof blockLeaderboardDialog.showModal === "function") {
      blockLeaderboardDialog.showModal();
    }
    loadBlockLeaderboard();
  });
  try {
    blockHaptics.checked = window.localStorage.getItem("alone.block.haptics") !== "false";
  } catch (error) {
    blockHaptics.checked = true;
    console.error("Could not read the vibration setting.", error);
  }
  blockHaptics.addEventListener("change", () => {
    try {
      window.localStorage.setItem("alone.block.haptics", String(blockHaptics.checked));
    } catch (error) {
      console.error("Could not save the vibration setting.", error);
    }
  });

  renderBlockAchievements();
  startBlockGame("classic");

  // Animation loop: floating scores + drag ghost
  let lastTime = performance.now();
  function animate(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    updateFloatingScores(delta);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // Curated answer lists keep daily and endless games available without a dictionary service.
  const wordAnswers = {
    4: [
      "ABLE ALSO AREA ARMY AWAY BABY BACK BALL BAND BANK",
      "BASE BEAR BEAT BELL BIRD BLUE BOAT BODY BOOK BORN",
      "BOTH CALL CALM CAME CAMP CARD CARE CASE CASH CAST",
      "CITY CLUB COAL COAT CODE COLD COME COOK COOL COPY",
      "CORE COST DARK DATA DATE DAWN DEAD DEAL DEAR DEEP",
      "DESK DIAL DIET DOOR DOWN DRAW DROP DUST DUTY EACH",
      "EARN EASE EAST EASY EDGE ELSE EVEN EVER EXIT FACE",
      "FACT FAIL FAIR FALL FARM FAST FEAR FEED FEEL FILE",
      "FILL FILM FIND FINE FIRE FISH FIVE FLAG FLAT FLOW",
      "FOOD FOOT FORM FOUR FREE FULL GAME GATE GAVE GEAR",
      "GIFT GIRL GIVE GLAD GOAL GOES GOLD GONE GOOD GRAB",
      "GRAY GREW GROW HAIR HALF HALL HAND HANG HARD HAVE",
      "HEAD HEAR HEAT HELD HELP HERE HERO HIGH HILL HIRE",
      "HOLD HOLE HOME HOPE HOST HOUR HUGE HUNT IDEA INTO",
      "IRON ITEM JOIN JUMP JUNE JUST KEEP KEPT KIDS KIND",
      "KING KNEW KNOW LACK LADY LAKE LAND LAST LATE LEAD",
      "LEFT LESS LIFE LIFT LIKE LINE LINK LIST LIVE LOAD",
      "LOAN LOCK LONG LOOK LOSE LOST LOVE LUCK MADE MAIL",
      "MAIN MAKE MANY MARK MATH MEAL MEAN MEAT MEET MILE",
      "MILK MIND MINE MISS MODE MOOD MOON MORE MOST MOVE",
      "MUCH MUST NAME NEAR NECK NEED NEWS NEXT NICE NINE",
      "NONE NOSE NOTE ONCE ONLY OPEN OVER PAGE PAID PAIN",
      "PAIR PARK PART PASS PAST PATH PEAK PICK PINK PLAN",
      "PLAY PLOT PLUS POOL POOR PORT POST PULL PURE PUSH",
      "QUIT RACE RAIN RANK RATE READ REAL REAR REST RICE",
      "RICH RIDE RING RISE RISK ROAD ROCK ROLE ROLL ROSE",
      "RULE SAFE SAIL SALE SALT SAME SAND SAVE SEAT SEED",
      "SEEK SEEM SEEN SELF SELL SEND SENT SHIP SHOP SHOW",
      "SHUT SIDE SIGN SITE SIZE SKIN SLOW SNOW SOFT SOLD",
      "SOME SONG SOON SORT SOUL SPOT STAR STAY STEP STOP",
      "SUCH SUIT SURE TAKE TALE TALK TALL TANK TAPE TASK",
      "TEAM TECH TELL TEND TERM TEST TEXT THAN THAT THEM",
      "THEN THEY THIN THIS TIDE TIME TINY TOLD TONE TOOK",
      "TOOL TOUR TOWN TREE TRIP TRUE TUNE TURN TYPE UNIT",
      "UPON USED USER VARY VAST VERY VIEW WAIT WAKE WALK",
      "WALL WANT WARM WASH WAVE WEAR WEEK WELL WENT WERE",
      "WEST WHAT WHEN WIDE WIFE WILD WILL WIND WINE WING",
      "WIRE WISE WISH WITH WOOD WORD WORK YEAR YOUR ZERO",
      "ZONE"
    ].join(" ").split(" "),
    5: [
      "ABOUT ABOVE ABUSE ACTOR ADAPT ADMIT ADOPT ADULT AFTER AGAIN",
      "AGENT AGREE AHEAD ALARM ALBUM ALERT ALIEN ALLOW ALONE ALONG",
      "ALTER AMONG ANGEL ANGLE ANGRY APPLE APPLY ARENA ARISE ARRAY",
      "AUDIO AVOID AWAKE BADLY BAKER BASIC BEACH BEGIN BELOW BENCH",
      "BIRTH BLACK BLAME BLANK BLAST BLEND BLIND BLOCK BLOOM BOARD",
      "BRAIN BREAD BREAK BRICK BRIDE BRING BROAD BROKE BROWN BUILD",
      "BUILT CABLE CARRY CATCH CAUSE CHAIN CHAIR CHART CHASE CHEAP",
      "CHECK CHEST CHIEF CHILD CHINA CHOSE CIVIL CLAIM CLASS CLEAN",
      "CLEAR CLICK CLOCK CLOSE COACH COAST COLOR COULD COUNT COURT",
      "COVER CRAFT CRANE CRAZY CREAM CRIME CROSS CROWD CROWN CURVE",
      "CYCLE DAILY DANCE DEATH DEPTH DIRTY DOUBT DOZEN DRAFT DRAMA",
      "DREAM DRESS DRINK DRIVE EARLY EARTH EIGHT ENJOY ENTER EQUAL",
      "ERROR EVENT EVERY EXACT EXIST EXTRA FAITH FALSE FAULT FIBER",
      "FIELD FIFTH FIFTY FIGHT FINAL FIRST FIXED FLASH FLOOR FOCUS",
      "FORCE FORTH FORTY FOUND FRAME FRESH FRONT FRUIT FULLY FUNNY",
      "GIANT GIVEN GLASS GLOBE GOING GRACE GRADE GRAND GRANT GRASS",
      "GREAT GREEN GROUP GROWN GUARD GUESS GUEST GUIDE HAPPY HEART",
      "HEAVY HELLO HONEY HORSE HOTEL HOUSE HUMAN IDEAL IMAGE INDEX",
      "INNER INPUT ISSUE JUDGE KNOWN LATER LAUGH LAYER LEARN LEAST",
      "LEAVE LEVEL LIGHT LIMIT LOCAL LOOSE LUCKY LUNCH MAGIC MAJOR",
      "MAKER MARCH MATCH MAYBE MAYOR MEANT MEDIA METAL MIGHT MINOR",
      "MODEL MONEY MONTH MORAL MOTOR MOUNT MOUSE MOUTH MOVIE MUSIC",
      "NERVE NEVER NIGHT NOISE NORTH NOTED NOVEL NURSE OFFER OFTEN",
      "ORDER OTHER PAINT PANEL PAPER PARTY PEACE PLACE PLAIN PLANE",
      "PLANT PLATE POINT POWER PRESS PRICE PRIDE PRIME PRINT PRIOR",
      "PROOF PROUD QUEEN QUICK QUIET QUITE RADIO RAISE RANGE RAPID",
      "RATIO REACH READY REFER RIGHT RIVER ROUND ROUTE ROYAL RURAL",
      "SCALE SCENE SCOPE SCORE SENSE SERVE SEVEN SHALL SHAPE SHARE",
      "SHARP SHEET SHELF SHELL SHIFT SHINE SHIRT SHOCK SHOOT SHORT",
      "SHOWN SIGHT SINCE SKILL SLEEP SLATE SMALL SMART SMILE SMOKE",
      "SOLID SOLVE SORRY SOUND SOUTH SPACE SPARE SPEAK SPEED SPEND",
      "SPENT SPICE SPITE SPLIT SPOKE SPORT STAGE STAND START STATE",
      "STEAM STEEL STEEP STICK STILL STOCK STONE STOOD STORE STORM",
      "STORY STUDY STUFF STYLE SUGAR SUPER SWEET TABLE TAKEN TASTE",
      "TEACH THANK THEIR THERE THESE THING THINK THIRD THOSE THREE",
      "THROW TIGHT TIMES TIRED TITLE TODAY TOKEN TOTAL TOUCH TOUGH",
      "TOWER TRACK TRADE TRAIN TREAT TREND TRIAL TRIBE TRICK TRIED",
      "TRULY TRUST TRUTH TWICE UNDER UNION UNITY UNTIL UPPER UPSET",
      "URBAN USAGE USUAL VALUE VIDEO VISIT VITAL VOICE WASTE WATCH",
      "WATER WEIGH WHILE WHITE WHOLE WHOSE WOMAN WOMEN WORLD WORRY",
      "WORSE WORST WORTH WOULD WRITE WRONG WROTE YOUNG YOUTH"
    ].join(" ").split(" "),
    6: [
      "ABROAD ACCEPT ACCESS ACROSS ACTION ACTIVE ACTUAL ADVICE AFFECT AFFORD",
      "ALMOST ALWAYS AMOUNT ANIMAL ANSWER ANYONE APPEAL APPEAR ASPECT ASSUME",
      "ATTACK ATTEND AUTHOR BACKUP BEAUTY BECOME BEFORE BEHIND BELIEF BETTER",
      "BOTTOM BRANCH BREATH BRIDGE BRIGHT BROKEN BUDGET CAMERA CANCER CANNOT",
      "CAREER CASUAL CAUGHT CENTER CHANCE CHANGE CHARGE CHOICE CHOOSE CHURCH",
      "CIRCLE CLIENT CLOSED COFFEE COMMON COURSE CREATE CREDIT DANGER DECIDE",
      "DECIDE DEFEAT DEFEND DEGREE DEMAND DEPLOY DEPTHS DESIGN DETAIL DIFFER",
      "DINNER DIRECT DOCTOR DRIVER DURING EASILY EFFECT EFFORT EIGHTH EITHER",
      "ENERGY ENGAGE ENSURE ENTIRE ESCAPE ESTATE ETHICS EXCEPT EXCESS EXPAND",
      "EXPECT EXPERT EXPORT EXTENT FAMILY FAMOUS FATHER FELLOW FIGURE FINGER",
      "FINISH FOLLOW FOSTER FRIEND FUTURE GARDEN GATHER GENDER GLOBAL GROWTH",
      "HANDLE HAPPEN HEALTH HEIGHT HONEST IMPACT IMPORT INCOME INDEED INFORM",
      "INJURY INSIDE INTEND ISLAND ITSELF JUNIOR KEEPER KILLER LABOUR LATEST",
      "LAUNCH LAWYER LEADER LEAGUE LENGTH LESSON LETTER LIKELY LIMITS LIVING",
      "MAINLY MANAGE MANNER MARKET MASTER MATTER MEMBER MEMORY MENTAL METHOD",
      "MIDDLE MINUTE MIRROR MOBILE MODERN MOMENT MOSTLY MOTHER MOVING MURDER",
      "NATURE NEARLY NOTICE NUMBER OBJECT OFFICE OPTION ORANGE ORIGIN OUTPUT",
      "PARENT PEOPLE PERIOD PERSON PHRASE PICKED PLANET PLAYER PLEASE PLENTY",
      "POCKET POINTS POLICY PRETTY PRINCE PRISON PROFIT PUBLIC RATHER READER",
      "REALLY REASON RECENT RECORD REDUCE REGION RELATE RELIEF REMAIN REMOTE",
      "REMOVE REPAIR REPEAT REPORT RESULT RETURN REVIEW SAFETY SAMPLE SCHOOL",
      "SCREEN SEARCH SEASON SECOND SECRET SECTOR SENIOR SERIES SERVED SERVER",
      "SETTLE SEVERE SHOULD SIGNAL SILVER SIMPLE SINGLE SISTER SKILLS SOCIAL",
      "SOURCE SPEECH SPIRIT SPOKEN SPREAD SPRING SQUARE STABLE STATUS STREAM",
      "STREET STRONG SUMMER SUPPLY SYSTEM TABLES TAKING TARGET TAUGHT TENANT",
      "THEORY THIRTY THREAT TICKET TIMING TISSUE TOWARD TRAVEL TREATY TRYING",
      "TWELVE TWENTY UNABLE UNIQUE UNITED UNLESS UNLIKE UPDATE USEFUL VALLEY",
      "VARIED VENDOR VICTIM VIEWER VOLUME WANTED WEALTH WEIGHT WINDOW WINTER",
      "WITHIN WONDER WORKER"
    ].join(" ").split(" "),
    7: [
      "ABILITY ABSENCE ACCOUNT ACHIEVE ADDRESS ADVANCE AGAINST AIRPORT ALREADY ANALYST",
      "ANCIENT ANOTHER ANXIETY ANYBODY ARRANGE ARTICLE ATTEMPT BALANCE BATTERY BECAUSE",
      "BELIEVE BENEFIT BETWEEN BROTHER CAPABLE CAPTAIN CAREFUL CARRIER CENTRAL CENTURY",
      "CERTAIN CHAMBER CHAPTER CLOSING COMBINE COMFORT COMMAND COMMENT COMPANY COMPARE",
      "COMPLEX CONCERN CONCERT CONDUCT CONFIRM CONNECT CONSENT CONSUME CONTACT CONTAIN",
      "CONTENT CONTROL CONVERT CORRECT COUNTER COUNTRY COURAGE COVERED CREATED CREATOR",
      "CRYSTAL CURRENT DECIDED DECLARE DEFAULT DEFENCE DELIVER DENSITY DESERVE DESKTOP",
      "DESTINY DEVELOP DIGITAL DISCUSS DISPLAY DISTANT DRAWING DRIVING DYNAMIC ECONOMY",
      "EDITION EDUCATE ELEGANT ELEMENT EMOTION ENABLED ENDLESS ENHANCE EQUALLY EVENING",
      "EVIDENT EXAMPLE EXCITED EXPENSE EXPLAIN EXPLORE EXPRESS FAILURE FEATURE FEDERAL",
      "FEELING FICTION FINANCE FOUNDER FREEDOM FURTHER GENERAL GENUINE GRAVITY GROCERY",
      "GROWING HABITAT HEADING HEALTHY HEARING HISTORY HONESTY HUNDRED IMAGINE IMPACTS",
      "IMPROVE INCLUDE INITIAL INQUIRY INSIGHT INSPIRE INSTALL INSTANT INSTEAD INTENSE",
      "INVOLVE ISOLATE JOURNAL JOURNEY JUSTICE KEEPING KITCHEN LARGELY LEARNED LIBRARY",
      "LICENSE LOYALTY MACHINE MANAGER MARRIED MEASURE MEDICAL MEETING MENTION MESSAGE",
      "MILLION MINIMUM MIRACLE MISSION MISTAKE MONITOR MORNING MUSICAL NATURAL NEITHER",
      "NETWORK NEUTRAL NOTHING NURSING OBJECTS OBSERVE OBVIOUS OFFICER ONBOARD OPENING",
      "OPINION ORDINAL ORGANIC OUTCOME OUTSIDE OVERALL PACKAGE PAINFUL PAINTER PANTHER",
      "PARENTS PARTNER PASSION PATIENT PATTERN PAYMENT PICTURE PIONEER PLASTIC POPULAR",
      "PORTION POTTERY POWERED PRECISE PREDICT PREPARE PRESENT PREVENT PRIMARY PRINTED",
      "PRIVATE PROBLEM PROCESS PRODUCE PRODUCT PROFILE PROGRAM PROJECT PROMISE PROTECT",
      "PROVIDE PURPOSE QUALITY QUARTER QUICKLY RADICAL RAILWAY READING REALITY RECEIVE",
      "RECOVER REFLECT REGULAR RELATED RELEASE REMAINS REMARKS REPLACE REPLIED REQUEST",
      "REQUIRE RESERVE RESOLVE RESPECT RESPOND REVENUE REVERSE RISKING ROLLING ROMANCE",
      "ROUTINE RUNNING SATISFY SCIENCE SECTION SEGMENT SERIOUS SERVICE SESSION SETTING",
      "SEVENTH SEVERAL SHALLOW SHARING SHELTER SHIPPED SHORTLY SHOWING SILENCE SIMILAR",
      "SIMPLEX SINCERE SINGING SITUATE SKILLED SMILING SOCIETY SOMEHOW SOMEONE SPEAKER",
      "SPECIAL SPONSOR STATION STORAGE STRANGE STRETCH STUDENT SUBJECT SUCCESS SUGGEST",
      "SUMMARY SUPPORT SUPPOSE SURFACE SURVIVE TEACHER TENSION THUNDER TICKETS TONIGHT",
      "TOTALLY TOURISM TOWARDS TRAFFIC TRANSIT TROUBLE UNIFORM UNKNOWN UNUSUAL UPGRADE",
      "USELESS VALIDLY VARIETY VEHICLE VERSION VICTORY VILLAGE VIRTUAL VISIBLE VISITOR",
      "WELCOME WHETHER WILLING WITHOUT WORKING WRITING"
    ].join(" ").split(" "),
  };

  const russianWordAnswers = {
    4: "БЕДА ВЕРА ВОДА ВОЗА ДВОР ДЕЛО ДЕНЬ ДУША ЗИМА ИГРА КРАЙ ЛЕТО ЛИСТ ЛУНА МАМА МОРЕ НОГА НОЧЬ ОКНО ПАПА ПОЛЕ РЕКА РЕЧЬ РУКА САДЫ СИЛА СЛОГ СТОЛ СТУЛ ТЕЛО ТЬМА УТРО ЧАСЫ ШУМЫ".split(" "),
    5: "АРБУЗ БЕРЕГ ВЕСНА ВЫБОР ГОРОД ДРУГИ ЖИЗНЬ ЗЕМЛЯ ИСКРА КНИГА КОШКА КРЫША МЕЧТА МЫСЛЬ НАРОД ОКЕАН ОТДЫХ ПАРТА ПЕСНЯ ПЛАНЫ ПОЕЗД ПТИЦА РАЗУМ СЕМЬЯ СМЫСЛ СТЕНА СТИХИ ТЕПЛО УДАЧА УТРОМ ФИЛЬМ ШКОЛА".split(" "),
    6: "БОЛЬШЕ БУМАГА ВОЗДУХ ВОКЗАЛ ДОРОГА ДЕРЕВО ДРУЖБА ЗВЕЗДА ИСТИНА КОРОВА КРАСОК МАШИНА МОЛОКО МУЗЫКА ОБЛАКО ПАМЯТЬ ПИСЬМО ПОГОДА ПОМОЩЬ ПРИВЕТ РАБОТА СЛУЖБА СОЛНЦЕ СЕРДЦЕ ТЕАТРЫ УЛЫБКА УЧЕНИК ФИГУРА ЦИФРОЙ".split(" "),
    7: "АВТОРКА БОЛЬШОЙ ВАРИАНТ ВЕДУЩИЙ ДЕВОЧКА ДОБРОТА ДОРОЖКА ЗАДАНИЕ ЗАПИСКА ЗНАЧНЫЙ ИСТОРИЯ КАРТИНА КОМНАТА КОНЦЕРТ КРАСОТА МАЛЬЧИК ПОДАРОК ПРИРОДА РАБОЧИЙ РАДОСТЬ РУБАШКА РУССКИЙ СВОБОДА СТОРОНА СТУДЕНТ ТЕЛЕФОН УЧИТЕЛЬ ЧЕЛОВЕК".split(" "),
  };
  const wordAnswersByLanguage = { en: wordAnswers, ru: russianWordAnswers };
  const extraWordGuesses = {
    en: "ADIEU AISLE ALOFT AMEND AMISS BEARD BLUSH BRAVE CIGAR CLIMB CLOTH CRISP DRAIN DRIER EAGER EAGLE ELBOW FANCY FERRY FLAME GHOST GRAIN GRAPE HASTY HUMOR JUICE KNIFE LEMON LIVER LOVER LUNCH MANGO MERRY MOTOR OCEAN OLIVE PAUSE PEACH PHONE PIECE PIZZA PLACE PLUCK PRAYER PRONE PUPIL REACT ROBOT SCARY SHOUT SNAKE SOLAR STARE STEAK STORM STRAW SWEAR TIGER TITLE TRACE TROOP VAPOR WATCH WHEAT".split(" "),
    ru: "АВТОР АДРЕС БАНАН БАНКА БЕЛЫЙ БЕРЕГ БИЛЕТ БОЧКА БРАТЬ БУКВА ВЕТЕР ВЗГЛЯД ВОЙНА ВОКРУГ ВОРОТА ВОСХОД ВСТРЕЧА ВЫСОТА ГЛАЗА ГОЛОС ГОЛУБЬ ГОРА ГРУППА ДАВНО ДАВАТЬ ДАЖЕ ДЕТАЛЬ ДИВАН ДОБРО ДОЛГО ДОМЫ ДОЧКА ДРУЗЬЯ ЕДИНЫЙ ЖАРА ЗВЕРЬ ЗНАКИ ИМЕННО КАПЛЯ КАРТА КОФЕЙ КРАСНЫЙ КРЕСТ ЛАСТИК ЛЕГКО ЛИНИЯ ЛИСТЬЯ МАЛЫШ МЕСТО МИНУТА МОЛЧАТ НАДЕЖДА НАПИШИ НЕБО НИЗКО НОВЫЙ ОБЕД ОБЩИЙ ОДЕЖДА ОТВЕТ ПАЛЕЦ ПАРОЛЬ ПАУЗА ПЕЧАТЬ ПИСАТЬ ПЛАТЬЕ ПЛЕЧО ПЛОЩАДЬ ПОВОД ПОЗЖЕ ПОКОЙ ПОМНИ ПОРОГ ПОСЛЕ ПОТОМ ПРАВО ПРАЗДНИК ПРИНЦ ПРИХОД ПУСТО РАНЬШЕ РАСТИ РЕБРО РИСУНКИ РОССИЯ РЯДОМ САЛАТ САПОГ СДЕЛАТЬ СЕМЬЯ СЕСТРА СИДЕТЬ СИНИЙ СКАЗКА СКОЛЬКО СЛЕДЫ СЛУЧАЙ СМЕЛЫЙ СМЕРТЬ СМОТРЕТЬ СНЕГ СОВЕТ СОБАКА СОБРАТЬ СОСЕД СПОКОЙНО СТАРЫЙ СТИРАТЬ СУББОТА СУДЬБА ТАРЕЛКА ТИХИЙ ТРАВА ТРЕВОГА УГОЛ УЖИН УЛИЦА УМНЫЙ УСПЕХ УХОДИТЬ ФОНАРЬ ХОРОШИЙ ЦВЕТОК ЧАСТО ЧИСТЫЙ ЧУДО ШУТКА ЭТАЖ ЯБЛОКО".split(" "),
  };

  Object.entries(wordAnswersByLanguage).forEach(([language, answers]) => {
    Object.entries(answers).forEach(([length, words]) => {
      const invalidWords = words.filter((word) => word.length !== Number(length));
      if (invalidWords.length > 0) {
        throw new Error(
          `The ${language} ${length}-letter answer list contains invalid entries: ${invalidWords.join(", ")}`,
        );
      }
    });
  });

  const validWordSets = Object.fromEntries(
    Object.entries(wordAnswersByLanguage).map(([language, answers]) => [
      language,
      new Set([...Object.values(answers).flat(), ...extraWordGuesses[language]]),
    ]),
  );
  const wordModeSelect = document.getElementById("word-mode");
  const wordLengthSelect = document.getElementById("word-length");
  const wordLanguageSelect = document.getElementById("word-language");
  const wordPastToggle = document.getElementById("word-past-toggle");
  const wordPuzzleMeta = document.getElementById("word-puzzle-meta");
  const wordGrid = document.getElementById("word-grid");
  const wordStatus = document.getElementById("word-status");
  const wordKeyboard = document.getElementById("word-keyboard");
  const wordPanel = document.getElementById("game-word");
  const wordOptionsToggle = document.getElementById("word-options-toggle");
  const wordOptions = document.getElementById("word-options");
  const wordColorblindHints = document.getElementById("word-colorblind-hints");
  const wordSwapKeys = document.getElementById("word-swap-keys");
  const wordPlaceholders = document.getElementById("word-placeholders");
  const wordArchiveDialog = document.getElementById("word-archive-dialog");
  const wordArchiveList = document.getElementById("word-archive-list");
  const wordStatsDialog = document.getElementById("word-stats-dialog");
  const wordStatsElement = document.getElementById("word-stats");
  const wordFirstPuzzleDate = "2026-04-20";
  const savedWordLanguage = readSavedValue("alone.word.language.v1");
  let wordMode = "daily";
  let wordLanguage = savedWordLanguage === "ru" ? "ru" : "en";
  let wordLength = 5;
  let wordDateKey = currentUtcDateKey();
  let wordStorageKey = "";
  let wordAnswer = "";
  let wordGuesses = [];
  let wordCurrentGuess = "";
  let wordFinished = false;
  let wordResultRecorded = false;
  let wordKeyboardStates = {};

  wordLanguageSelect.value = wordLanguage;

  function wordLetterPattern(language = wordLanguage) {
    return language === "ru" ? /^[А-Я]+$/ : /^[A-Z]+$/;
  }

  function normalizeWordLetter(letter, language = wordLanguage) {
    return letter.toLocaleUpperCase(language === "ru" ? "ru" : "en").replace(/Ё/g, "Е");
  }

  function wordAnswerList(language, length) {
    return wordAnswersByLanguage[language][length];
  }

  function wordDayNumber(dateKey) {
    return Math.max(1, dateKeyNumber(dateKey) - dateKeyNumber(wordFirstPuzzleDate) + 1);
  }

  function dailyWordFor(language, length, dateKey) {
    const answers = wordAnswerList(language, length);
    const day = wordDayNumber(dateKey);
    const seed = language === "en"
      ? `alone-word-${length}-${dateKey}`
      : `alone-word-${language}-${length}-${dateKey}`;
    const random = seededRandom(seed);
    return { day, answer: answers[Math.floor(random() * answers.length)] };
  }

  function createWordStorageKey(mode, length, dateKey, language) {
    if (mode === "infinite") {
      return language === "en"
        ? `alone.word.infinite.${length}`
        : `alone.word.infinite.${language}.${length}`;
    }
    return language === "en"
      ? `alone.word.${dateKey}.${length}`
      : `alone.word.${language}.${dateKey}.${length}`;
  }

  function wordStatsStorageKey(language = wordLanguage, length = wordLength) {
    return `alone.word.stats.${language}.${length}.v2`;
  }

  function readWordStats(language = wordLanguage, length = wordLength) {
    const savedStats = readSavedValue(wordStatsStorageKey(language, length));
    if (savedStats) {
      return savedStats;
    }
    return language === "en" && length === 5
      ? readSavedValue("alone.word.stats.v1") || {}
      : {};
  }

  function createWordKeyboard() {
    const rows = wordLanguage === "ru"
      ? [
        ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"],
        ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
        ["Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю"],
      ]
      : [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["Z", "X", "C", "V", "B", "N", "M"],
      ];
    const actions = wordSwapKeys.checked
      ? ["BACKSPACE", ...rows[2], "ENTER"]
      : ["ENTER", ...rows[2], "BACKSPACE"];
    rows[2] = actions;
    wordKeyboard.classList.toggle("word-keyboard--russian", wordLanguage === "ru");
    wordKeyboard.replaceChildren();

    rows.forEach((keys) => {
      const row = document.createElement("div");
      row.className = "word-key-row";
      keys.forEach((key) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "word-key";
        button.dataset.key = key;
        button.textContent = key === "BACKSPACE" ? "⌫" : key === "ENTER" ? "enter" : key.toLocaleLowerCase();
        button.setAttribute(
          "aria-label",
          key === "BACKSPACE" ? "Backspace" : key === "ENTER" ? "Submit guess" : key,
        );
        if (key === "ENTER" || key === "BACKSPACE") {
          button.classList.add("word-key--wide");
        }
        row.append(button);
      });
      wordKeyboard.append(row);
    });
  }

  function scoreWordGuess(guess, target) {
    const states = Array(target.length).fill("is-absent");
    const remainingLetters = {};

    // Exact matches are removed first so repeated letters are never scored twice.
    for (let index = 0; index < target.length; index += 1) {
      if (guess[index] === target[index]) {
        states[index] = "is-correct";
      } else {
        remainingLetters[target[index]] = (remainingLetters[target[index]] || 0) + 1;
      }
    }

    for (let index = 0; index < target.length; index += 1) {
      if (states[index] === "is-correct") {
        continue;
      }
      if (remainingLetters[guess[index]] > 0) {
        states[index] = "is-present";
        remainingLetters[guess[index]] -= 1;
      }
    }
    return states;
  }

  function wordSaveIsValid(value, expectedAnswer) {
    const validWords = validWordSets[wordLanguage];
    return (
      value &&
      typeof value === "object" &&
      value.answer === expectedAnswer &&
      Array.isArray(value.guesses) &&
      value.guesses.length <= 6 &&
      value.guesses.every((entry) =>
        entry &&
        typeof entry.word === "string" &&
        entry.word.length === wordLength &&
        wordLetterPattern().test(entry.word) &&
        validWords.has(entry.word) &&
        Array.isArray(entry.states) &&
        entry.states.length === wordLength &&
        entry.states.every((state) =>
          ["is-correct", "is-present", "is-absent"].includes(state)
        )
      ) &&
      typeof value.currentGuess === "string" &&
      value.currentGuess.length < wordLength &&
      (value.currentGuess === "" || wordLetterPattern().test(value.currentGuess))
    );
  }

  function persistWordGame() {
    writeSavedValue(wordStorageKey, {
      answer: wordAnswer,
      guesses: wordGuesses,
      currentGuess: wordCurrentGuess,
      finished: wordFinished,
      resultRecorded: wordResultRecorded,
    });
  }

  function loadWordGame({
    mode = wordMode,
    dateKey = currentUtcDateKey(),
    language = wordLanguage,
    length = Number(wordLengthSelect.value),
    forceNew = false,
  } = {}) {
    wordMode = mode;
    wordLanguage = language;
    wordLength = Number(length);
    wordDateKey = dateKey;
    wordLanguageSelect.value = wordLanguage;
    wordLengthSelect.value = String(wordLength);
    wordStorageKey = createWordStorageKey(mode, wordLength, dateKey, language);

    const daily = mode === "daily" || mode === "past";
    const dailyPuzzle = daily ? dailyWordFor(language, wordLength, dateKey) : null;
    const answers = wordAnswerList(language, wordLength);
    const saved = forceNew ? null : readSavedValue(wordStorageKey);
    wordAnswer = daily
      ? dailyPuzzle.answer
      : saved && typeof saved.answer === "string" && answers.includes(saved.answer)
        ? saved.answer
        : answers[Math.floor(Math.random() * answers.length)];

    if (saved && !wordSaveIsValid(saved, wordAnswer)) {
      console.error("Saved Wordle progress is malformed; starting a fresh puzzle.");
    }
    const validSave = wordSaveIsValid(saved, wordAnswer) ? saved : null;
    wordGuesses = validSave ? validSave.guesses : [];
    wordCurrentGuess = validSave ? validSave.currentGuess : "";
    wordFinished = validSave ? Boolean(validSave.finished) : false;
    wordResultRecorded = validSave ? Boolean(validSave.resultRecorded) : false;
    wordKeyboardStates = {};

    wordGuesses.forEach((entry) => {
      entry.word.split("").forEach((letter, index) => {
        const nextState = entry.states[index];
        const rank = { "is-absent": 1, "is-present": 2, "is-correct": 3 };
        if (!wordKeyboardStates[letter] || rank[nextState] > rank[wordKeyboardStates[letter]]) {
          wordKeyboardStates[letter] = nextState;
        }
      });
    });

    wordModeSelect.value = mode === "infinite" ? "infinite" : "daily";
    wordPuzzleMeta.textContent = mode === "infinite"
      ? `${wordLength} ${wordLanguage === "ru" ? "букв" : "letters"} · endless mode`
      : `${mode === "past" ? "archive" : "daily"} #${dailyPuzzle.day} · ${dateKeyToShortDate(dateKey)}`;
    wordGrid.style.setProperty("--word-length", String(wordLength));
    wordGrid.style.setProperty("--word-cell-size", wordLength > 5 ? "36px" : "42px");
    createWordKeyboard();
    renderWordGame();

    if (!validSave) {
      persistWordGame();
    }
  }

  function updateWordStats(won) {
    if (wordMode === "past" || wordResultRecorded) {
      return;
    }

    const savedStats = readWordStats();
    const distribution = Array.isArray(savedStats.distribution)
      ? savedStats.distribution.slice(0, 6).map((count) => Number(count) || 0)
      : [0, 0, 0, 0, 0, 0];
    const nextStats = {
      played: (Number(savedStats.played) || 0) + 1,
      wins: (Number(savedStats.wins) || 0) + (won ? 1 : 0),
      currentStreak: wordMode === "daily"
        ? won
          ? (Number(savedStats.currentStreak) || 0) + 1
          : 0
        : Number(savedStats.currentStreak) || 0,
      bestStreak: Number(savedStats.bestStreak) || 0,
      distribution: distribution.slice(0, 6),
    };
    while (nextStats.distribution.length < 6) {
      nextStats.distribution.push(0);
    }
    if (won) {
      nextStats.bestStreak = Math.max(nextStats.bestStreak, nextStats.currentStreak);
      nextStats.distribution[wordGuesses.length - 1] += 1;
    }

    writeSavedValue(wordStatsStorageKey(), nextStats);
    wordResultRecorded = true;
  }

  function submitWordGuess() {
    if (wordFinished) {
      return;
    }
    if (wordCurrentGuess.length !== wordLength) {
      wordStatus.textContent = `Enter a ${wordLength}-letter word.`;
      return;
    }
    if (!validWordSets[wordLanguage].has(wordCurrentGuess)) {
      wordStatus.textContent = "That word is not in the accepted list.";
      wordGrid.classList.remove("is-shaking");
      void wordGrid.offsetWidth;
      wordGrid.classList.add("is-shaking");
      if (!motionIsReduced() && typeof wordGrid.animate === "function") {
        wordGrid.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-7px)" },
            { transform: "translateX(6px)" },
            { transform: "translateX(-4px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 280, easing: "ease-out" },
        );
      }
      return;
    }

    const states = scoreWordGuess(wordCurrentGuess, wordAnswer);
    wordGuesses.push({ word: wordCurrentGuess, states });
    wordCurrentGuess = "";
    states.forEach((state, index) => {
      const letter = wordGuesses[wordGuesses.length - 1].word[index];
      const rank = { "is-absent": 1, "is-present": 2, "is-correct": 3 };
      if (!wordKeyboardStates[letter] || rank[state] > rank[wordKeyboardStates[letter]]) {
        wordKeyboardStates[letter] = state;
      }
    });

    const won = wordGuesses[wordGuesses.length - 1].word === wordAnswer;
    wordFinished = won || wordGuesses.length === 6;
    if (won) {
      wordStatus.textContent = `Solved in ${wordGuesses.length}/6.`;
    } else if (wordFinished) {
      wordStatus.textContent = `The word was ${wordAnswer}.`;
    } else {
      wordStatus.textContent = `${6 - wordGuesses.length} ${6 - wordGuesses.length === 1 ? "try" : "tries"} left.`;
    }
    if (wordFinished) {
      updateWordStats(won);
    }

    persistWordGame();
    renderWordGame(wordGuesses.length - 1);
    animateWordGuessRow(wordGuesses.length - 1);
    if (wordArchiveDialog.open) {
      renderWordArchive();
    }
  }

  function animateWordGuessRow(rowIndex) {
    if (motionIsReduced() || typeof Element.prototype.animate !== "function") return;
    const row = wordGrid.children[rowIndex];
    if (!row) return;
    Array.from(row.children).forEach((cell, index) => {
      const state = cell.dataset.revealState;
      if (!state) return;
      const base = getComputedStyle(cell);
      const baseBackground = base.backgroundColor;
      const baseColor = base.color;
      cell.classList.add(state);
      const target = getComputedStyle(cell);
      const targetBackground = target.backgroundColor;
      const targetColor = target.color;
      cell.classList.remove(state);

      const animation = cell.animate(
        [
          { transform: "perspective(600px) rotateX(0deg)", backgroundColor: baseBackground, color: baseColor },
          { transform: "perspective(600px) rotateX(88deg)", backgroundColor: baseBackground, color: baseColor, offset: 0.49 },
          { transform: "perspective(600px) rotateX(88deg)", backgroundColor: targetBackground, color: targetColor, offset: 0.5 },
          { transform: "perspective(600px) rotateX(0deg)", backgroundColor: targetBackground, color: targetColor },
        ],
        { duration: 500, delay: index * 105, easing: "ease-in-out", fill: "forwards" },
      );
      animation.onfinish = () => {
        cell.classList.add(state);
        delete cell.dataset.revealState;
        animation.cancel();
      };
    });
  }

  function renderWordGame(revealRowIndex = -1) {
    wordGrid.replaceChildren();
    const greenHints = Array(wordLength).fill("");
    wordGuesses.forEach((entry) => {
      entry.states.forEach((state, index) => {
        if (state === "is-correct") {
          greenHints[index] = entry.word[index];
        }
      });
    });

    for (let rowIndex = 0; rowIndex < 6; rowIndex += 1) {
      const row = document.createElement("div");
      row.className = "word-row";
      row.setAttribute("role", "row");
      const entry = wordGuesses[rowIndex];
      for (let column = 0; column < wordLength; column += 1) {
        const cell = document.createElement("span");
        cell.className = "word-cell";
        cell.setAttribute("role", "gridcell");
        if (entry) {
          cell.textContent = entry.word[column];
          if (rowIndex === revealRowIndex) {
            cell.dataset.revealState = entry.states[column];
            cell.classList.add("is-revealing");
          } else {
            cell.classList.add(entry.states[column]);
          }
        } else if (rowIndex === wordGuesses.length && !wordFinished) {
          const typedLetter = wordCurrentGuess[column];
          const placeholder = wordPlaceholders.checked ? greenHints[column] : "";
          cell.textContent = typedLetter || placeholder;
          if (typedLetter) {
            cell.classList.add("is-typed");
          } else if (placeholder) {
            cell.classList.add("is-placeholder");
          }
        }
        row.append(cell);
      }
      wordGrid.append(row);
    }

    wordKeyboard.querySelectorAll("[data-key]").forEach((button) => {
      const state = wordKeyboardStates[button.dataset.key];
      button.classList.remove("is-correct", "is-present", "is-absent");
      if (state) {
        button.classList.add(state);
      }
      button.disabled = wordFinished;
    });
    wordPanel.classList.toggle("is-colorblind", wordColorblindHints.checked);
  }

  function handleWordKey(key) {
    if (wordFinished) {
      return;
    }
    if (key === "ENTER") {
      submitWordGuess();
      return;
    }
    if (key === "BACKSPACE") {
      wordCurrentGuess = wordCurrentGuess.slice(0, -1);
    } else {
      const letter = normalizeWordLetter(key);
      if (!wordLetterPattern().test(letter.slice(0, 1)) || wordCurrentGuess.length >= wordLength) {
        return;
      }
      wordCurrentGuess += letter;
    }

    wordStatus.textContent = "Keep going.";
    persistWordGame();
    renderWordGame();
  }

  function renderWordStats() {
    const stats = readWordStats();
    const played = Number(stats.played) || 0;
    const wins = Number(stats.wins) || 0;
    const distribution = Array.isArray(stats.distribution) ? stats.distribution : [];
    const summary = document.createElement("div");
    summary.className = "word-stats-summary";
    [
      ["played", played],
      ["win %", played ? Math.round((wins / played) * 100) : 0],
      ["streak", Number(stats.currentStreak) || 0],
      ["best", Number(stats.bestStreak) || 0],
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      const statistic = document.createElement("strong");
      statistic.textContent = String(value);
      const caption = document.createElement("span");
      caption.textContent = label;
      item.append(statistic, caption);
      summary.append(item);
    });
    wordStatsElement.replaceChildren(summary);

    const heading = document.createElement("p");
    heading.className = "word-stats-label";
    heading.textContent = `${wordLanguage === "ru" ? "russian" : "english"} · ${wordLength} letters · guess distribution`;
    wordStatsElement.append(heading);
    const maximum = Math.max(1, ...distribution);
    for (let index = 0; index < 6; index += 1) {
      const row = document.createElement("div");
      row.className = "word-stats-row";
      const label = document.createElement("span");
      label.textContent = String(index + 1);
      const bar = document.createElement("span");
      bar.className = "word-stats-bar";
      const count = Number(distribution[index]) || 0;
      bar.style.width = `${Math.max(8, (count / maximum) * 100)}%`;
      bar.textContent = String(count);
      row.append(label, bar);
      wordStatsElement.append(row);
    }
  }

  function dateNumberToKey(dayNumber) {
    return new Date(dayNumber * 86400000).toISOString().slice(0, 10);
  }

  function renderWordArchive() {
    wordArchiveList.replaceChildren();
    const today = currentUtcDateKey();
    const firstDay = dateKeyNumber(wordFirstPuzzleDate);
    const lastDay = Math.max(firstDay, dateKeyNumber(today));
    const languages = ["en", "ru"];
    const lengths = [4, 5, 6, 7];

    for (let dayNumber = lastDay; dayNumber >= firstDay; dayNumber -= 1) {
      const dateKey = dateNumberToKey(dayNumber);
      const puzzle = document.createElement("section");
      puzzle.className = "word-archive-day";
      const heading = document.createElement("div");
      heading.className = "word-archive-date";
      const number = document.createElement("strong");
      number.textContent = `#${wordDayNumber(dateKey)}`;
      const date = document.createElement("time");
      date.dateTime = dateKey;
      date.textContent = `${dateKeyToShortDate(dateKey)}${dateKey === today ? " · today" : ""}`;
      heading.append(number, date);

      const choices = document.createElement("div");
      choices.className = "word-archive-choices";
      languages.forEach((language) => {
        lengths.forEach((length) => {
          const button = document.createElement("button");
          const saved = readSavedValue(createWordStorageKey("past", length, dateKey, language));
          button.type = "button";
          button.className = "word-archive-choice";
          if (saved && (saved.guesses?.length || saved.finished)) {
            button.classList.add("is-played");
          }
          button.textContent = `${language}${length}`;
          button.setAttribute(
            "aria-label",
            `${language === "en" ? "English" : "Russian"}, ${length} letters, puzzle ${wordDayNumber(dateKey)}, ${dateKeyToShortDate(dateKey)}`,
          );
          button.addEventListener("click", () => {
            wordArchiveDialog.close();
            wordPastToggle.setAttribute("aria-expanded", "false");
            loadWordGame({ mode: "past", dateKey, language, length });
            wordPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
          choices.append(button);
        });
      });
      puzzle.append(heading, choices);
      wordArchiveList.append(puzzle);
    }
  }

  wordKeyboard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-key]");
    if (button && !button.disabled) {
      handleWordKey(button.dataset.key);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      wordPanel.hidden ||
      wordStatsDialog.open ||
      wordArchiveDialog.open ||
      !wordOptions.hidden ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest("button, input, select, textarea, [contenteditable='true']")
    ) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      handleWordKey("ENTER");
    } else if (event.key === "Backspace") {
      event.preventDefault();
      handleWordKey("BACKSPACE");
    } else if (/^[a-zа-яё]$/i.test(event.key)) {
      handleWordKey(normalizeWordLetter(event.key));
    }
  });

  wordModeSelect.addEventListener("change", () => {
    const nextMode = wordModeSelect.value;
    loadWordGame({
      mode: nextMode,
      forceNew: nextMode === "infinite" && wordMode !== "infinite",
    });
  });

  wordLengthSelect.addEventListener("change", () => {
    loadWordGame({
      mode: wordMode,
      dateKey: wordDateKey,
      length: Number(wordLengthSelect.value),
      forceNew: wordMode === "infinite",
    });
  });

  wordLanguageSelect.addEventListener("change", () => {
    wordLanguage = wordLanguageSelect.value;
    writeSavedValue("alone.word.language.v1", wordLanguage);
    loadWordGame({
      mode: wordMode,
      dateKey: wordDateKey,
      language: wordLanguage,
      forceNew: wordMode === "infinite",
    });
  });

  wordPastToggle.addEventListener("click", () => {
    renderWordArchive();
    wordPastToggle.setAttribute("aria-expanded", "true");
    if (typeof wordArchiveDialog.showModal === "function") {
      wordArchiveDialog.showModal();
    }
  });
  wordArchiveDialog.addEventListener("close", () => {
    wordPastToggle.setAttribute("aria-expanded", "false");
  });

  document.getElementById("word-new-game").addEventListener("click", () => {
    loadWordGame({ mode: "infinite", forceNew: true });
  });

  wordOptionsToggle.addEventListener("click", () => {
    const isOpening = wordOptions.hidden;
    wordOptions.hidden = !isOpening;
    wordOptionsToggle.setAttribute("aria-expanded", String(isOpening));
  });

  const savedWordOptions = readSavedValue("alone.word.options.v1") || {};
  wordColorblindHints.checked = Boolean(savedWordOptions.colorblindHints);
  wordSwapKeys.checked = Boolean(savedWordOptions.swapEnterAndBackspace);
  wordPlaceholders.checked = Boolean(savedWordOptions.placeholders);

  function saveWordOptions() {
    writeSavedValue("alone.word.options.v1", {
      colorblindHints: wordColorblindHints.checked,
      swapEnterAndBackspace: wordSwapKeys.checked,
      placeholders: wordPlaceholders.checked,
    });
  }

  wordColorblindHints.addEventListener("change", () => {
    saveWordOptions();
    renderWordGame();
  });
  wordSwapKeys.addEventListener("change", () => {
    saveWordOptions();
    createWordKeyboard();
    renderWordGame();
  });
  wordPlaceholders.addEventListener("change", () => {
    saveWordOptions();
    renderWordGame();
  });

  document.getElementById("word-reset-stats").addEventListener("click", () => {
    if (!window.confirm("Reset Wordle statistics for every language and word length? This cannot be undone.")) {
      return;
    }
    try {
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith("alone.word.stats.")) {
          window.localStorage.removeItem(key);
        }
      }
      window.localStorage.removeItem("alone.word.stats.v1");
    } catch (error) {
      console.error("Could not reset Wordle statistics.", error);
      wordStatus.textContent = "Could not reset statistics. Check browser storage permissions.";
      return;
    }
    renderWordStats();
    wordStatus.textContent = "Statistics reset.";
  });

  document.getElementById("word-stats-open").addEventListener("click", () => {
    renderWordStats();
    if (typeof wordStatsDialog.showModal === "function") {
      wordStatsDialog.showModal();
    }
  });

  createWordKeyboard();
  loadWordGame({ language: wordLanguage });
})();
