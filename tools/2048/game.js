"use strict";

(() => {
  const M = window.Game2048Mechanics;
  const boardEl = document.getElementById("nb-board");
  const scoreEl = document.getElementById("nb-score");
  const bestEl = document.getElementById("nb-best");
  const statusEl = document.getElementById("nb-status");
  const newGameBtn = document.getElementById("nb-new-game");
  const undoBtn = document.getElementById("nb-undo");
  const panel = document.getElementById("game-2048");
  const gameOverEl = document.getElementById("nb-gameover");
  const gameOverScoreEl = document.getElementById("nb-gameover-score");
  const SIZE = 4;
  const WIN_TILE = 2048;
  const STORAGE_KEY = "alone.2048.best.v1";

  let grid = [];
  let score = 0;
  let best = readBest();
  let lost = false;
  let won = false;
  let previous = null;

  const keyMap = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  let touchStart = null;

  function readBest() {
    try {
      const value = Number(window.localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    } catch (error) {
      console.error("Could not read the 2048 best score.", error);
      return 0;
    }
  }

  function writeBest() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(best));
    } catch (error) {
      console.error("Could not save the 2048 best score.", error);
    }
  }

  function showGameOver() {
    if (!gameOverEl) return;
    gameOverScoreEl.textContent = String(score);
    gameOverEl.hidden = false;
  }

  function newGame() {
    grid = M.createGrid(SIZE);
    M.spawnTile(grid, Math.random);
    M.spawnTile(grid, Math.random);
    score = 0;
    won = false;
    lost = false;
    previous = null;
    undoBtn.disabled = true;
    statusEl.textContent = "";
    if (gameOverEl) gameOverEl.hidden = true;
    render();
  }

  function render() {
    boardEl.replaceChildren();
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const tile = document.createElement("div");
        const value = grid[r][c];
        tile.className = value ? `nb-cell nb-tile nb-tile--${value}` : "nb-cell";
        if (value) tile.textContent = String(value);
        boardEl.append(tile);
      }
    }
  }

  function applyMove(direction) {
    if (lost || panel.hidden) return;
    const before = grid.map((row) => row.slice());
    let gained = 0;
    if (direction === "left") gained = M.moveLeft(grid);
    else if (direction === "right") gained = M.moveRight(grid);
    else if (direction === "up") gained = M.moveUp(grid);
    else if (direction === "down") gained = M.moveDown(grid);
    const moved = before.some((row, r) => grid[r].some((v, c) => v !== row[c]));
    if (!moved) return;
    previous = { grid: before, score, won };
    undoBtn.disabled = false;
    score += gained;
    M.spawnTile(grid, Math.random);
    if (score > best) {
      best = score;
      writeBest();
    }
    render();
    checkEnd();
  }

  function checkEnd() {
    if (lost) return;
    if (!won && M.hasWin(grid, WIN_TILE)) {
      won = true;
      statusEl.textContent = "You reached 2048! Keep playing.";
    }
    if (!M.canMove(grid)) {
      lost = true;
      statusEl.textContent = "Game over. Try again.";
      showGameOver();
    }
  }

  newGameBtn.addEventListener("click", newGame);
  undoBtn.addEventListener("click", () => {
    if (!previous) return;
    grid = previous.grid;
    score = previous.score;
    won = previous.won;
    previous = null;
    lost = false;
    undoBtn.disabled = true;
    gameOverEl.hidden = true;
    statusEl.textContent = "Move undone.";
    render();
  });

  document.addEventListener("keydown", (event) => {
    const direction = keyMap[event.key];
    if (!direction || panel.hidden || lost || event.repeat || event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    event.preventDefault();
    applyMove(direction);
  });

  boardEl.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      if (touch) touchStart = { x: touch.clientX, y: touch.clientY };
    },
    { passive: true },
  );

  boardEl.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const start = touchStart;
    touchStart = null;
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    applyMove(direction);
  });
  boardEl.addEventListener("touchcancel", () => { touchStart = null; });

  newGame();
  statusEl.textContent = "Arrow keys or swipe.";
})();
