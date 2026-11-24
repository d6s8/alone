"use strict";

(() => {
  const wordFirstPuzzleDate = "2026-04-20";

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
  function wordSaveIsValid(value, expectedAnswer, language = "en", length = 5) {
    const validWords = validWordSets[language];
    return (
      value &&
      typeof value === "object" &&
      value.answer === expectedAnswer &&
      Array.isArray(value.guesses) &&
      value.guesses.length <= 6 &&
      value.guesses.every((entry) =>
        entry &&
        typeof entry.word === "string" &&
        entry.word.length === length &&
        wordLetterPattern(language).test(entry.word) &&
        validWords.has(entry.word) &&
        Array.isArray(entry.states) &&
        entry.states.length === wordLength &&
        entry.states.every((state) =>
          ["is-correct", "is-present", "is-absent"].includes(state)
        )
      ) &&
      typeof value.currentGuess === "string" &&
      value.currentGuess.length < length &&
      (value.currentGuess === "" || wordLetterPattern(language).test(value.currentGuess))
    );
  }

  window.WordleMechanics = {
    wordAnswersByLanguage, extraWordGuesses, validWordSets,
    wordFirstPuzzleDate,
    wordLetterPattern, normalizeWordLetter,
    wordAnswerList, wordDayNumber, dailyWordFor, createWordStorageKey,
    wordStatsStorageKey, readWordStats,
    scoreWordGuess, wordSaveIsValid,
  };
})();
