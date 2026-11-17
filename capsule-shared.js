/* ============================================================
 * 學生頁與導師頁共用：連線後端、示範資料、列印版面
 * ============================================================ */
const CAPSULE_GAS_URL = 'https://script.google.com/macros/s/AKfycbzcST6Zv5hRszrOH7Dn2xE27e1i-LKVxBlwysZdlaBlsZUunsi1YHk-PQ4IGvtPTHtZGw/exec';
const CAPSULE_SITE_URL = 'https://star1123-cheng.github.io/class602-space-capsule/';

// 網址加上 ?demo=1 時使用假資料，不會連線，也不會動到真實留言
const CAPSULE_DEMO = new URLSearchParams(location.search).get('demo') === '1';

/* ---------- 建立畫面元素：內容一律走 textContent，避免留言被當成 HTML 執行 ---------- */
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'onclick') node.addEventListener('click', value);
    else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value);
  });
  [].concat(children === undefined ? [] : children).forEach(child => {
    if (child === null || child === undefined || child === false) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

function seatLabel(seat) {
  return seat === '導師' ? '導師' : `${seat} 號`;
}

// 本班座號（沒有 12 號）
const CLASS_SEATS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '13', '14', '15', '16', '17'];

/* 同學寫的信：收進回憶集，但不放進給家長的 A4 手寫信紙 */
function isClassmateLetter(m) {
  return m.senderType === '同學';
}

function familyLetters(list) {
  return list.filter(m => !isClassmateLetter(m));
}

// 家人的信排前面，同學的信排後面（同類維持原本順序）
function sortLetters(list) {
  return list.slice().sort((a, b) => isClassmateLetter(a) - isClassmateLetter(b));
}

/* ---------- 後端連線 ---------- */
async function capsuleApi(payload) {
  if (CAPSULE_DEMO) return demoApi(payload);

  let res;
  try {
    // 用 text/plain 送出，Apps Script 才不會被瀏覽器的跨網域檢查擋下
    res = await fetch(CAPSULE_GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    throw new Error('連不上網路，請確認平板已連上 Wi-Fi 後再試一次。');
  }

  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error('伺服器回應異常，請稍後再試一次。');
  }

  if (json.status !== 'success') {
    const err = new Error(json.message || '操作失敗，請稍後再試一次。');
    err.code = json.code;
    throw err;
  }
  return json;
}

/* ---------- 示範資料（全部為虛構內容） ---------- */
const DEMO_MESSAGES = [
  {
    id: 'demo-5', seatNumber: '07', parentSign: '13 號同學', senderType: '同學', senderSeat: '13', timestamp: '2026-11-17 09:10', replyText: '', replyTime: '',
    message: '謝謝你上次借我直尺，還陪我把數學題目弄懂。六年級也要一起加油！'
  },
  {
    id: 'demo-6', seatNumber: '03', parentSign: '07 號同學', senderType: '同學', senderSeat: '07', timestamp: '2026-11-17 09:30', replyText: '', replyTime: '',
    message: '還記得我們一起顧班上的植物嗎？謝謝你每次都提醒我澆水。'
  },
  {
    id: 'demo-1', seatNumber: '07', parentSign: '愛你的媽媽', timestamp: '2026-09-12 09:20', replyText: '', replyTime: '',
    message: '這五年，我看見你從不敢舉手，到現在會主動幫同學解題。\n升上六年級，功課一定更多，但媽媽相信你能找到自己的步調。累了就回家，我們永遠是你的補給站。'
  },
  {
    id: 'demo-2', seatNumber: '07', parentSign: '爸爸', timestamp: '2026-09-12 09:41', replyText: '謝謝爸爸，週末我們再去騎腳踏車！', replyTime: '2026-12-31 13:05',
    message: '還記得你第一次騎腳踏車摔倒，自己爬起來又試一次嗎？\n那股不放棄的勁，就是你最厲害的地方。加油！'
  },
  {
    id: 'demo-3', seatNumber: '13', parentSign: '阿嬤', timestamp: '2026-09-12 10:02', replyText: '', replyTime: '',
    message: '乖孫要記得吃早餐，開開心心上學，阿嬤每天都在想你。'
  },
  {
    id: 'demo-4', seatNumber: '導師', parentSign: '07 號家長', timestamp: '2026-09-12 10:15', replyText: '', replyTime: '',
    message: '老師辛苦了，謝謝您這一年的照顧。'
  }
];
const demoState = { messages: DEMO_MESSAGES.map(m => ({ ...m })) };

function demoApi(payload) {
  const tokenSeat = String(payload.token || '').replace(/^demo/, '');
  const mine = () => demoState.messages.filter(m => m.seatNumber === tokenSeat);
  const mySent = () => demoState.messages.filter(m => isClassmateLetter(m) && m.senderSeat === tokenSeat);

  if (['getMyMessages', 'getMySent', 'saveClassmateMessage'].includes(payload.action) && !CLASS_SEATS.includes(tokenSeat)) {
    const err = new Error('這張 QR code 已失效，請向老師索取新的。');
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  if (payload.action === 'getMySent') {
    return {
      status: 'success', seatNumber: tokenSeat, unlockAt: '2026-12-31T12:00:00+08:00',
      sent: mySent().map(m => ({ toSeat: m.seatNumber, message: m.message, updatedAt: m.timestamp }))
    };
  }
  if (payload.action === 'saveClassmateMessage') {
    let row = mySent().find(m => m.seatNumber === payload.toSeat);
    if (!row) {
      row = { id: `demo-${Date.now()}`, seatNumber: payload.toSeat, parentSign: `${tokenSeat} 號同學`, senderType: '同學', senderSeat: tokenSeat, replyText: '', replyTime: '' };
      demoState.messages.push(row);
    }
    row.message = payload.message;
    row.timestamp = '2026-11-17 10:00';
    return { status: 'success', toSeat: payload.toSeat, updatedAt: row.timestamp };
  }
  if (payload.action === 'getMyMessages') {
    if (new URLSearchParams(location.search).get('locked') === '1') {
      return { status: 'success', locked: true, unlockAt: '2026-12-31T12:00:00+08:00', seatNumber: tokenSeat, messageCount: mine().length };
    }
    return { status: 'success', locked: false, seatNumber: tokenSeat, messages: mine().map(m => ({ ...m })) };
  }
  if (payload.action === 'saveReply') {
    const target = mine().find(m => m.id === payload.messageId);
    target.replyText = payload.replyText;
    target.replyTime = '2026-12-31 13:30';
    return { status: 'success', replyText: target.replyText, replyTime: target.replyTime };
  }
  if (payload.action === 'teacherGetAll') {
    return {
      status: 'success',
      unlockAt: '2026-12-31T12:00:00+08:00',
      students: CLASS_SEATS.map(seat => ({ seat, token: `demo${seat}` })),
      messages: demoState.messages.map(m => ({ ...m }))
    };
  }
  if (payload.action === 'teacherResetToken') {
    return { status: 'success', seat: payload.seat, token: `demo${payload.seat}` };
  }
  throw new Error('示範模式不支援這個操作。');
}

/* ---------- 列印插圖（固定內容，沒有使用者輸入） ---------- */
function starPath(x, y, r) {
  const k = r * 0.28;
  return `M${x} ${y - r}Q${x + k * 0.3} ${y - k * 0.3} ${x + r} ${y}Q${x + k * 0.3} ${y + k * 0.3} ${x} ${y + r}Q${x - k * 0.3} ${y + k * 0.3} ${x - r} ${y}Q${x - k * 0.3} ${y - k * 0.3} ${x} ${y - r}Z`;
}

function rocketMarkup(x, y, angle, scale) {
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">
    <path d="M-12 0Q-20 -2 -25 0Q-20 2 -12 0Z" fill="#e8a317"/>
    <path d="M-11 -3.2Q2 -6.6 12 0Q2 6.6 -11 3.2Z" fill="#fff" stroke="#232f66" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M-7 -4.1L-12.5 -8.4L-9.8 -3.4Z M-7 4.1L-12.5 8.4L-9.8 3.4Z" fill="#232f66" stroke="#232f66" stroke-width=".7" stroke-linejoin="round"/>
    <circle cx="2.4" cy="0" r="1.9" fill="#4f86c6" stroke="#232f66" stroke-width=".7"/>
  </g>`;
}

// A4 信紙：一條軌道從右上的地球（家）出發，繞過頁面中央，把上半的來信帶到下半的回信
const LETTER_ART = `<svg class="sheet-art" viewBox="0 0 210 297" aria-hidden="true">
  <path d="M-3 141C42 164 118 166 170 151C192 145 206 110 200 30" fill="none" stroke="#232f66" stroke-width=".55" stroke-dasharray="1.6 2.2" stroke-linecap="round"/>
  <circle cx="191" cy="20" r="9.5" fill="#dce8f6" stroke="#232f66" stroke-width=".55"/>
  <path d="M184.5 15q4-2.5 6.500 0t5-1q1.700 2.500 3.300 2.500-.8 2.500-4 2.500t-4 2.500-5-1.700q-1.700-2.500-1.800-4.800Z M188.500 25.500q2.500-1.700 5-.8t2.500 1.700q-3.300 2.500-7.500-.9Z" fill="#4f86c6"/>
  ${rocketMarkup(120, 158.2, -8, 0.62)}
  <path d="${starPath(14, 10, 2.1)} ${starPath(160, 10, 1.4)} ${starPath(10, 128, 1.5)} ${starPath(196, 171, 1.8)} ${starPath(11, 284, 1.7)} ${starPath(200, 286, 1.3)}" fill="#e8a317"/>
</svg>`;

const COVER_ART = `<svg class="sheet-art" viewBox="0 0 210 297" aria-hidden="true">
  <rect width="210" height="297" fill="#161d45"/>
  <path d="M-10 236C48 262 138 256 184 196C204 170 214 134 214 96" fill="none" stroke="#b4bcdc" stroke-width=".6" stroke-dasharray="1.6 2.4" stroke-linecap="round"/>
  <circle cx="178" cy="46" r="20" fill="#dce8f6"/>
  <path d="M164 36q8-5 13 0t10-2q4 5 7 5-2 5-8 5t-9 5-11-3q-3-5-2-10Z M172 58q5-3 10-2t5 3q-7 5-15-1Z" fill="#4f86c6"/>
  ${rocketMarkup(150, 232, -35, 1.05)}
  <path d="${starPath(28, 34, 2.4)} ${starPath(62, 62, 1.5)} ${starPath(122, 26, 1.9)} ${starPath(190, 124, 1.6)} ${starPath(30, 222, 1.7)} ${starPath(112, 278, 1.5)} ${starPath(192, 270, 2.2)}" fill="#f6c453"/>
</svg>`;

const PAGE_ART = `<svg class="sheet-art" viewBox="0 0 210 297" aria-hidden="true">
  <path d="M-3 268C50 282 130 284 182 271" fill="none" stroke="#232f66" stroke-width=".5" stroke-dasharray="1.6 2.2" stroke-linecap="round"/>
  <circle cx="191" cy="267" r="9.5" fill="#dce8f6" stroke="#232f66" stroke-width=".55"/>
  <path d="M184.500 262q4-2.500 6.500 0t5-1q1.700 2.500 3.300 2.500-.8 2.500-4 2.500t-4 2.500-5-1.700q-1.700-2.500-1.800-4.800Z M188.500 272.500q2.500-1.700 5-.8t2.500 1.700q-3.300 2.500-7.500-.9Z" fill="#4f86c6"/>
  ${rocketMarkup(62, 278.2, 9, 0.5)}
  <path d="${starPath(186, 26, 1.7)} ${starPath(22, 20, 1.5)}" fill="#e8a317"/>
</svg>`;

function art(markup) {
  const box = document.createElement('div');
  box.innerHTML = markup;
  return box.firstElementChild;
}

/* ---------- A4 手寫信紙 ---------- */
const LETTER_FONT_SIZES = [15, 14, 13, 12, 11, 10.5];

function buildLetterSheet(seat, messages, pageNote) {
  const entries = messages.map(m => el('div', { class: 'letter-entry' }, [
    el('p', { class: 'letter-text' }, m.message),
    el('p', { class: 'letter-sign' }, m.parentSign)
  ]));
  const body = el('div', { class: 'letter-body' }, entries);

  return el('section', { class: 'sheet letter-sheet' }, [
    art(LETTER_ART),
    el('div', { class: 'letter-top' }, [
      el('div', { class: 'letter-head' }, [
        el('span', { class: 'script' }, 'Letters from Home'),
        el('span', { class: 'to' }, `給 ${seatLabel(seat)}${pageNote || ''}`)
      ]),
      body
    ]),
    el('div', { class: 'letter-bottom' }, [
      el('div', { class: 'reply-head' }, [
        el('span', { class: 'script' }, 'My Reply'),
        el('span', { class: 'to' }, '讀完之後，寫下我想說的話')
      ]),
      el('div', { class: 'reply-lines' }),
      el('div', { class: 'reply-foot' }, [
        el('span', {}, '署名：'),
        el('span', {}, '日期：')
      ])
    ])
  ]);
}

// 從大字開始試，放得下就停；回傳是否放得下
function fitLetterText(sheet) {
  const body = sheet.querySelector('.letter-body');
  for (const size of LETTER_FONT_SIZES) {
    body.style.fontSize = `${size}pt`;
    if (body.scrollHeight <= body.clientHeight + 1) return true;
  }
  return false;
}

// 留言太多時，一張放不下的部分接到下一張
function renderLetterSheets(root, seat, messages) {
  const groups = [];
  let rest = messages.slice();
  while (rest.length) {
    let take = rest.length;
    while (take > 1) {
      const probe = buildLetterSheet(seat, rest.slice(0, take));
      root.appendChild(probe);
      const fits = fitLetterText(probe);
      probe.remove();
      if (fits) break;
      take--;
    }
    groups.push(rest.slice(0, take));
    rest = rest.slice(take);
  }

  groups.forEach((group, index) => {
    const note = groups.length > 1 ? `（第 ${index + 1} 張，共 ${groups.length} 張）` : '';
    const sheet = buildLetterSheet(seat, group, note);
    root.appendChild(sheet);
    fitLetterText(sheet);
  });
}

/* ---------- 回憶集：封面＋每則留言一頁（附學生回信）；家人的信在前、同學的信在後 ---------- */
function renderMemoryBook(root, seat, list) {
  const messages = sortLetters(list);
  root.appendChild(el('section', { class: 'sheet book-cover' }, [
    art(COVER_ART),
    el('div', { class: 'book-cover-text' }, [
      el('span', { class: 'script' }, 'Our Space Capsule'),
      el('h2', {}, '航向六年級的時空補給站')
    ]),
    el('div', { class: 'book-cover-who' }, [
      el('div', {}, '115 學年度 六年孝班'),
      el('div', {}, seat === '導師' ? '導師的回憶集' : `${seatLabel(seat)}的回憶集`)
    ])
  ]));

  messages.forEach((m, index) => {
    const page = el('section', { class: 'sheet book-page' }, [
      art(PAGE_ART),
      el('div', { class: 'book-page-inner' }, el('div', { class: 'book-content' }, [
        el('div', { class: 'script book-title' }, isClassmateLetter(m) ? 'A Letter from a Classmate' : 'A Letter from Home'),
        el('p', { class: 'book-letter' }, m.message),
        el('p', { class: 'book-sign' }, m.timestamp ? `${m.parentSign}，${m.timestamp.slice(0, 10)}` : m.parentSign),
        m.replyText ? el('div', { class: 'book-reply' }, [
          el('span', { class: 'script' }, 'My Reply'),
          el('p', {}, m.replyText),
          m.replyTime ? el('small', {}, m.replyTime.slice(0, 10)) : null
        ]) : null
      ])),
      el('div', { class: 'book-folio' }, `第 ${index + 1} 封，共 ${messages.length} 封`)
    ]);
    root.appendChild(page);
    fitBookPage(page);
  });
}

// 短信用大字，長信自動縮小，確保一封信完整留在同一頁
const BOOK_FONT_SIZES = [20, 18, 16, 15, 14, 13, 12, 11];

function fitBookPage(page) {
  const inner = page.querySelector('.book-page-inner');
  for (const size of BOOK_FONT_SIZES) {
    inner.style.fontSize = `${size}pt`;
    if (inner.scrollHeight <= inner.clientHeight + 1) return;
  }
}

/* ---------- 列印流程：先確定手寫字體載入，再排版、再開列印視窗 ---------- */
function getPrintRoot() {
  let root = document.getElementById('printRoot');
  if (!root) {
    root = el('div', { id: 'printRoot' });
    document.body.appendChild(root);
  }
  return root;
}

async function printWith(render, sampleText, title) {
  const root = getPrintRoot();
  root.replaceChildren();

  try {
    await Promise.all([
      document.fonts.load('15pt Iansui', sampleText || '航向六年級的時空補給站'),
      document.fonts.load('30pt Yellowtail', 'Letters from Home My Reply Our Space Capsule')
    ]);
  } catch (e) {
    console.warn('字體載入失敗，改用系統字體：', e);
  }

  render(root);
  await document.fonts.ready;

  const pageTitle = document.title;
  if (title) document.title = title; // 另存 PDF 時，這會成為預設檔名
  window.addEventListener('afterprint', () => { document.title = pageTitle; }, { once: true });
  window.print();
}
