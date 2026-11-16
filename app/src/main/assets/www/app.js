// app.js — 這個程式自己的功能（AI 主要改這個檔）。kit.js 是架子，通常不用動。
// 怎麼加東西看 AI_開發指南.md 第 4 節。下面的「示範」可以留著當範例，或換成真的功能。
'use strict';
(function () {
const { $, esc, fmtTime } = kit;

window.APP = {
  /** 開 App 時叫一次（在讀完設定之後、畫頁面之前）。可以 await */
  async init() {},
};

// ---------- 設定（預設值＋設定頁的一行）
kit.DEFAULTS.demo_secs = 8;
kit.setting({ sec: '示範', k: 'demo_secs', label: '示範工作每個跑幾秒', type: 'num', min: 2, max: 120, unit: '秒', remote: true });

// ---------- 資料庫的表
kit.SCHEMA.push('CREATE TABLE IF NOT EXISTS demo_done (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, secs REAL, t INTEGER)');

// ---------- 背景工作：示範（每個分 20 步，每步存一次進度；熱更新、閃退後會從存的那一步接著做）
kit.kind('demo', {
  icon: '🧩', name: '示範工作', cap: 2,
  async run(data, ctx) {
    const steps = 20, t0 = Date.now();
    for (let i = data.step || 0; i < steps; i++) {
      await ctx.hold();                                              // 暫停、讓路時在這裡等
      await ctx.sleep((+kit.cfg.get('demo_secs') || 8) * 1000 / steps);
      data.step = i + 1;
      ctx.progress(data.step / steps * 100, `第 ${data.step}/${steps} 步`);
      ctx.save(data);                                                // 存進度
    }
    await kit.db.run('INSERT INTO demo_done (title, secs, t) VALUES (?, ?, ?)', [ctx.job.title, (Date.now() - t0) / 1000, Date.now()]);
  },
});
function addDemo(n) {
  const base = Date.now() % 1000;
  for (let i = 1; i <= n; i++) kit.jobs.add('demo', `示範 #${base}-${i}`, { step: 0 });
  kit.toast(`排了 ${n} 個示範工作，到 🖥 後台看`);
}

// ---------- 首頁
kit.page({
  id: 'home', title: '首頁', icon: '🏠',
  render(el) {
    el.innerHTML = `<div class="card hero"><b>${esc(kit.brand.title)}</b><p class="mut">這是 AndroidKit 空架子。新程式的畫面放在這一頁（app.js）。</p>
      <div class="row"><button class="btn pri" data-act="demo_add">＋ 排 5 個示範背景工作</button><button class="btn" data-go="bg">🖥 去後台看</button></div></div>
      <div class="card"><b>現在</b><div id="hmNow" class="small"></div></div>
      <div class="card"><b>最近完成（資料庫）</b><div id="hmDone"></div></div>`;
    this.loadDone(el);
  },
  refresh(el) {
    const r = kit.jobs.running('demo').length, q = kit.jobs.queued('demo').length;
    $('#hmNow', el).textContent = `示範工作：跑 ${r} 個、排 ${q} 個`;
    if (++this.n % 3 === 0) this.loadDone(el);
  },
  n: 0,
  async loadDone(el) {
    const rows = await kit.db.q('SELECT * FROM demo_done ORDER BY id DESC LIMIT 10');
    const box = $('#hmDone', el); if (!box) return;
    box.innerHTML = rows.map(r => `<div class="jrow"><span class="grow">${esc(r.title)}</span><small class="mut">${(+r.secs).toFixed(1)} 秒　${fmtTime(r.t)}</small></div>`).join('') || `<p class="mut">${kit.native ? '還沒有' : '（預覽沒有資料庫）'}</p>`;
  },
});
kit.act('demo_add', () => addDemo(5));

// ---------- 說明、遠端網頁的首頁
kit.HELP.unshift(['這個程式', '在首頁按「＋ 排 5 個示範背景工作」，到 🖥 後台試試看暫停、繼續、立刻停、調順序。']);
kit.remote.home = async () => ({
  cards: [{ title: '示範工作', value: `跑 ${kit.jobs.running('demo').length}`, sub: `排 ${kit.jobs.queued('demo').length}` }],
  buttons: [{ label: '＋ 排 5 個示範工作', act: 'demo5' }],
});
kit.remote.homeAct = async act => { if (act === 'demo5') { addDemo(5); return '排好了 5 個'; } return ''; };
})();
