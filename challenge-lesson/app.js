/* ============================================================
 * 學生頁與投影頁共用：呼叫後端、建立畫面元素、文字雲排版
 * ============================================================ */

const STAGE_INFO = {
  waiting: { short: '準備', title: '準備開始' },
  challenge: { short: '活動一', title: '我遇到的挑戰' },
  idea: { short: '活動二', title: '我想到的方法' },
  vote: { short: '投票', title: '幫好方法投票' },
  message: { short: '活動三', title: '留言與回饋' },
  closed: { short: '結束', title: '今天辛苦了' }
};

/**
 * Apps Script 部署網址（資料存在老師的試算表）。
 * 這不是密碼：學生本來就要連到這裡，真正的保護是課堂代碼與導師密碼。
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxOd_wCTdG7jv3XUaC4O66Mqu3q9t70-UEJbdfsY0svhwHIE_7xdsVYqhNiStnbCfAl5g/exec';
const API_TIMEOUT_MS = 20000;

/**
 * 呼叫後端：用 fetch 送到 Apps Script；本機預覽時走示範資料。
 * 用 text/plain 送出，瀏覽器才不會先發跨網域檢查（Apps Script 不回應那種檢查）。
 */
function callApi(payload) {
  if (window.DEMO_API) return window.DEMO_API(payload);
  const controller = new AbortController();
  const timer = setTimeout(function() { controller.abort(); }, API_TIMEOUT_MS);
  return fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    signal: controller.signal
  })
    .then(function(response) {
      if (!response.ok) throw new Error('bad-response');
      return response.json();
    })
    .catch(function() {
      throw new Error('連不上網路，請確認平板已連上 Wi-Fi 後再試一次。');
    })
    .then(function(res) {
      if (res && res.status === 'success') return res;
      const err = new Error((res && res.message) || '操作失敗，請再試一次。');
      err.code = res && res.code;
      throw err;
    })
    .finally(function() { clearTimeout(timer); });
}

/**
 * 建立畫面元素：文字一律用 textContent 放入，學生打的字不會被當成網頁程式執行
 */
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(function(entry) {
    const key = entry[0];
    const value = entry[1];
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.indexOf('on') === 0 && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value === true ? '' : value);
  });
  [].concat(children === undefined ? [] : children).forEach(function(child) {
    if (child === null || child === undefined || child === false) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

let toastTimer = null;
function toast(message, isError) {
  let box = document.querySelector('.toast');
  if (!box) {
    box = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.classList.toggle('error', Boolean(isError));
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { box.classList.remove('show'); }, isError ? 4200 : 2400);
}

/** 輸入框下方的字數提示 */
function bindCounter(input, counter, max) {
  const update = function() {
    const len = [...input.value].length;
    counter.textContent = len + ' / ' + max;
    counter.classList.toggle('over', len > max);
  };
  input.addEventListener('input', update);
  update();
}

function safeStorage(kind) {
  try {
    const store = window[kind];
    const probe = '__probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch (e) {
    return null;
  }
}

/* ---------- 文字雲 ---------- */
const CLOUD_COLORS = ['#d9480f', '#0b7285', '#5f3dc4', '#2b8a3e', '#c2255c', '#b35c00', '#1864ab', '#1d2433'];

/**
 * 把 [{label, count}] 排成文字雲：最多人寫的放中間、字最大，其餘沿螺旋往外找空位
 */
function drawCloud(box, items, opts) {
  opts = opts || {};
  const minSize = opts.minSize || 20;
  const maxSize = opts.maxSize || 72;
  const showCount = opts.showCount !== false;
  box.textContent = '';

  if (!items.length) {
    box.appendChild(el('div', { class: 'cloud-empty', text: opts.emptyText || '等大家送出第一個挑戰……' }));
    return;
  }

  const width = box.clientWidth;
  const height = box.clientHeight;
  const cx = width / 2;
  const cy = height / 2;
  const maxCount = items[0].count;
  const placed = [];
  const gap = 8;

  const collides = function(r) {
    if (r.x < 4 || r.y < 4 || r.x + r.w > width - 4 || r.y + r.h > height - 4) return true;
    return placed.some(function(p) {
      return r.x < p.x + p.w + gap && r.x + r.w + gap > p.x && r.y < p.y + p.h + gap && r.y + r.h + gap > p.y;
    });
  };

  items.forEach(function(item, index) {
    const word = el('span', { class: 'cloud-word', title: item.label + '：' + item.count + ' 人' }, [item.label]);
    if (showCount && item.count > 1) word.appendChild(el('sup', { text: String(item.count) }));
    word.style.color = CLOUD_COLORS[index % CLOUD_COLORS.length];
    word.style.animationDelay = Math.min(index * 40, 600) + 'ms';
    word.style.visibility = 'hidden';
    box.appendChild(word);

    let size = minSize + (maxSize - minSize) * Math.sqrt(item.count / maxCount);
    for (let attempt = 0; attempt < 4; attempt++) {
      word.style.fontSize = size + 'px';
      const w = word.offsetWidth;
      const h = word.offsetHeight;
      const spot = findSpot(w, h);
      if (spot) {
        word.style.left = spot.x + 'px';
        word.style.top = spot.y + 'px';
        word.style.visibility = '';
        placed.push(spot);
        return;
      }
      size = Math.max(14, size * 0.8);
    }
    word.remove();
  });

  function findSpot(w, h) {
    const ratio = width / Math.max(height, 1);
    for (let t = 0; t < 120; t += 0.08) {
      const r = { x: cx + 6 * t * Math.cos(t) * ratio * 0.8 - w / 2, y: cy + 6 * t * Math.sin(t) - h / 2, w: w, h: h };
      if (!collides(r)) return r;
    }
    return null;
  }
}

/** 資料沒變就不重畫，文字雲才不會一直跳動 */
function sameData(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
