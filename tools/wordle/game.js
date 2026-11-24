"use strict";

(() => {
  const {
    wordAnswerList, dailyWordFor, createWordStorageKey, wordStatsStorageKey, readWordStats,
    wordSaveIsValid, wordDayNumber, scoreWordGuess, wordLetterPattern, normalizeWordLetter,
    validWordSets, wordFirstPuzzleDate,
  } = window.WordleMechanics;

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

    if (saved && !wordSaveIsValid(saved, wordAnswer, wordLanguage, wordLength)) {
      console.error("Saved Wordle progress is malformed; starting a fresh puzzle.");
    }
    const validSave = wordSaveIsValid(saved, wordAnswer, wordLanguage, wordLength) ? saved : null;
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

    const savedStats = readWordStats(wordLanguage, wordLength);
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

    writeSavedValue(wordStatsStorageKey(wordLanguage, wordLength), nextStats);
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

  // Small pulse on the grid when a key is pressed while typing.
  function pulseWordGrid() {
    if (wordGrid.hidden) return;
    if (!motionIsReduced() && typeof wordGrid.animate === "function") {
      wordGrid.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(0.996)" },
          { transform: "scale(1)" },
        ],
        { duration: 110, easing: "ease-in-out" },
      );
    }
  }

  function handleWordKey(key) {
    if (wordFinished) {
      return;
    }
    pulseWordGrid();
    if (key === "ENTER") {
      submitWordGuess();
      return;
    }
    if (key === "BACKSPACE") {
      wordCurrentGuess = wordCurrentGuess.slice(0, -1);
    } else {
      const letter = normalizeWordLetter(key, wordLanguage);
      if (!wordLetterPattern(wordLanguage).test(letter.slice(0, 1)) || wordCurrentGuess.length >= wordLength) {
        return;
      }
      wordCurrentGuess += letter;
    }

    wordStatus.textContent = "Keep going.";
    persistWordGame();
    renderWordGame();
  }

  function renderWordStats() {
    const stats = readWordStats(wordLanguage, wordLength);
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
      handleWordKey(normalizeWordLetter(event.key, wordLanguage));
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
