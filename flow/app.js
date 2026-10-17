'use strict';

// ── 流程資料 ──────────────────────────────────────────────
// k: term = 起點／終點, check = 判斷, action = 動作
// no: 「否」分支說明（noLabel 預設為「否」）, d: 面板說明, note: 面板補充
const FLOWS = [
  { label: '① 排列進路', kicker: 'ROUTE SETTING', title: '排列進路與號誌開放', desc: '按下進路按鈕後，連鎖裝置依連鎖表逐項檢查四個前提；任何一項不成立，號誌機維持停止現示。點選節點查看說明。', noteLabel: '相關鎖閉', steps: [
    { k: 'term', t: '排列進路', sub: '按下起點、終點進路按鈕', d: '行車人員以進路式操作送出排列指令。連鎖裝置收到指令後，依連鎖表逐項檢查號誌開放的四個前提。' },
    { k: 'check', n: '1', t: '轉轍器位置正確且鎖閉？', sub: '含過走餘裕內的轉轍器', no: '轉換轉轍器至規定方向；密貼檢知不成立則拒絕，號誌維持停止。', d: '進路與過走餘裕內的轉轍器已轉換到規定方向，密貼檢知成立，並由連鎖鎖閉，不能再被轉換。', note: '轉轍器鎖閉：防止列車壓在轉轍器上時被轉換，造成出軌。' },
    { k: 'check', n: '2', t: '軌道區段無列車？', sub: '軌道電路／計軸區段', no: '拒絕排列，號誌維持停止。', d: '進路上的軌道電路或計軸區段全部無佔用，包含號誌機外方必要的過走餘裕區段。' },
    { k: 'check', n: '3', t: '沒有敵對進路？', sub: '對向、交叉、共用轉轍器', no: '拒絕排列：敵對進路已建立。', d: '任何會與本進路互相衝突的進路（對向進入同一股道、交叉、共用轉轍器方向相反）都未建立，其號誌在停止。' },
    { k: 'check', n: '4', t: '側面防護成立？', sub: '防護轉轍器或相關號誌', no: '拒絕排列：側方路徑未阻擋。', d: '可能從側方駛入本進路的路徑，已由防護轉轍器轉向安全方向，或由相關號誌保持停止來阻擋。' },
    { k: 'action', t: '進路鎖閉', sub: '轉轍器與敵對號誌被固定', d: '四項同時成立後建立進路鎖閉，把進路上的轉轍器與敵對號誌固定住，直到列車安全通過或進路被合法取消。', note: '過走餘裕鎖閉隨進路一起建立。' },
    { k: 'action', t: '號誌開放', sub: '進行／減速／注意／警戒', d: '號誌依前方號誌狀態顯示進行、減速、注意或警戒。' },
    { k: 'check', n: '5', t: '開放條件持續成立？', sub: '連續監視', no: '號誌立即恢復停止現示（例如區段突然被佔用）。', d: '號誌開放之後，連鎖持續監視上述條件；任何條件失去，號誌立即恢復停止。' },
    { k: 'term', t: '等待列車進入', sub: '接續「② 鎖閉與解鎖」', d: '號誌保持開放，直到列車進入進路或行車人員取消進路。後續流程見「② 鎖閉與解鎖」。' }
  ] },
  { label: '② 鎖閉與解鎖', kicker: 'LOCKING & RELEASE', title: '進路鎖閉與解鎖', desc: '號誌開放後，進路依列車位置與操作建立不同層次的鎖閉，並在列車通過或進路被合法取消時解除。', noteLabel: '鎖閉種類', steps: [
    { k: 'term', t: '號誌已開放', sub: '進路鎖閉中', d: '進路上的轉轍器與敵對號誌已被固定，號誌顯示進行類現示。' },
    { k: 'check', n: '1', t: '接近區段有列車？', sub: '判斷鎖閉層次', noLabel: '否', no: '保留鎖閉：取消進路即可立即解除。', d: '號誌開放而接近區段無車時，建立保留鎖閉，防止號誌開放到列車接近之間進路被其他操作改變。', note: '保留鎖閉：號誌開放而接近區段無車時建立。' },
    { k: 'action', t: '接近鎖閉', sub: '司機可能已看到進行號誌', d: '號誌開放且接近區段有車時建立接近鎖閉，防止司機已看到進行號誌、來不及停車時進路被取消。', note: '接近鎖閉：取消進路後須經延時（時素）才解除，或列車已進入進路。' },
    { k: 'check', n: '2', t: '列車進入進路？', sub: '或行車人員取消進路', no: '取消進路：號誌恢復停止，經時素延時後解除接近鎖閉。', d: '若列車未進入而進路被取消，號誌先恢復停止，接近鎖閉須經延時才解除，確保列車已能停妥。' },
    { k: 'action', t: '號誌恢復停止', sub: '列車進入後自動', d: '列車進入進路後，號誌恢復停止現示，防止後續列車依同一進路進入。' },
    { k: 'action', t: '分段解鎖', sub: '列車依序通過各區段', d: '列車依序通過各區段後逐段解除進路鎖閉，讓後續進路可以提早排列。', note: '進路鎖閉：防止列車行駛途中前方轉轍器被轉換。' },
    { k: 'check', n: '3', t: '列車在目的股道停妥？', sub: '並經延時', no: '過走餘裕鎖閉保持，防止列車越過出發號誌駛入衝突路線。', d: '列車在目的股道停妥並經延時後，過走餘裕鎖閉才解除。', note: '過走餘裕鎖閉：停妥並經延時，或進路取消時解除。' },
    { k: 'term', t: '進路全部解除', sub: '轉轍器可再轉換', d: '所有鎖閉解除，轉轍器與相關號誌可供下一個進路使用。' }
  ] },
  { label: '③ 自主檢查與 ★ 停留點', kicker: 'INSPECTION & HOLD POINT', title: '自主檢查三階段與 ★ 檢驗停留點', desc: '品質管控拆進每一道工序：施工前確認文件與位置，施工中逐項量測，到達 ★ 停留點時停工，由監造檢驗合格後才能往下做。', noteLabel: '檢查要點', steps: [
    { k: 'term', t: '施工前', sub: 'PHASE 1', d: '確認文件與現場位置後才開工。', note: '文件審查（施工圖說已核定、材料設備完成進場查驗）、現場放樣、吊裝準備；拆收工程須先建立拆收清冊並做現場標記。' },
    { k: 'action', t: '施工中：逐項施作與量測', sub: 'PHASE 2', d: '依施工計畫施作，並逐項檢查、量測、記錄實測值。', note: '安裝定位、鎖固（扭力實測值）、結線、量測（絕緣、導通、光損、接地、電壓）、功能測試。' },
    { k: 'check', n: '1', t: '到達 ★ 停留點？', sub: '回填前、封箱前、通電前', noLabel: '否', no: '繼續施工至下一道工序。', d: '標記★的項目是檢驗停留點，常設在「做完之後就看不到」的地方。到達即暫停施工。' },
    { k: 'check', n: '2', t: '自主檢查合格？', sub: '現場工程師逐項檢查', no: '改善後重新自主檢查。', d: '現場工程師依檢查表逐項檢查、量測並記錄實測值。', note: '結果以 ○ 合格、╳ 不合格、／ 無需查驗 註記；填實測值，不只打勾。' },
    { k: 'action', t: '書面通知監造', sub: '施工檢驗申請單', d: '自主檢查合格後，填寫施工檢驗申請單通知監造單位派員檢驗。' },
    { k: 'check', n: '3', t: '監造檢驗合格？', sub: '到場抽驗或全驗', no: '不合格 ↺ 改善後重新自主檢查，再次通知監造；嚴重缺失開立不合格追蹤管制表。', d: '監造人員到場抽驗或全驗，並於紀錄上簽認。' },
    { k: 'action', t: '合格放行', sub: '取得檢驗合格紀錄', d: '取得檢驗合格紀錄後，才可進行下一道工序。' },
    { k: 'term', t: '施工後', sub: 'PHASE 3', d: '完成清理、標示與安衛查驗。', note: '現場清理、設備編號與標示牌、號誌用鎖上鎖、安衛查驗；不合格項目開立追蹤管制，限期改善後複查。' }
  ] },
  { label: '④ 網站架構', kicker: 'SITE MAP', title: '網站頁面架構', desc: '鐵路號誌連鎖工程技術參考網站共四頁，首頁說明連鎖原理，三個子頁分別整理設備、施工檢查與名詞。點選卡片前往該頁。', map: true }
];

const HOME_SECTIONS = ['站場模擬 · 單線交會站', '號誌開放的四個前提', '鎖閉的層次', '連鎖的三個世代', '網站內容'];

const PAGES = [
  { t: '現場設備', file: 'EQUIPMENT', href: 'https://smor-ten.vercel.app/equipment.html', d: '構造、與連鎖的關係、施工注意事項。', secs: ['號誌機', '電動轉轍器', '計軸器', '平交道防護設備'] },
  { t: '施工與檢查', file: 'INSPECTION', href: 'https://smor-ten.vercel.app/inspection.html', d: '自主檢查流程、檢驗停留點與各分項工程檢查要點。', secs: ['自主檢查三階段', '★ 檢驗停留點流程', '檢查表符號', '分項工程檢查要點（可篩選）', '填表通則'] },
  { t: '名詞解釋', file: 'GLOSSARY', href: 'https://smor-ten.vercel.app/glossary.html', d: '附英文對照，可即時搜尋。', secs: ['號誌', '連鎖', '列車偵測', '轉轍器', '平交道', '品管術語'] }
];

// 今日特殊塗裝輪替來源：Wikimedia Commons 檔名與標題，每天依日期取 3 張
const LIVERY_POOL = [
  ['Keikyu 2100 BLUE SKY TRAIN TRA local 20160306.jpg', '京急 BLUE SKY TRAIN 友好塗裝'],
  ['Taiwan EMU3000 Tze-Chiang, Xike (20240113) (53561510908).jpg', 'EMU3000 新自強號'],
  ['TRA LDK 58 and LDR2201 in Twilight 20161112.jpg', '暮色中的 LDK 58 與 LDR2201'],
  ['Keikyu 2139 BLUE SKY TRAIN TRA local 20160306.jpg', '京急 2139 BLUE SKY TRAIN'],
  ['20210409 E1000自強號於新竹車站.jpg', 'E1000 推拉式自強號・新竹'],
  ['TRA E1000 across Shanjia Station 20121111a.jpg', 'E1000 通過山佳站'],
  ['TRA E1000 across Shiliu Station 20130929.jpg', 'E1000 通過石榴站'],
  ['20190708TRA R152 at Chaozhou Station.jpg', 'R152 柴電機車・潮州站'],
  ['2011-07-29 TRA R49 leading a freight train at Tanzi Station.jpg', 'R49 牽引貨物列車・潭子站'],
  ['TRA ED104 EMC307 at the National Railway Museum Taiwan 20250914.jpg', 'EMU100 第一代自強號・國家鐵道博物館'],
  ['TRA E1000 Hsinchu.jpg', 'E1000 自強號・新竹']
];

// ── 小工具 ────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const pad2 = n => String(n).padStart(2, '0');

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

// ── 今日特殊塗裝 ──────────────────────────────────────────
function renderLivery() {
  const d = new Date();
  const day = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  $('today').textContent = pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());

  const grid = $('livery-grid');
  for (let k = 0; k < 3; k++) {
    const [file, t] = LIVERY_POOL[(day * 3 + k) % LIVERY_POOL.length];
    const fig = el('figure', 'livery__card');
    const link = el('a', 'livery__frame');
    link.href = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file.replace(/ /g, '_'));
    link.target = '_blank';
    link.rel = 'noopener';
    const img = el('img');
    img.src = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file) + '?width=900';
    img.alt = t;
    img.loading = 'lazy';
    img.onerror = () => { img.hidden = true; };
    link.append(img, el('span', 'livery__credit', 'Wikimedia Commons'));
    fig.append(link, el('figcaption', null, t));
    grid.append(fig);
  }
}

// ── 流程圖 ────────────────────────────────────────────────
const state = { f: 0, sel: 0 };
let nodes = [];

function renderTabs() {
  const nav = $('tabs');
  FLOWS.forEach((fl, i) => {
    const b = el('button', 'tab', fl.label);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => pickFlow(i));
    nav.append(b);
  });
}

function buildNode(s, i) {
  const btn = el('button', 'node node--' + s.k);
  btn.type = 'button';
  btn.addEventListener('click', () => select(i));
  const box = el('div');
  const text = el('div', 'node__text');
  text.append(el('div', 'node__t', s.t), el('div', 'node__sub', s.sub));
  if (s.k === 'check') box.append(el('span', 'node__n', s.n));
  box.append(text);
  btn.append(box);
  return btn;
}

function renderSteps(steps) {
  const wrap = $('steps');
  wrap.replaceChildren();
  nodes = steps.map((s, i) => {
    const row = el('div', 'row');
    const node = buildNode(s, i);
    row.append(node);
    if (s.no) {
      const arrow = el('div', 'no-arrow');
      arrow.append(el('div', 'no-arrow__line'), el('span', 'no-arrow__head'), el('span', 'no-arrow__label', s.noLabel || '否'));
      row.append(arrow, el('div', 'no-box', s.no));
    }
    wrap.append(row);

    if (i < steps.length - 1) {
      const link = el('div', 'row row--link');
      const down = el('div', 'down');
      down.append(el('div', 'down__line'), el('span', 'down__head'));
      if (s.k === 'check') down.append(el('span', 'down__yes', '是'));
      link.append(down);
      link.setAttribute('aria-hidden', 'true');
      wrap.append(link);
    }
    return node;
  });
}

function renderPanel() {
  const fl = FLOWS[state.f], c = fl.steps[state.sel];
  $('cur-idx').textContent = 'STEP ' + pad2(state.sel + 1) + ' / ' + pad2(fl.steps.length);
  $('cur-title').textContent = c.t;
  $('cur-desc').textContent = c.d;
  const note = $('cur-note');
  note.hidden = !c.note;
  note.replaceChildren();
  if (c.note) note.append(el('strong', null, fl.noteLabel + '：'), c.note);
  nodes.forEach((n, i) => {
    if (i === state.sel) n.setAttribute('aria-current', 'step');
    else n.removeAttribute('aria-current');
  });
}

function select(i) {
  const n = FLOWS[state.f].steps.length;
  state.sel = Math.max(0, Math.min(n - 1, i));
  renderPanel();
}

function renderMap() {
  $('map-home').replaceChildren(...HOME_SECTIONS.map(h => el('span', 'map__chip', h)));
  $('map-pages').replaceChildren(...PAGES.map(p => {
    const col = el('div', 'map__col');
    const card = el('a', 'map__card');
    card.href = p.href;
    card.target = '_blank';
    card.rel = 'noopener';
    const head = el('div', 'map__card-head');
    head.append(el('span', 'map__card-t', p.t), el('span', 'map__card-file', p.file));
    const secs = el('div', 'map__secs');
    secs.append(...p.secs.map(x => el('div', 'map__sec', x)));
    card.append(head, el('p', 'map__card-d', p.d), secs);
    col.append(el('div', 'map__vline'), card);
    return col;
  }));
}

function pickFlow(i) {
  state.f = i;
  state.sel = 0;
  const fl = FLOWS[i];
  $('flow-kicker').textContent = fl.kicker;
  $('flow-title').textContent = fl.title;
  $('flow-desc').textContent = fl.desc;
  [...$('tabs').children].forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
  $('flow-view').hidden = !!fl.map;
  $('map-view').hidden = !fl.map;
  if (!fl.map) {
    renderSteps(fl.steps);
    renderPanel();
  }
}

renderLivery();
renderTabs();
renderMap();
pickFlow(0);
$('prev').addEventListener('click', () => select(state.sel - 1));
$('next').addEventListener('click', () => select(state.sel + 1));
