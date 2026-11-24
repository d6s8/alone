"use strict";

(() => {
  const {
    blockShapes, poolForScore, drawFromPool, pieceFitsAt, anyPieceFits, canPlaceAll,
    everyPieceFitsNow, blockPlacementStats, blockPlacementFit, greedyPlacement, greedyPlacesAll,
    clearsALine, hasNearFullLine, clearingSubPool, seededRandom,
    TRAY_ATTEMPTS, FIT_NOW_ATTEMPTS, FIT_CANDIDATES, SLOT_ATTEMPTS,
    ASSIST_CHANCE_START, ASSIST_CHANCE_FLOOR, ASSIST_FADE_SCORE, GENEROUS_FADE_SCORE,
    NEAR_FULL_EMPTY_CELLS, blockCoversCell,
  } = window.BlockBlastMechanics;

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
  const blockGameOverDialog = document.getElementById("block-gameover");
  const blockGameOverScore = document.getElementById("block-gameover-score");
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
    if (blockGameOverDialog && blockGameOverDialog.open) {
      blockGameOverDialog.close();
    }
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

  function showGameOver() {
    if (!blockGameOverDialog) return;
    blockGameOverScore.textContent = `Final score: ${blockScore}`;
    if (typeof blockGameOverDialog.showModal === "function") {
      blockGameOverDialog.showModal();
    }
  }

  function finishBlockGame(message, limitedRunFinished = false) {
    if (blockFinished) {
      return;
    }
    blockFinished = true;
    blockRun.finishedLimited = limitedRunFinished;
    blockStatusElement.textContent = message;
    showGameOver();
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
})();
