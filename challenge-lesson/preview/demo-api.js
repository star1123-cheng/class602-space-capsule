/* ============================================================
 * 本機預覽專用的假後端（不會推上 Apps Script）
 * 規則照 Code.gs 寫，資料存在這台電腦的瀏覽器，學生頁與投影頁可以開兩個分頁互相看到
 * 導師密碼：demo　課堂代碼：1234　網址加 ?seed=1 會放入虛構示範資料
 * ============================================================ */
(function() {
  const KEY = 'challenge-demo-db';
  const SEATS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '13', '14', '15', '16', '17'];
  const LIMIT = { CHALLENGE_COUNT: 3, CHALLENGE_LENGTH: 12, IDEA_COUNT: 3, IDEA_LENGTH: 40, VOTE_COUNT: 3, FEEDBACK_LENGTH: 100, FOCUS_CHALLENGES: 8 };
  let seq = Date.now();

  function blank() {
    return { stage: 'waiting', roomCode: '1234', challenges: [], ideas: [], votes: [], feedback: [] };
  }

  function seedData() {
    const db = blank();
    db.stage = new URLSearchParams(location.search).get('stage') || 'challenge';
    const challengeSeed = [
      ['01', '功課變多'], ['02', '功課變多'], ['03', '作業變多'], ['04', '功課變多'], ['05', '考試壓力'],
      ['06', '考試壓力'], ['07', '時間不夠用'], ['08', '時間不夠用'], ['09', '上台報告'], ['10', '早上爬不起來'],
      ['11', '和同學相處'], ['13', '和同學相處'], ['14', '要準備上國中'], ['15', '當學長姐的責任'], ['16', '數學變難'],
      ['17', '數學變難'], ['01', '考試壓力'], ['02', '時間不夠用'], ['03', '睡不飽'], ['05', '畢業旅行分組'], ['06', '功課變多']
    ];
    challengeSeed.forEach(function(pair) {
      db.challenges.push({ id: id(), seat: pair[0], text: pair[1], label: pair[1], hidden: false });
    });
    const ideaSeed = [
      ['04', '功課變多', '回家先寫最難的一科，寫完再休息'],
      ['07', '功課變多', '在學校下課先寫一點'],
      ['09', '考試壓力', '每天睡前花 10 分鐘複習'],
      ['10', '考試壓力', '和好朋友互相出題'],
      ['11', '時間不夠用', '用便利貼列出今天要做的三件事'],
      ['13', '時間不夠用', '先關掉平板再寫功課'],
      ['14', '數學變難', '不會就馬上問老師或小老師'],
      ['01', '和同學相處', '吵架後先冷靜，隔天再好好說'],
      ['02', '早上爬不起來', '晚上 10 點前上床']
    ];
    ideaSeed.forEach(function(row) {
      db.ideas.push({ id: id(), seat: row[0], challenge: row[1], text: row[2], hidden: false });
    });
    [['05', 0], ['06', 0], ['08', 4], ['15', 4], ['16', 6], ['17', 0], ['03', 2], ['03', 5]].forEach(function(v) {
      db.votes.push({ seat: v[0], ideaId: db.ideas[v[1]].id });
    });
    [['05', 0, '我想先試試看寫完再玩'], ['06', 4, '列清單感覺很有用'], ['08', 0, '']].forEach(function(f) {
      db.feedback.push({ seat: f[0], ideaId: db.ideas[f[1]].id, text: f[2] });
    });
    return db;
  }

  function id() {
    seq += 1;
    return 'd' + seq.toString(36);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 讀不到就用空白資料 */ }
    return blank();
  }

  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* 無痕模式存不了也沒關係 */ }
  }

  if (new URLSearchParams(location.search).get('seed') === '1') save(seedData());

  function clean(val, max) {
    return String(val || '').replace(/\s+/g, ' ').trim().replace(/^[=+\-@\s]+/, '').substring(0, max);
  }

  function label(text) {
    return String(text).replace(/[\s，。、！？!?,.~～…]+/g, '') || text;
  }

  function cloudOf(db) {
    const counts = {};
    db.challenges.forEach(function(c) { if (!c.hidden) counts[c.label] = (counts[c.label] || 0) + 1; });
    return Object.keys(counts).map(function(l) { return { label: l, count: counts[l] }; })
      .sort(function(a, b) { return b.count - a.count || a.label.localeCompare(b.label); });
  }

  function countOf(list, ideaId) {
    return list.filter(function(v) { return v.ideaId === ideaId; }).length;
  }

  function studentState(db, seat) {
    const fb = db.feedback.filter(function(f) { return f.seat === seat; })[0];
    return {
      status: 'success', stage: db.stage, seat: seat, limit: LIMIT,
      cloud: cloudOf(db), focus: cloudOf(db).slice(0, LIMIT.FOCUS_CHALLENGES),
      myChallenges: db.challenges.filter(function(c) { return c.seat === seat; }).map(function(c) { return { id: c.id, text: c.text }; }),
      ideas: db.stage === 'vote' || db.stage === 'message' ? db.ideas.filter(function(i) { return !i.hidden; }).map(function(i) {
        return { id: i.id, challenge: i.challenge, text: i.text, mine: i.seat === seat, votes: countOf(db.votes, i.id) };
      }) : [],
      myIdeas: db.ideas.filter(function(i) { return i.seat === seat; }).map(function(i) { return { id: i.id, challenge: i.challenge, text: i.text }; }),
      myVotes: db.votes.filter(function(v) { return v.seat === seat; }).map(function(v) { return v.ideaId; }),
      myFeedback: fb ? { ideaId: fb.ideaId, text: fb.text } : null
    };
  }

  function screenState(db) {
    const people = function(list) { return Object.keys(list.reduce(function(s, x) { s[x.seat] = 1; return s; }, {})).length; };
    return {
      status: 'success', stage: db.stage, roomCode: db.roomCode, totalSeats: SEATS.length, limit: LIMIT,
      cloud: cloudOf(db), focus: cloudOf(db).slice(0, LIMIT.FOCUS_CHALLENGES),
      challenges: db.challenges.map(function(c) { return { id: c.id, text: c.text, label: c.label, hidden: c.hidden }; }),
      ideas: db.ideas.map(function(i) {
        return { id: i.id, challenge: i.challenge, text: i.text, hidden: i.hidden, votes: countOf(db.votes, i.id), picks: countOf(db.feedback, i.id) };
      }),
      feedback: db.feedback.filter(function(f) { return f.text; }).map(function(f) { return { ideaId: f.ideaId, text: f.text }; }),
      progress: { challenge: people(db.challenges), idea: people(db.ideas), vote: people(db.votes), message: people(db.feedback) }
    };
  }

  function fail(message, code) {
    const err = new Error(message);
    err.code = code || '';
    throw err;
  }

  function handle(p) {
    const db = load();
    const action = p.action;

    if (action.indexOf('teacher') === 0) {
      if (p.key !== 'demo') fail('密碼不正確。（示範模式密碼是 demo）', 'WRONG_KEY');
      if (action === 'teacherSetStage') db.stage = p.stage;
      if (action === 'teacherNewCode') db.roomCode = String(Math.floor(1000 + Math.random() * 9000));
      if (action === 'teacherSetHidden') {
        const list = p.kind === 'idea' ? db.ideas : db.challenges;
        list.forEach(function(x) { if (x.id === p.id) x.hidden = Boolean(p.hidden); });
      }
      if (action === 'teacherRelabel') {
        db.challenges.forEach(function(c) { if (c.label === p.from) c.label = p.to; });
        db.ideas.forEach(function(i) { if (i.challenge === p.from) i.challenge = p.to; });
      }
      if (action === 'teacherClearAll') {
        if (p.confirm !== '清除') fail('請輸入「清除」兩個字確認。');
        const fresh = blank();
        fresh.roomCode = db.roomCode;
        save(fresh);
        return screenState(fresh);
      }
      save(db);
      return screenState(db);
    }

    const seat = p.seat;
    if (SEATS.indexOf(seat) === -1) fail('座號不正確，請再確認一次。', 'BAD_SEAT');
    if (String(p.code) !== db.roomCode) fail('課堂代碼不對，請看投影幕上的 4 位數字。（示範模式是 1234）', 'BAD_CODE');

    if (action === 'addChallenge') {
      if (db.stage !== 'challenge') fail('現在還不能寫挑戰喔，請看老師的指示。', 'STAGE');
      const text = clean(p.text, LIMIT.CHALLENGE_LENGTH);
      if (!text) fail('先寫下一個挑戰，再送出。');
      const mine = db.challenges.filter(function(c) { return c.seat === seat; });
      if (mine.length >= LIMIT.CHALLENGE_COUNT) fail('每人最多寫 3 個挑戰，可以先刪掉一個再寫。');
      if (mine.some(function(c) { return c.text === text; })) fail('這個挑戰你已經寫過了。');
      db.challenges.push({ id: id(), seat: seat, text: text, label: label(text), hidden: false });
    } else if (action === 'addIdea') {
      if (db.stage !== 'idea') fail('現在還不能寫方法喔，請看老師的指示。', 'STAGE');
      const text = clean(p.text, LIMIT.IDEA_LENGTH);
      if (!text) fail('先寫下你想到的方法，再送出。');
      if (!cloudOf(db).slice(0, 8).some(function(c) { return c.label === p.challenge; })) fail('這個挑戰不在清單裡，請重新選一次。');
      if (db.ideas.filter(function(i) { return i.seat === seat; }).length >= LIMIT.IDEA_COUNT) fail('每人最多寫 3 個方法，可以先刪掉一個再寫。');
      db.ideas.push({ id: id(), seat: seat, challenge: p.challenge, text: text, hidden: false });
    } else if (action === 'deleteMine') {
      if (db.stage !== p.kind) fail('這個活動已經結束，不能再修改了。', 'STAGE');
      const key = p.kind === 'idea' ? 'ideas' : 'challenges';
      db[key] = db[key].filter(function(x) { return !(x.id === p.id && x.seat === seat); });
      if (p.kind === 'idea') db.votes = db.votes.filter(function(v) { return v.ideaId !== p.id; });
    } else if (action === 'toggleVote') {
      if (db.stage !== 'vote') fail('現在不是投票時間喔。', 'STAGE');
      const idea = db.ideas.filter(function(i) { return i.id === p.ideaId && !i.hidden; })[0];
      if (!idea) fail('找不到這個方法。');
      if (idea.seat === seat) fail('自己的方法不能投給自己，留給別人投吧！');
      const existing = db.votes.findIndex(function(v) { return v.seat === seat && v.ideaId === p.ideaId; });
      if (existing !== -1) db.votes.splice(existing, 1);
      else {
        if (db.votes.filter(function(v) { return v.seat === seat; }).length >= LIMIT.VOTE_COUNT) fail('你的 3 票都投完了，想換的話先收回一票。');
        db.votes.push({ seat: seat, ideaId: p.ideaId });
      }
    } else if (action === 'saveFeedback') {
      if (db.stage !== 'message') fail('現在還不能寫回饋喔。', 'STAGE');
      if (!p.ideaId) fail('先選一個你想試試看的方法。');
      db.feedback = db.feedback.filter(function(f) { return f.seat !== seat; });
      db.feedback.push({ seat: seat, ideaId: p.ideaId, text: clean(p.text, LIMIT.FEEDBACK_LENGTH) });
    }
    save(db);
    return studentState(db, seat);
  }

  // 模擬網路延遲，順便測試按鈕在等待時會不會被連按
  window.DEMO_API = function(payload) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        try { resolve(handle(payload)); } catch (err) { reject(err); }
      }, 250);
    });
  };
})();
