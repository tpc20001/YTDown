// 測試用的假外殼（check.py 在電腦的 Chrome 裡跑畫面時用）：模擬 window.KIT 的每個功能
(function () {
  const S = window.__mock = { logs: [], ready: '', remote: {}, keep: null, calls: [] };
  const LS = (k, v) => v === undefined ? localStorage.getItem('mock_' + k) : localStorage.setItem('mock_' + k, v);
  const cb = (fn, o) => setTimeout(() => window[fn] && window[fn](JSON.stringify(o)), 30);
  const impl = {
    shell: () => 1, uiVer: () => window.__mockVer || '', builtinVer: () => window.__mockVer || '', usingLive: () => false, prevVer: () => '',
    ready: v => { S.ready = v; }, takeNotice: () => '',
    env: () => JSON.stringify({ sdk: 34, notify: true, batteryFree: false, canInstall: true, usage: false }),
    log: (k, m) => { S.logs.push(k + ' ' + m); if (k === 'err') console.error('KIT-ERR ' + m); },
    logList: () => JSON.stringify([{ name: 'app_log.txt', size: 100, time: Date.now() }]), logTail: () => S.logs.join('\n'),
    dataRead: n => LS('d_' + n) || '', dataWrite: (n, t) => { LS('d_' + n, t); return true; },
    dbAsync: (id, kind, sql) => cb('onDb', { id, ok: true, rows: [], changes: 1 }),
    perf: () => JSON.stringify({ cpu: 12, cores: 8, ramTotal: 8e9, ramFree: 3e9, appMem: 1e8, battery: 70, batTemp: 34, charging: true, thermal: 0, diskFree: 5e10, diskTotal: 1.28e11, net: { online: true, wifi: true } }),
    crashInfo: () => JSON.stringify({ recent: 0, pauseAll: false }), apps: () => '[]', fgApp: () => '',
    keepAlive: (on, t, x) => { S.keep = { on, t, x }; },
    remoteStatus: () => JSON.stringify({ on: false, port: 8571, ips: [{ name: 'wlan0', ip: '192.168.1.5' }] }), remoteStart: () => 'OK',
    remoteReply: (id, j) => { S.remote[id] = JSON.parse(j); },
    http: (id, spec) => cb('onHttp', { id, ok: false, status: 404, body: '' }),
    updPendingInfo: () => '{"ok":false,"none":true}',
    wwwText: n => (window.__mockFiles || {})[n] || '',
  };
  window.KIT = new Proxy(impl, { get: (t, k) => (S.calls.push(k), t[k] || (() => null)) });
})();
