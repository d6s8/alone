"use strict";

// Pure mechanics of the 2048 tile puzzle: grid state, moves, merging, scoring.
(() => {
  function createGrid(size) {
    return Array.from({ length: size }, () => new Array(size).fill(0));
  }

  function emptyCells(grid) {
    const cells = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === 0) cells.push({ r, c });
      }
    }
    return cells;
  }

  function spawnTile(grid, random) {
    const cells = emptyCells(grid);
    if (cells.length === 0) return false;
    const cell = cells[Math.floor(random() * cells.length)];
    grid[cell.r][cell.c] = random() < 0.1 ? 4 : 2;
    return true;
  }

  // Merge equal neighbours once per line, then pack towards the start.
  function mergeRow(row) {
    const line = row.filter((value) => value !== 0);
    const merged = [];
    let score = 0;
    for (let i = 0; i < line.length; i++) {
      if (i + 1 < line.length && line[i] === line[i + 1]) {
        const value = line[i] * 2;
        merged.push(value);
        score += value;
        i += 1;
      } else {
        merged.push(line[i]);
      }
    }
    while (merged.length < row.length) merged.push(0);
    return { row: merged, score };
  }

  function moveLeft(grid) {
    let score = 0;
    grid.forEach((row, r) => {
      const result = mergeRow(row);
      score += result.score;
      grid[r] = result.row;
    });
    return score;
  }

  function moveRight(grid) {
    let score = 0;
    grid.forEach((row, r) => {
      const result = mergeRow(row.slice().reverse());
      result.row.reverse();
      score += result.score;
      grid[r] = result.row;
    });
    return score;
  }

  function transpose(grid) {
    const n = grid.length;
    const out = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) out[c][r] = grid[r][c];
    }
    return out;
  }

  function moveUp(grid) {
    const work = transpose(grid);
    const score = moveLeft(work);
    grid.length = 0;
    grid.push(...transpose(work));
    return score;
  }

  function moveDown(grid) {
    const work = transpose(grid);
    const score = moveRight(work);
    grid.length = 0;
    grid.push(...transpose(work));
    return score;
  }

  function canMove(grid) {
    if (emptyCells(grid).length > 0) return true;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const value = grid[r][c];
        if (r + 1 < grid.length && grid[r + 1][c] === value) return true;
        if (c + 1 < grid[r].length && grid[r][c + 1] === value) return true;
      }
    }
    return false;
  }

  function hasWin(grid, target) {
    return grid.some((row) => row.some((value) => value === target));
  }

  window.Game2048Mechanics = {
    createGrid,
    emptyCells,
    spawnTile,
    mergeRow,
    moveLeft,
    moveRight,
    moveUp,
    moveDown,
    canMove,
    hasWin,
  };
})();
