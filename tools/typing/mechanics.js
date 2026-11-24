"use strict";

// Pure mechanics of the typing test: random sentences, WPM and accuracy math.
(() => {
  const WORDS_RAW = [
    "about above across act agent aim arrive ask became become begin behind believe below best better both bring come common course cut did different do done down easy end even every example fast feel felt find first for found get give go going gone good great happen have he help here high how however important into is it its join keep kind know large learn leave let like little look long make man many may me meet member might more most move much must need never new no not now number of off often old on once one only open or other our out over own part people place play please point put quick rather real said same say see seem seem show small some soon start such sure take tell than that the their them then there these they thing think this those time to today two under until up use very want way we well went what when where whether which while who why will with without word would year yes you young your",
    "below bright calm change cold day deep eat eight eleven eye far felt fill finger five fly food four friendly fun go got guess hold home hope iron jump kind land large last learn leave left less letter like line lion listen little look low many may mile mind mood morning move near never new night note nothing once one open our out over page paint pair party pass past people pick place plan play please point put quick quiet reach ready record run said same sand school science sea seat second see seem self set seven shall short should sight six small soon sound south speak spell start stay step stop story study sun talk teach ten thank their them then thing think this three time to today together top tree true turn two under until up use used usual very want watch water way we week were west what when where whether white who why wind winter wish with without woman work world write yes yesterday you young",
    "above action active activity ancient animal answer anyone appear arrive attention beautiful become believe beside best beyond change character children clear comfortable come common complete consider contain correct course danger decision deep describe develop different difficult discover distance effect effort eight either electric eleven enable energy english enter equal especially evening experience expect explain face famous fast fear feel feel figure find finish five follow food foot force four free fresh friend future gain game get give good government great ground group grow happy hard have head health heart help here high history home hope human idea important import include increase individual industry inform inside interesting international iron job join journey judge just keep know land language large learn lesson letter life like listen little local long look lose lost love machine main make many master material matter mean measure method mind minute money morning most mountain move much music must my name nation natural nature near necessary need never new night no none nor north note nothing notice number object ocean offer office old one only open operation opinion order other others our out outside over own page paper part people place plan plant play please point population power prepare present probably problem process produce product program project promise provide public put question quick quiet rather reach ready reason receive record red relate remain remember represent result return right river road rock room round route rule run said same sand save school science sea season seat second secret security see seem self sentence separate serious service seven several shall shape share she ship short should show side sign similar simple since sing single six skill sleep slow small smile snow some someone something sometimes son song soon sound south space speak special sport spot spread spring stand start state statement stay steel stop store story street strong student study subject summer sun supply system table take talk teach team tell ten term test text than that the their them themselves then theory thing think this those thought through time today tomorrow top total touch toward town tree true try turn twelve two type under understand unit until upper use usually value view village visit voice walk wall want warm was water way we weather week well went were west what when where whether white who why wide window winter wish with within woman wonder work world write wrote year yellow yesterday you young your",
  ];
  const WORDS = WORDS_RAW.flatMap((s) => s.split(" ").filter(Boolean));

  function generateText(count, random) {
    const words = [];
    for (let i = 0; i < count; i++) {
      words.push(WORDS[Math.floor(random() * WORDS.length)]);
    }
    const text = words.join(" ");
    return text.charAt(0).toUpperCase() + text.slice(1) + ".";
  }

  function computeWpm(chars, seconds) {
    if (!seconds || seconds <= 0) return 0;
    return Math.round((chars / 5) / (seconds / 60));
  }

  function computeAccuracy(typed, target) {
    const limit = Math.min(typed.length, target.length);
    let correct = 0;
    for (let i = 0; i < limit; i++) {
      if (typed[i] === target[i]) correct += 1;
    }
    return Math.round((correct / Math.max(target.length, 1)) * 100);
  }

  function elapsedSeconds(startedAt) {
    return Math.max(0, (Date.now() - startedAt) / 1000);
  }

  window.TypingMechanics = { generateText, computeWpm, computeAccuracy, elapsedSeconds };
})();
