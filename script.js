(function(){
  "use strict";

  /* ---------------- FIREBASE SHARED LEADERBOARD ---------------- */
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDONGeJkSk-QOfxfnhxjVls6IxUAKcolh4",
    authDomain: "quiz-gaming-3881d.firebaseapp.com",
    databaseURL: "https://quiz-gaming-3881d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "quiz-gaming-3881d"
  };

  let fbDb = null;
  let firebaseReady = false;
  try{
    if(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" && window.firebase){
      firebase.initializeApp(FIREBASE_CONFIG);
      fbDb = firebase.database();
      firebaseReady = true;
    }
  }catch(err){
    console.warn("Firebase not configured — using local per-device leaderboard.", err);
    firebaseReady = false;
  }

  /* ---------------- QUESTION BANK ---------------- */
  const BANK = {
    html: [
      {q:"What does HTML stand for?", o:["Hyper Trainer Marking Language","Hyper Text Markup Language","Hyper Text Marketing Language","Hyperlinks Text Mark Language"], a:1},
      {q:"Which tag is used to create a hyperlink?", o:["<link>","<href>","<a>","<url>"], a:2},
      {q:"Which tag is used to insert an image in HTML?", o:["<image>","<img>","<pic>","<src>"], a:1},
      {q:"Which HTML tag is used to define an internal style sheet?", o:["<css>","<script>","<style>","<link>"], a:2},
      {q:"Which attribute specifies an alternate text for an image?", o:["title","alt","src","longdesc"], a:1},
      {q:"What is the correct HTML element for the largest heading?", o:["<h6>","<heading>","<h1>","<head>"], a:2},
      {q:"Which tag is used to create an ordered list?", o:["<ul>","<li>","<ol>","<list>"], a:2},
      {q:"Which HTML5 tag is used to play video?", o:["<media>","<video>","<movie>","<play>"], a:1},
      {q:"What is the correct syntax for a comment in HTML?", o:["// comment","<!-- comment -->","/* comment */","# comment"], a:1},
      {q:"Which tag defines a table row?", o:["<td>","<tr>","<th>","<row>"], a:1}
    ],
    css: [
      {q:"What does CSS stand for?", o:["Creative Style Sheets","Cascading Style Sheets","Colorful Style Sheets","Computer Style Sheets"], a:1},
      {q:"Which property is used to change the text color in CSS?", o:["text-color","font-color","color","fgcolor"], a:2},
      {q:"Which CSS property controls the spacing between lines of text?", o:["line-height","letter-spacing","word-spacing","text-indent"], a:0},
      {q:"How do you select an element with id 'header' in CSS?", o:[".header",".#header","#header","*header"], a:2},
      {q:"Which property is used to change the background color?", o:["bg-color","background-color","color-bg","back-color"], a:1},
      {q:"Which value of 'position' places an element relative to the browser window?", o:["relative","static","fixed","inherit"], a:2},
      {q:"Which CSS property is used to make text bold?", o:["font-weight","text-style","font-style","text-bold"], a:0},
      {q:"What does 'flex-direction: column' do in Flexbox?", o:["Aligns items horizontally","Stacks items vertically","Wraps items","Reverses order only"], a:1},
      {q:"Which unit is relative to the root element's font size?", o:["em","px","rem","vh"], a:2},
      {q:"Which property adds space outside an element's border?", o:["padding","margin","spacing","gap"], a:1}
    ],
    js: [
      {q:"Which keyword is used to declare a constant in JavaScript?", o:["let","var","const","static"], a:2},
      {q:"Which method converts a JSON string into a JS object?", o:["JSON.parse()","JSON.stringify()","JSON.toObject()","JSON.convert()"], a:0},
      {q:"What will typeof 'null' return in JavaScript?", o:["'null'","'undefined'","'object'","'boolean'"], a:2},
      {q:"Which function is used to select an element by its id?", o:["document.querySelector()","document.getElementById()","document.getElement()","document.selectId()"], a:1},
      {q:"Which operator checks both value and type equality?", o:["==","=","===","!="], a:2},
      {q:"Which method adds a new element to the end of an array?", o:["push()","pop()","shift()","unshift()"], a:0},
      {q:"What is the correct way to write a JavaScript arrow function?", o:["function => (x) {}","(x) => {}","x -> {}","=>(x){}"], a:1},
      {q:"Which event fires when a user clicks an HTML element?", o:["onhover","onchange","onclick","onfocus"], a:2},
      {q:"Which method is used to add an event listener in JavaScript?", o:["addEventListener()","attachEvent()","onEvent()","listenTo()"], a:0},
      {q:"What does 'NaN' stand for in JavaScript?", o:["Name and Number","Not a Number","Null and None","New Array Node"], a:1}
    ]
  };

  const CAT_LABELS = { html:"HTML", css:"CSS", js:"JavaScript" };
  const NEXT_CATEGORY = { html:"css", css:"js", js:null };
  const DIFF_TIME = { easy:20, medium:15, hard:10 };
  const QUESTIONS_PER_ROUND = 8;

  /* ---------------- STATE ---------------- */
  let state = {
    category:"html",
    difficulty:"easy",
    playerName:"",
    questions:[],
    idx:0,
    score:0,
    correctCount:0,
    streak:0,
    timeLeft:20,
    timerId:null,
    locked:false
  };

  const LS_KEY_BEST = "vaultquiz_best";
  const LS_KEY_PLAYED = "vaultquiz_played";
  const LS_KEY_LEADER = "vaultquiz_leaderboard";
  const LS_KEY_PROGRESS = "quizgaming_progress";
  const LS_KEY_PLAYER = "quizgaming_playername";
  const LS_KEY_CERT_ID = "quizgaming_certid";
  const LS_KEY_CERT_DATE = "quizgaming_certdate";
  const CERT_PASS_PCT = 80;

  /* ---------------- GIFT TIERS (used for result medal only) ---------------- */
  const GIFT_TIERS = [
    { id:"bronze", name:"Bronze Charm", min:20, desc:"A small keepsake for stepping into the vault.", icon: iconMedal("#c98a4b") },
    { id:"silver", name:"Silver Coin Pouch", min:45, desc:"Awarded to sharp minds who beat the clock.", icon: iconCoin("#c7cbe0") },
    { id:"gold", name:"Golden Crown", min:70, desc:"Reserved for true vault keepers.", icon: iconCrown("#f0c356") },
    { id:"diamond", name:"Diamond Vault Key", min:90, desc:"The rarest prize — a perfect run of mastery.", icon: iconGem("#7fe8d0") }
  ];

  function iconMedal(color){
    return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="14" r="7" fill="${color}"/><circle cx="12" cy="14" r="4" fill="#0a0d1a" opacity="0.3"/><path d="M8 3L10 10L12 8L14 10L16 3" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function iconCoin(color){
    return `<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="12" rx="9" ry="9" fill="${color}"/><ellipse cx="12" cy="12" rx="5.5" ry="5.5" stroke="#0a0d1a" stroke-width="1.4" opacity="0.35"/><text x="12" y="16" font-size="9" text-anchor="middle" fill="#0a0d1a" opacity="0.5">$</text></svg>`;
  }
  function iconCrown(color){
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M3 18h18l-1.5-9-4.5 4-3-6-3 6-4.5-4L3 18z" fill="${color}"/><circle cx="12" cy="6" r="1.4" fill="${color}"/></svg>`;
  }
  function iconGem(color){
    return `<svg viewBox="0 0 24 24" fill="none"><polygon points="12,2 21,9 17,22 7,22 3,9" fill="${color}"/><polygon points="12,2 21,9 12,10.5" fill="#ffffff" opacity="0.35"/></svg>`;
  }

  /* ---------------- HELPERS ---------------- */
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function pickQuestions(cat){
    const pool = shuffle(BANK[cat]);
    return pool.slice(0, Math.min(QUESTIONS_PER_ROUND, pool.length));
  }

  function show(screenId){
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    document.getElementById(screenId).classList.add("active");
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function getBest(){ return parseInt(localStorage.getItem(LS_KEY_BEST) || "0", 10); }
  function getPlayed(){ return parseInt(localStorage.getItem(LS_KEY_PLAYED) || "0", 10); }
  function getLocalLeaderboard(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY_LEADER) || "[]"); }catch(e){ return []; }
  }
  function saveLocalLeaderboard(board){
    board.sort((a,b)=>b.score-a.score);
    board = board.slice(0,10);
    localStorage.setItem(LS_KEY_LEADER, JSON.stringify(board));
    return board;
  }
  /** Add a new score. Writes to shared Firebase DB when configured,
   *  otherwise falls back to this device's local leaderboard. */
  function pushLeaderboardEntry(entry){
    if(firebaseReady){
      fbDb.ref("leaderboard").push(entry).catch(err=>{
        console.warn("Firebase write failed, saving locally instead.", err);
        renderLeaderboardData(saveLocalLeaderboard([...getLocalLeaderboard(), entry]));
      });
    } else {
      renderLeaderboardData(saveLocalLeaderboard([...getLocalLeaderboard(), entry]));
    }
  }
  /** Subscribes to live leaderboard updates (Firebase) or renders the
   *  local leaderboard once when Firebase isn't configured. */
  function listenLeaderboard(){
    if(firebaseReady){
      fbDb.ref("leaderboard").orderByChild("score").limitToLast(10).on("value", snapshot=>{
        const arr = [];
        snapshot.forEach(child=>{ arr.push(child.val()); });
        arr.sort((a,b)=>b.score-a.score);
        renderLeaderboardData(arr);
      }, err=>{
        console.warn("Firebase read failed, showing local leaderboard.", err);
        renderLeaderboardData(getLocalLeaderboard());
      });
    } else {
      renderLeaderboardData(getLocalLeaderboard());
    }
  }
  /** Progress is scoped PER PLAYER NAME so a new/different name on the
   *  same browser always starts at 0% — old test data can never make a
   *  new player falsely "eligible" for the certificate. */
  function progressKey(){
    const name = (state.playerName || localStorage.getItem(LS_KEY_PLAYER) || "guest");
    const safe = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "guest";
    return LS_KEY_PROGRESS + "::" + safe;
  }
  function getProgress(){
    try{ return JSON.parse(localStorage.getItem(progressKey()) || "{}"); }catch(e){ return {}; }
  }
  function saveProgress(catId, pct){
    const prog = getProgress();
    const prev = prog[catId] || 0;
    prog[catId] = Math.max(prev, pct);
    localStorage.setItem(progressKey(), JSON.stringify(prog));
    return prog;
  }
  function isCertEligible(prog){
    return ["html","css","js"].every(c => (prog[c]||0) >= CERT_PASS_PCT);
  }

  function tierForScore(score){
    let tier = null;
    GIFT_TIERS.forEach(t=>{ if(score >= t.min) tier = t; });
    return tier;
  }

  function refreshHeaderStats(){
    document.getElementById("statPlayed").textContent = getPlayed();
    document.getElementById("statBest").textContent = getBest();
    const prog = getProgress();
    const certCount = ["html","css","js"].filter(c => (prog[c]||0) >= CERT_PASS_PCT).length;
    document.getElementById("statCertified").textContent = certCount + "/3";
  }

  /* ---------------- HOME SCREEN INTERACTIONS ---------------- */
  document.getElementById("categoryChips").addEventListener("click", e=>{
    const chip = e.target.closest(".chip"); if(!chip) return;
    document.querySelectorAll("#categoryChips .chip").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");
    state.category = chip.dataset.cat;
  });
  document.getElementById("diffChips").addEventListener("click", e=>{
    const chip = e.target.closest(".chip"); if(!chip) return;
    document.querySelectorAll("#diffChips .chip").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");
    state.difficulty = chip.dataset.diff;
  });

  document.getElementById("startBtn").addEventListener("click", ()=>{
    const nameInput = document.getElementById("playerName");
    state.playerName = nameInput.value.trim() || "Guest Player";
    refreshHeaderStats();
    renderCertProgress();
    startQuiz();
  });

  document.getElementById("quitBtn").addEventListener("click", ()=>{
    clearInterval(state.timerId);
    show("screen-home");
  });

  document.getElementById("playAgainBtn").addEventListener("click", ()=>{
    show("screen-home");
  });

  document.getElementById("nextQuizBtn").addEventListener("click", ()=>{
    const next = NEXT_CATEGORY[state.category];
    if(next){
      state.category = next;
      startQuiz();
    } else {
      openOrScrollCertificate();
    }
  });

  document.getElementById("viewCertBtn").addEventListener("click", ()=>{
    openOrScrollCertificate();
  });

  function openOrScrollCertificate(){
    const prog = getProgress();
    if(isCertEligible(prog)){
      openCertificate();
    } else {
      document.querySelector(".cert-section").scrollIntoView({behavior:"smooth", block:"start"});
    }
  }

  /* ---------------- QUIZ FLOW ---------------- */
  function startQuiz(){
    state.questions = pickQuestions(state.category);
    state.idx = 0;
    state.score = 0;
    state.correctCount = 0;
    state.streak = 0;
    document.getElementById("catTag").textContent = CAT_LABELS[state.category];
    show("screen-quiz");
    renderQuestion();
  }

  function renderQuestion(){
    state.locked = false;
    const q = state.questions[state.idx];
    document.getElementById("qCount").textContent = `Question ${state.idx+1} / ${state.questions.length}`;
    document.getElementById("progressFill").style.width = ((state.idx)/state.questions.length*100) + "%";
    document.getElementById("questionText").textContent = q.q;
    document.getElementById("liveScore").textContent = state.score;
    document.getElementById("liveStreak").textContent = state.streak;

    // reset the "time's up" feedback banner for the new question
    const banner = document.getElementById("timeUpBanner");
    if(banner) banner.classList.remove("show");
    const timerRing = document.querySelector(".timer-ring");
    if(timerRing) timerRing.classList.remove("time-critical");

    const wrap = document.getElementById("optionsWrap");
    wrap.innerHTML = "";
    const letters = ["A","B","C","D"];
    q.o.forEach((opt, i)=>{
      const btn = document.createElement("button");
      btn.className = "option";
      const letterSpan = document.createElement("span");
      letterSpan.className = "letter";
      letterSpan.textContent = letters[i];
      const textSpan = document.createElement("span");
      textSpan.textContent = opt;
      btn.appendChild(letterSpan);
      btn.appendChild(textSpan);
      btn.addEventListener("click", ()=>handleAnswer(i, btn));
      wrap.appendChild(btn);
    });

    startTimer();
  }

  function startTimer(){
    clearInterval(state.timerId);
    const total = DIFF_TIME[state.difficulty];
    state.timeLeft = total;
    const circumference = 163;
    document.getElementById("timerNum").textContent = state.timeLeft;
    const bar = document.getElementById("timerBar");
    bar.style.strokeDasharray = circumference;
    bar.style.strokeDashoffset = 0;

    state.timerId = setInterval(()=>{
      state.timeLeft--;
      document.getElementById("timerNum").textContent = Math.max(state.timeLeft,0);
      const offset = circumference * (1 - state.timeLeft/total);
      bar.style.strokeDashoffset = offset;

      // visual urgency in the last 5 seconds
      const timerRing = document.querySelector(".timer-ring");
      if(timerRing){
        if(state.timeLeft <= 5 && state.timeLeft > 0) timerRing.classList.add("time-critical");
        else timerRing.classList.remove("time-critical");
      }

      if(state.timeLeft <= 0){
        clearInterval(state.timerId);
        handleAnswer(-1, null); // time's up — no option was selected
      }
    }, 1000);
  }

  /**
   * selectedIdx === -1 means the timer ran out and the user did NOT click
   * any option. That case must always be scored as WRONG (no points,
   * streak reset) and must clearly show the user it was marked wrong —
   * it should never be silently skipped or look like a correct answer.
   */
  function handleAnswer(selectedIdx, btnEl){
    if(state.locked) return;
    state.locked = true;
    clearInterval(state.timerId);

    const q = state.questions[state.idx];
    const isTimeout = selectedIdx === -1;
    const isCorrect = !isTimeout && selectedIdx === q.a;

    const options = document.querySelectorAll("#optionsWrap .option");
    options.forEach((opt, i)=>{
      opt.disabled = true;
      if(i === q.a){
        opt.classList.add("correct");
      } else if(i === selectedIdx){
        opt.classList.add("wrong");
      } else {
        opt.classList.add("dim");
      }
    });

    // clear, explicit feedback when the question timed out unanswered
    const banner = document.getElementById("timeUpBanner");
    if(isTimeout && banner){
      banner.classList.add("show");
    }

    if(isCorrect){
      const timeBonus = Math.max(state.timeLeft, 0);
      const gained = 10 + timeBonus;
      state.score += gained;
      state.correctCount++;
      state.streak++;
    } else {
      // wrong answer OR timeout — no points, streak resets
      state.streak = 0;
    }

    document.getElementById("liveScore").textContent = state.score;
    document.getElementById("liveStreak").textContent = state.streak;

    setTimeout(()=>{
      state.idx++;
      if(state.idx < state.questions.length){
        renderQuestion();
      } else {
        finishQuiz();
      }
    }, isTimeout ? 1500 : 1100);
  }

  function finishQuiz(){
    document.getElementById("progressFill").style.width = "100%";
    const finalScore = state.score;

    // persist stats
    const played = getPlayed() + 1;
    localStorage.setItem(LS_KEY_PLAYED, played);
    const best = Math.max(getBest(), finalScore);
    localStorage.setItem(LS_KEY_BEST, best);

    // leaderboard (shared via Firebase when configured, else local device only)
    pushLeaderboardEntry({
      name: state.playerName,
      score: finalScore,
      tier: (tierForScore(finalScore)||{name:"—"}).name,
      category: CAT_LABELS[state.category],
      date: Date.now()
    });

    // certificate subject progress (best % per subject)
    const pct = Math.round((state.correctCount / state.questions.length) * 100);
    saveProgress(state.category, pct);
    localStorage.setItem(LS_KEY_PLAYER, state.playerName);

    renderResult(finalScore);
    renderCertProgress();
    refreshHeaderStats();
    show("screen-result");
  }

  function renderResult(finalScore){
    const tier = tierForScore(finalScore);
    const pct = Math.round((state.correctCount / state.questions.length) * 100);
    document.getElementById("resultScore").textContent = finalScore + " pts";
    document.getElementById("resultSub").textContent =
      `${state.playerName}, you answered ${state.correctCount} of ${state.questions.length} correctly (${pct}%) in ${CAT_LABELS[state.category]}.`;
    document.getElementById("resultTier").textContent = tier ? tier.name.toUpperCase() + " TIER" : "KEEP CLIMBING";
    document.getElementById("medalIcon").innerHTML = tier ? tier.icon : iconMedal("#616a94");

    const nextBtn = document.getElementById("nextQuizBtn");
    const nextCat = NEXT_CATEGORY[state.category];
    if(nextCat){
      nextBtn.style.display = "";
      nextBtn.textContent = `Next: Play ${CAT_LABELS[nextCat]} Quiz →`;
    } else {
      nextBtn.style.display = "none";
    }
  }

  /* ---------------- LEADERBOARD RENDER ---------------- */
  function renderLeaderboardData(board){
    const body = document.getElementById("leaderBody");
    const syncNote = document.getElementById("leaderSyncNote");
    if(syncNote){
      syncNote.textContent = firebaseReady
        ? "🌐 Live"
        : "Live 💡";
    }
    if(!board.length){
      body.innerHTML = `<div class="empty-note">No runs yet — finish a quiz to appear on the board.</div>`;
      return;
    }
    body.innerHTML = board.map((row, i)=>`
      <div class="leader-row">
        <div class="rank ${i===0 ? 'top1':''}">${i+1}</div>
        <div class="lname">${escapeHTML(row.name)}</div>
        <div class="lscore">${row.score}</div>
        <div class="ltier">${escapeHTML(row.tier)}</div>
      </div>
    `).join("");
  }

  function escapeHTML(str){
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- CERTIFICATE PROGRESS RENDER ---------------- */
  const SUBJ_ORDER = ["html","css","js"];
  const SUBJ_FULL = { html:"HTML", css:"CSS", js:"JavaScript" };

  function renderCertProgress(){
    const prog = getProgress();
    const grid = document.getElementById("subjGrid");
    grid.innerHTML = "";
    SUBJ_ORDER.forEach(id=>{
      const pct = prog[id] || 0;
      const pass = pct >= CERT_PASS_PCT;
      const card = document.createElement("div");
      card.className = "subj-card";
      card.innerHTML = `
        <div class="subj-top">
          <div class="subj-name">${SUBJ_FULL[id]}</div>
          <div class="subj-check ${pass ? 'pass':''}">${pass ? '✓' : '–'}</div>
        </div>
        <div class="subj-bar-track"><div class="subj-bar-fill" style="width:${pct}%"></div></div>
        <div class="subj-pct">Best score: <b>${pct}%</b> ${pass ? '· Passed' : '· Need '+CERT_PASS_PCT+'%'}</div>
      `;
      grid.appendChild(card);
    });

    const eligible = isCertEligible(prog);
    const badge = document.getElementById("certStatusBadge");
    const btn = document.getElementById("genCertBtn");
    const hint = document.getElementById("certHint");
    if(eligible){
      badge.textContent = "Ready to Claim";
      badge.classList.add("ready");
      btn.disabled = false;
      hint.textContent = "Congratulations! You've cleared HTML, CSS and JavaScript with 80%+ each. Your certificate is ready.";
    } else {
      badge.textContent = "Not Ready";
      badge.classList.remove("ready");
      btn.disabled = true;
      hint.textContent = "Play HTML, CSS and JavaScript rounds and score at least " + CERT_PASS_PCT + "% correct in each to unlock your certificate.";
    }
  }

  function buildScanCode(seed){
    // deterministic pseudo scan-code (visual-only fallback if the real QR
    // library fails to load) generated from a seed string
    const size = 9;
    let hash = 0;
    for(let i=0;i<seed.length;i++){ hash = (hash * 31 + seed.charCodeAt(i)) >>> 0; }
    let cells = "";
    const cell = 8;
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        hash = (hash * 1103515245 + 12345) >>> 0;
        const on = (hash >> 5) % 2 === 0;
        // keep finder corners solid for a QR-like look
        const isFinder = (r<3 && c<3) || (r<3 && c>size-4) || (r>size-4 && c<3);
        const fill = isFinder ? (( (r===1||r===size-2||c===1) ) ? "#fdf9ef" : "#1a1408") : (on ? "#1a1408" : "#fdf9ef");
        cells += `<rect x="${c*cell}" y="${r*cell}" width="${cell}" height="${cell}" fill="${fill}"/>`;
      }
    }
    return `<svg width="90" height="90" viewBox="0 0 ${size*cell} ${size*cell}" style="border-radius:6px; background:#fdf9ef;">${cells}</svg>`;
  }

  /** Generates a REAL, camera-scannable QR code (standard finder patterns +
   *  quiet zone) that encodes a verification URL. Any phone can scan it. */
  function buildQRCode(text){
    if(typeof qrcode === "undefined"){
      console.warn("QR library not loaded — showing a decorative code instead.");
      return buildScanCode(text);
    }
    try{
      const qr = qrcode(0, "M"); // type 0 = auto-size, M = medium error correction
      qr.addData(text);
      qr.make();
      const count = qr.getModuleCount();
      const cell = 4;
      const quiet = 4; // standard QR quiet-zone border so scanners can lock on
      const size = (count + quiet * 2) * cell;
      let cells = "";
      for(let r=0;r<count;r++){
        for(let c=0;c<count;c++){
          if(qr.isDark(r,c)){
            cells += `<rect x="${(c+quiet)*cell}" y="${(r+quiet)*cell}" width="${cell}" height="${cell}" fill="#1a1408"/>`;
          }
        }
      }
      return `<svg width="90" height="90" viewBox="0 0 ${size} ${size}" style="border-radius:6px;">
        <rect x="0" y="0" width="${size}" height="${size}" fill="#ffffff"/>
        ${cells}
      </svg>`;
    }catch(err){
      console.warn("QR generation failed, falling back.", err);
      return buildScanCode(text);
    }
  }

  function openCertificate(){
    const prog = getProgress();
    if(!isCertEligible(prog)) return;

    const name = state.playerName || localStorage.getItem(LS_KEY_PLAYER) || "Guest Player";
    const certIdKey = LS_KEY_CERT_ID + "::" + progressKey();
    const certDateKey = LS_KEY_CERT_DATE + "::" + progressKey();

    // reuse the same certificate ID/date every time THIS player views it,
    // so the QR code always points to one stable, verifiable record
    let certId = localStorage.getItem(certIdKey);
    let issuedAt = parseInt(localStorage.getItem(certDateKey) || "0", 10);
    if(!certId || !issuedAt){
      const now = new Date();
      certId = "QG-" + now.getFullYear() + "-" + Math.abs(hashStr(name + now.getTime())).toString(36).toUpperCase().slice(0,6);
      issuedAt = now.getTime();
      localStorage.setItem(certIdKey, certId);
      localStorage.setItem(certDateKey, String(issuedAt));
    }
    const dateStr = new Date(issuedAt).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });

    document.getElementById("certVerifiedBadge").classList.remove("show");
    document.getElementById("certName").textContent = name;
    document.getElementById("certDate").textContent = "Issued: " + dateStr;
    document.getElementById("certId").textContent = "Certificate No: " + certId;
    document.getElementById("certScanId").textContent = "ID: " + certId;

    const verifyUrl = location.origin + location.pathname + "?verify=" + encodeURIComponent(certId);
    document.getElementById("certScanCode").innerHTML = buildQRCode(verifyUrl);

    const subjWrap = document.getElementById("certSubjects");
    subjWrap.innerHTML = SUBJ_ORDER.map(id => `<div class="cert-subject-pill">${SUBJ_FULL[id]} · ${prog[id]}%</div>`).join("");

    // publish this certificate so scanning the QR from ANY device can look
    // it up and show the exact same certificate back
    if(firebaseReady){
      fbDb.ref("certificates/" + certId).set({
        name: name,
        html: prog.html || 0,
        css: prog.css || 0,
        js: prog.js || 0,
        issuedAt: issuedAt
      }).catch(err=> console.warn("Could not publish certificate for verification:", err));
    }

    document.getElementById("certOverlay").classList.add("show");
  }

  /** If this page was opened via a certificate's QR code (?verify=ID),
   *  look the certificate up in Firebase and display the exact same
   *  certificate automatically, marked as verified. */
  function checkCertificateVerification(){
    const params = new URLSearchParams(location.search);
    const certId = params.get("verify");
    if(!certId) return;

    if(!firebaseReady){
      alert("This certificate can't be verified right now — the site owner hasn't connected Firebase yet.");
      return;
    }

    fbDb.ref("certificates/" + certId).once("value").then(snapshot=>{
      const data = snapshot.val();
      if(!data){
        alert("No certificate found for ID: " + certId);
        return;
      }
      const dateStr = new Date(data.issuedAt).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });

      document.getElementById("certVerifiedBadge").classList.add("show");
      document.getElementById("certName").textContent = data.name;
      document.getElementById("certDate").textContent = "Issued: " + dateStr;
      document.getElementById("certId").textContent = "Certificate No: " + certId;
      document.getElementById("certScanId").textContent = "ID: " + certId;

      const verifyUrl = location.origin + location.pathname + "?verify=" + encodeURIComponent(certId);
      document.getElementById("certScanCode").innerHTML = buildQRCode(verifyUrl);

      const subjWrap = document.getElementById("certSubjects");
      subjWrap.innerHTML = SUBJ_ORDER.map(id => `<div class="cert-subject-pill">${SUBJ_FULL[id]} · ${data[id]||0}%</div>`).join("");

      document.getElementById("certOverlay").classList.add("show");
    }).catch(err=>{
      console.error("Verification lookup failed:", err);
      alert("Couldn't verify this certificate right now. Please try again later.");
    });
  }

  function hashStr(str){
    let h = 0;
    for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0; }
    return h;
  }

  /* ---------------- CERTIFICATE DOWNLOAD (JPG, one click, no cropping) ---------------- */
  function downloadCertificateAsJPG(){
    const original = document.getElementById("certificateNode");
    const btn = document.getElementById("certDownloadBtn");
    if(!original || !btn) return;

    if(typeof html2canvas === "undefined"){
      alert("Download library failed to load. Please check your internet connection and try again.");
      return;
    }

    const originalText = btn.textContent;
    btn.textContent = "Preparing…";
    btn.disabled = true;

    // Clone the certificate into an offscreen, padded wrapper. This
    // guarantees the certificate's outer black border and drop-shadow
    // always have breathing room and can NEVER get clipped at the
    // capture edges, regardless of screen size or scroll position.
    const PAD = 40;
    const rect = original.getBoundingClientRect();
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "-99999px";
    wrapper.style.zIndex = "-1";
    wrapper.style.padding = PAD + "px";
    wrapper.style.background = "#fdf9ef";
    wrapper.style.width = (rect.width + PAD * 2) + "px";

    const clone = original.cloneNode(true);
    clone.style.width = rect.width + "px";
    clone.style.margin = "0";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    html2canvas(wrapper, {
      scale: 3,                 // sharp, high-resolution export
      backgroundColor: "#fdf9ef",
      useCORS: true,
      logging: false
    }).then(canvas => {
      const link = document.createElement("a");
      const safeName = (localStorage.getItem(LS_KEY_PLAYER) || "Player").replace(/[^a-z0-9]+/gi, "-");
      link.download = `Quiz-Gaming-Certificate-${safeName}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      document.body.appendChild(link);
      link.click();
      link.remove();
      wrapper.remove();
      btn.textContent = originalText;
      btn.disabled = false;
    }).catch(err=>{
      console.error("Certificate download failed:", err);
      wrapper.remove();
      btn.textContent = originalText;
      btn.disabled = false;
      alert("Something went wrong generating the image. Please try again.");
    });
  }

  document.getElementById("genCertBtn").addEventListener("click", openCertificate);
  document.getElementById("certCloseBtn").addEventListener("click", ()=>{
    document.getElementById("certOverlay").classList.remove("show");
  });
  document.getElementById("certDownloadBtn").addEventListener("click", downloadCertificateAsJPG);
  document.getElementById("certOverlay").addEventListener("click", (e)=>{
    if(e.target.id === "certOverlay") document.getElementById("certOverlay").classList.remove("show");
  });

  /* ---------------- INIT ---------------- */
  function init(){
    const savedName = localStorage.getItem(LS_KEY_PLAYER);
    if(savedName){
      document.getElementById("playerName").value = savedName;
      state.playerName = savedName;
    }
    refreshHeaderStats();
    listenLeaderboard();
    renderCertProgress();
    checkCertificateVerification();
  }
  init();

})();
