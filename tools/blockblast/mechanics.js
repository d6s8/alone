"use strict";

(() => {
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

  window.BlockBlastMechanics = {
    blockShapes, PIECE_IDS, SCORE_BRACKETS, WEIGHTS_BY_PIECE, PIECES_BY_SIZE,
    poolForScore, drawFromPool, pieceFitsAt, anyPieceFits, canPlaceAll,
    everyPieceFitsNow, blockCoversCell, blockPlacementStats, blockPlacementFit,
    greedyPlacement, greedyPlacesAll, clearsALine, hasNearFullLine, clearingSubPool,
    TRAY_ATTEMPTS, FIT_NOW_ATTEMPTS, FIT_CANDIDATES, SLOT_ATTEMPTS,
    ASSIST_CHANCE_START, ASSIST_CHANCE_FLOOR, ASSIST_FADE_SCORE, GENEROUS_FADE_SCORE,
    NEAR_FULL_EMPTY_CELLS, seededRandom,
  };
})();
