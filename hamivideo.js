'use strict';

const JSON_URL = 'hamivideo_all_tagged.json';

const KNOWN_COUNTRIES = [
  '台灣','韓國','美國','日本','英國','法國','中國','香港','泰國',
  '義大利','西班牙','德國','印度','澳洲','丹麥','瑞典','挪威',
  '土耳其','以色列','比利時','加拿大','荷蘭','巴西','墨西哥',
  '阿根廷','波蘭','俄羅斯','捷克','伊朗',
];

// ── State ──────────────────────────────────────────────────────────────────
let HAMI_DATA = [];
let filtered  = [];
let activeCountry = 'all';
let activeMood    = 'all';
let sortMode      = 'views';
let searchQuery   = '';

// ── Helpers ────────────────────────────────────────────────────────────────
function getCountry(item) {
  for (const g of item.genres || []) {
    if (KNOWN_COUNTRIES.includes(g)) return g;
  }
  return null;
}

function getGenres(item) {
  return (item.genres || []).filter(g => !KNOWN_COUNTRIES.includes(g));
}

// ── Filters ────────────────────────────────────────────────────────────────
function buildFilters() {
  const countryCounts = {};
  const moodCounts    = {};

  HAMI_DATA.forEach(item => {
    const c = getCountry(item);
    if (c) countryCounts[c] = (countryCounts[c] || 0) + 1;
    (item.moods || []).forEach(m => moodCounts[m] = (moodCounts[m] || 0) + 1);
  });

  const countries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
  const moods     = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 30);

  renderFilterBtns('countryFilters', 'country', countries);
  renderFilterBtns('moodFilters',    'mood',    moods);
}

function renderFilterBtns(containerId, type, entries) {
  const el = document.getElementById(containerId);
  el.innerHTML =
    `<button class="filter-btn active" data-type="${type}" data-val="all">全部</button>` +
    entries.map(([val, n]) =>
      `<button class="filter-btn" data-type="${type}" data-val="${val}">${val} <span style="color:#666;font-size:11px">${n}</span></button>`
    ).join('');

  el.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    setFilter(btn.dataset.type, btn.dataset.val);
  });
}

function setFilter(type, val) {
  if (type === 'country') activeCountry = val;
  if (type === 'mood')    activeMood    = val;

  document.querySelectorAll(`[data-type="${type}"]`).forEach(btn =>
    btn.classList.toggle('active', btn.dataset.val === val)
  );
  applyFilters();
}

// ── Filter & Sort & Render ─────────────────────────────────────────────────
function applyFilters() {
  const q = searchQuery.toLowerCase().trim();

  filtered = HAMI_DATA.filter(item => {
    if (activeCountry !== 'all' && getCountry(item) !== activeCountry) return false;
    if (activeMood    !== 'all' && !(item.moods || []).includes(activeMood)) return false;
    if (q) {
      const hay = (item.title + ' ' + (item.description || '') + ' ' +
                   (item.genres || []).join(' ') + ' ' + (item.moods || []).join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (sortMode === 'views') {
    filtered.sort((a, b) => parseInt(b.view_count || 0) - parseInt(a.view_count || 0));
  } else {
    filtered.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'));
  }

  renderGrid();
}

function renderGrid() {
  const grid       = document.getElementById('cardGrid');
  const noResults  = document.getElementById('noResults');
  const showCount  = document.getElementById('showCount');
  const sectionCount = document.getElementById('sectionCount');

  showCount.textContent    = filtered.length;
  sectionCount.textContent = `(${filtered.length} 部)`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.style.display = '';
    return;
  }
  noResults.style.display = 'none';

  grid.innerHTML = filtered.map((item, idx) => {
    const country     = getCountry(item);
    const moods       = (item.moods || []).slice(0, 3);
    const views       = parseInt(item.view_count || 0).toLocaleString();
    const rank        = sortMode === 'views' ? idx + 1 : null;
    const dataIdx     = HAMI_DATA.indexOf(item);

    return `<div class="card" data-idx="${dataIdx}">
      ${item.poster
        ? `<img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="card-poster-placeholder" style="${item.poster ? 'display:none' : ''}">&#127916;</div>
      ${rank && rank <= 10 ? `<div class="card-rank">TOP ${rank}</div>` : ''}
      <div class="card-overlay">
        <div class="card-overlay-title">${item.title}</div>
        <div class="card-overlay-desc">${item.description || ''}</div>
        <div class="card-overlay-tags">
          ${moods.map(m => `<span class="card-overlay-tag">${m}</span>`).join('')}
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${item.title}</div>
        <div class="card-meta">
          ${country ? `<span>${country}</span><span>·</span>` : ''}
          <span class="card-views">&#128065; ${views}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  grid.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) openModal(parseInt(card.dataset.idx));
  }, { once: true });
}

// ── Hero ───────────────────────────────────────────────────────────────────
function renderHero() {
  const top = HAMI_DATA[0];
  if (!top) return;
  const country = getCountry(top);
  const tags    = [...getGenres(top).slice(0, 3), ...(top.moods || []).slice(0, 3)];
  const views   = parseInt(top.view_count || 0).toLocaleString();

  if (top.poster) {
    document.getElementById('heroSection').style.background =
      `linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, transparent 100%), url(${top.poster}) right center / cover no-repeat`;
  }

  document.getElementById('heroContent').innerHTML = `
    <div class="hero-badge">&#128293; 觀看榜首</div>
    <div class="hero-title">${top.title}</div>
    <div class="hero-views">&#128065; ${views} 次觀看${country ? ' &nbsp;·&nbsp; ' + country : ''}</div>
    <div class="hero-desc">${top.description || ''}</div>
    <div class="hero-tags">${tags.map(t => `<span class="hero-tag">${t}</span>`).join('')}</div>
  `;
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal(idx) {
  const item    = HAMI_DATA[idx];
  if (!item) return;
  const views   = parseInt(item.view_count || 0).toLocaleString();
  const country = getCountry(item);
  const genres  = getGenres(item);

  document.getElementById('modalHeader').innerHTML = `
    <button class="modal-close" id="modalCloseBtn">&#10005;</button>
    ${item.poster
      ? `<img class="modal-header-img" src="${item.poster}" alt="${item.title}" onerror="this.style.display='none'">`
      : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e1e2e,#2a1a2e);display:flex;align-items:center;justify-content:center;font-size:64px">&#127916;</div>`}
    <div class="modal-header-gradient"></div>
    <div class="modal-header-title">${item.title}</div>
  `;

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-views">&#128065; ${views} 次觀看${country ? ' &nbsp;·&nbsp; ' + country : ''}</div>
    <div class="modal-desc">${item.description || '無介紹'}</div>
    ${genres.length ? `
    <div class="modal-section">
      <div class="modal-section-title">&#127916; 類型 / 分類</div>
      <div class="modal-tags">${genres.map(g => `<span class="modal-tag-genre">${g}</span>`).join('')}</div>
    </div>` : ''}
    ${(item.moods || []).length ? `
    <div class="modal-section">
      <div class="modal-section-title">&#10024; 情緒標籤</div>
      <div class="modal-tags">${(item.moods || []).map(m => `<span class="modal-tag-mood">${m}</span>`).join('')}</div>
    </div>` : ''}
    <div class="modal-videoid">影片 ID：${item.videoid || ''}</div>
  `;

  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Event Listeners ────────────────────────────────────────────────────────
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  document.getElementById('sectionLabel').textContent =
    searchQuery ? `搜尋「${searchQuery}」` : '全部影片';
  applyFilters();
});

document.getElementById('sortSelect').addEventListener('change', e => {
  sortMode = e.target.value;
  applyFilters();
});

// ── Bootstrap: fetch JSON ──────────────────────────────────────────────────
fetch(JSON_URL)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    HAMI_DATA = data.sort((a, b) => parseInt(b.view_count || 0) - parseInt(a.view_count || 0));
    document.getElementById('totalCount').textContent = HAMI_DATA.length;
    buildFilters();
    renderHero();
    applyFilters();
  })
  .catch(err => {
    document.getElementById('heroContent').innerHTML =
      `<div class="loading" style="color:#e50914">載入失敗：${err.message}<br><small>請確認 ${JSON_URL} 存在且透過 HTTP server 開啟此頁面</small></div>`;
    console.error('載入 JSON 失敗', err);
  });
