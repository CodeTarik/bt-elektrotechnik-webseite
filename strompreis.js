/* Strompreis-Widget (Börsenstrompreis Day-Ahead, DE-LU)
   Daten kommen nur vom eigenen Server (api/strompreis.php), nie direkt von Dritten. */
(() => {
  const roots = document.querySelectorAll('[data-strompreis]');
  if (!roots.length) return;

  const TZ = 'Europe/Berlin';
  const fKey  = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'});
  const fTime = new Intl.DateTimeFormat('de-DE', {timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
  const fDay  = new Intl.DateTimeFormat('de-DE', {timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long'});
  const fNum  = new Intl.NumberFormat('de-DE', {minimumFractionDigits: 1, maximumFractionDigits: 1});

  const dayKey = ts => fKey.format(new Date(ts * 1000));
  const hhmm = ts => fTime.format(new Date(ts * 1000));
  const hourNum = ts => parseInt(hhmm(ts), 10);
  const ct = v => fNum.format(v);
  const range = (a, b) => `${hhmm(a)}–${hhmm(b)} Uhr`;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  /* ── Daten aufbereiten ─────────────────────────────── */
  function toHours(slots) {
    const map = new Map();
    for (const s of slots) {
      const h = Math.floor(s.t / 3600) * 3600;           // Berlin hat ganzstündige Offsets
      const b = map.get(h) || {t: h, sum: 0, n: 0};
      b.sum += s.p; b.n += 1; map.set(h, b);
    }
    return [...map.values()].sort((a, b) => a.t - b.t).map(b => ({t: b.t, p: b.sum / b.n}));
  }

  function cheapestWindow(hours, len) {
    if (!hours.length) return null;
    len = Math.min(len, hours.length);
    let best = null;
    for (let i = 0; i + len <= hours.length; i++) {
      const part = hours.slice(i, i + len);
      if (part[len - 1].t - part[0].t !== (len - 1) * 3600) continue;   // nur lückenlose Fenster
      const avg = part.reduce((s, h) => s + h.p, 0) / len;
      if (!best || avg < best.avg) best = {from: part[0].t, to: part[len - 1].t + 3600, avg};
    }
    return best;
  }

  function buildDay(slots, key, nowTs) {
    const daySlots = slots.filter(s => dayKey(s.t) === key);
    if (!daySlots.length) return null;
    const hours = toHours(daySlots);
    const prices = daySlots.map(s => s.p);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minS = daySlots.reduce((a, b) => (b.p < a.p ? b : a));
    const maxS = daySlots.reduce((a, b) => (b.p > a.p ? b : a));
    const upcoming = hours.filter(h => h.t + 3600 > nowTs);
    const windowHours = upcoming.length ? upcoming : hours;
    const cheap = cheapestWindow(windowHours, 3);
    const nowSlot = daySlots.filter(s => s.t <= nowTs).pop();
    const step = daySlots.length > 1 ? daySlots[1].t - daySlots[0].t : 3600;
    return {key, slots: daySlots, hours, avg, minS, maxS, cheap, step,
            now: nowSlot && nowTs < nowSlot.t + step ? nowSlot : null};
  }

  /* ── Diagramm ──────────────────────────────────────── */
  function niceScale(min, max) {
    const lo = Math.min(0, min), hi = Math.max(0, max);
    const span = hi - lo || 1;
    const step = [1, 2, 5, 10, 20, 25, 50, 100].find(s => span / s <= 4) || 200;
    return {lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step || step, step};
  }

  function renderChart(day, nowTs, interactive) {
    const wrap = el('div');
    const {hours} = day;
    const sc = niceScale(Math.min(...hours.map(h => h.p)), Math.max(...hours.map(h => h.p)));
    const y = v => ((sc.hi - v) / (sc.hi - sc.lo)) * 100;   // Prozent von oben

    const plot = el('div', 'bt-sp-plot');
    const yaxis = el('div', 'bt-sp-yaxis');
    yaxis.setAttribute('aria-hidden', 'true');
    const area = el('div', 'bt-sp-area');

    for (let v = sc.lo; v <= sc.hi + 1e-9; v += sc.step) {
      const lab = el('span', '', ct(v).replace(',0', ''));
      lab.style.top = y(v) + '%';
      yaxis.append(lab);
      const line = el('div', 'bt-sp-grid' + (Math.abs(v) < 1e-9 ? ' is-zero' : ''));
      line.style.top = y(v) + '%';
      area.append(line);
    }

    const bars = el('div', 'bt-sp-bars');
    const tip = el('div', 'bt-sp-tip');
    tip.hidden = true;
    tip.setAttribute('aria-hidden', 'true');

    const inCheap = h => day.cheap && h.t >= day.cheap.from && h.t < day.cheap.to;

    hours.forEach(h => {
      const col = el('div', 'bt-sp-col');
      if (inCheap(h)) col.classList.add('is-cheap');
      if (h.t + 3600 <= nowTs) col.classList.add('is-past');
      const isNow = h.t <= nowTs && nowTs < h.t + 3600;
      if (isNow) col.classList.add('is-now');

      const bar = el('div', 'bt-sp-bar ' + (h.p >= 0 ? 'is-pos' : 'is-neg'));
      const top = h.p >= 0 ? y(h.p) : y(0);
      const height = Math.max(Math.abs(y(h.p) - y(0)), 0.8);
      bar.style.top = top + '%';
      bar.style.height = height + '%';
      col.append(bar);
      if (isNow) {
        const now = el('span', 'bt-sp-now', 'Jetzt');
        now.style.top = `calc(${top}% - 20px)`;
        col.append(now);
      }

      const label = `${range(h.t, h.t + 3600)}: ${ct(h.p)} ct/kWh${inCheap(h) ? ', günstiges Zeitfenster' : ''}`;
      if (interactive) {
        col.tabIndex = 0;
        col.setAttribute('role', 'img');
        col.setAttribute('aria-label', label);
      }
      const show = () => {
        tip.replaceChildren();
        tip.append(el('span', '', range(h.t, h.t + 3600)), el('br'), el('b', '', ct(h.p)), document.createTextNode(' ct/kWh'));
        if (inCheap(h)) tip.append(el('br'), el('span', '', 'Günstiges Zeitfenster'));
        const areaW = area.clientWidth;
        const x = col.offsetLeft + col.offsetWidth / 2;
        tip.style.left = Math.min(Math.max(x, 70), areaW - 70) + 'px';
        tip.style.top = (top / 100) * area.clientHeight + 'px';
        tip.hidden = false;
      };
      const hide = () => { tip.hidden = true; };
      col.addEventListener('pointerenter', show);
      col.addEventListener('pointerleave', hide);
      col.addEventListener('focus', show);
      col.addEventListener('blur', hide);
      bars.append(col);
    });

    area.append(bars, tip);
    plot.append(yaxis, area);

    const xaxis = el('div', 'bt-sp-xaxis');
    xaxis.setAttribute('aria-hidden', 'true');
    hours.forEach((h, i) => {
      if (hourNum(h.t) % 6 !== 0) return;
      const lab = el('span', '', hhmm(h.t));
      lab.style.left = (i / hours.length) * 100 + '%';
      xaxis.append(lab);
    });

    if (!interactive) {
      const sr = el('p', 'bt-sp-sr',
        `Balkendiagramm der stündlichen Börsenstrompreise. Tiefstwert ${ct(day.minS.p)} ct/kWh um ${hhmm(day.minS.t)} Uhr, Höchstwert ${ct(day.maxS.p)} ct/kWh um ${hhmm(day.maxS.t)} Uhr.`);
      wrap.append(sr);
      plot.setAttribute('aria-hidden', 'true');
    }
    wrap.append(plot, xaxis);
    return wrap;
  }

  /* ── Bausteine ─────────────────────────────────────── */
  function stat(label, value, sub, hero) {
    const box = el('div', 'bt-sp-stat' + (hero ? ' is-hero' : ''));
    const strong = el('strong', '', value);
    strong.append(el('small', '', 'ct/kWh'));
    box.append(el('span', '', label), strong);
    if (sub) box.append(el('em', '', sub));
    return box;
  }

  function legend(isToday) {
    const lg = el('div', 'bt-sp-legend');
    const item = (cls, text) => { const s = el('span', cls); s.append(el('i'), document.createTextNode(text)); return s; };
    lg.append(item('is-cheap', 'Günstigste 3 Stunden'), item('is-rest', 'Übrige Stunden'));
    if (isToday) lg.append(item('is-now', 'Jetzt'));
    return lg;
  }

  function hourTable(day, opts) {
    const det = el('details', 'bt-sp-details');
    det.open = !!opts.tableOpen;
    det.addEventListener('toggle', () => opts.onTableToggle(det.open));
    det.append(el('summary', '', 'Alle Stundenpreise als Tabelle'));
    const table = el('table', 'bt-sp-table');
    const head = el('tr');
    head.append(el('th', '', 'Zeit'), el('th', '', 'ct/kWh'));
    const thead = el('thead'); thead.append(head);
    const tbody = el('tbody');
    day.hours.forEach(h => {
      const tr = el('tr', day.cheap && h.t >= day.cheap.from && h.t < day.cheap.to ? 'is-cheap' : '');
      tr.append(el('td', '', range(h.t, h.t + 3600)), el('td', '', ct(h.p)));
      tbody.append(tr);
    });
    table.append(thead, tbody);
    det.append(table);
    return det;
  }

  function renderDay(target, day, opts) {
    const {nowTs, isToday, mode} = opts;
    const stats = el('div', 'bt-sp-stats');
    if (isToday && day.now) stats.append(stat('Jetzt', ct(day.now.p), range(day.now.t, day.now.t + day.step), true));
    else if (day.cheap) stats.append(stat('Günstigste 3 Std.', ct(day.cheap.avg), range(day.cheap.from, day.cheap.to), true));
    stats.append(
      stat(isToday ? 'Ø heute' : 'Ø morgen', ct(day.avg)),
      stat('Tiefstwert', ct(day.minS.p), `um ${hhmm(day.minS.t)} Uhr`),
      stat('Höchstwert', ct(day.maxS.p), `um ${hhmm(day.maxS.t)} Uhr`)
    );

    const head = el('div', 'bt-sp-chart-head');
    head.append(el('div', 'bt-sp-chart-title', `Stündlicher Durchschnitt · ${fDay.format(new Date(day.hours[0].t * 1000))}`), legend(isToday));

    target.append(stats, head, renderChart(day, nowTs, mode === 'full'));

    if (day.cheap) {
      const p = el('p', 'bt-sp-tip-line');
      p.append(document.createTextNode(isToday ? 'Günstigstes Zeitfenster ab jetzt: ' : 'Günstigstes Zeitfenster morgen: '));
      p.append(el('strong', '', `${range(day.cheap.from, day.cheap.to)} (Ø ${ct(day.cheap.avg)} ct/kWh)`));
      p.append(document.createTextNode(' – mit dynamischem Stromtarif ideal zum Laden des E-Autos, für Speicher oder Wärmepumpe.'));
      target.append(p);
    }
    if (mode === 'full') target.append(hourTable(day, opts));
  }

  function note(data) {
    const p = el('p', 'bt-sp-note');
    const stand = data.fetched_at ? new Date(data.fetched_at) : null;
    p.append(document.createTextNode(
      'Börsenstrompreis (Day-Ahead, Gebotszone DE-LU), netto ohne Netzentgelte, Steuern, Abgaben und Umlagen – nicht Ihr Endkundenpreis. '));
    p.append(document.createTextNode('Daten: '));
    const a = el('a', '', 'Bundesnetzagentur | SMARD.de');
    a.href = 'https://www.smard.de/'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const b = el('a', '', 'Energy-Charts / Fraunhofer ISE');
    b.href = 'https://www.energy-charts.info/'; b.target = '_blank'; b.rel = 'noopener noreferrer';
    const c = el('a', '', 'CC BY 4.0');
    c.href = 'https://creativecommons.org/licenses/by/4.0/deed.de'; c.target = '_blank'; c.rel = 'noopener noreferrer';
    p.append(a, document.createTextNode(' via '), b, document.createTextNode(' ('), c, document.createTextNode(')'));
    if (stand && !isNaN(stand)) {
      p.append(document.createTextNode(`. Stand: ${stand.toLocaleString('de-DE', {timeZone: TZ, dateStyle: 'short', timeStyle: 'short'})} Uhr`));
    }
    p.append(document.createTextNode(data.stale ? ' (Quelle gerade nicht erreichbar, letzter bekannter Stand).' : '.'));
    return p;
  }

  /* ── Steuerung pro Widget ──────────────────────────── */
  function setup(root) {
    const mode = root.dataset.mode === 'full' ? 'full' : 'compact';
    const api = root.dataset.api || './api/strompreis.php';
    const status = el('p', 'bt-sp-status', 'Aktuelle Strompreise werden geladen …');
    status.setAttribute('role', 'status');
    const body = el('div');
    root.replaceChildren(status, body);

    let data = null;
    let selected = 'today';
    let tableOpen = false;

    function render() {
      if (!data) return;
      const nowTs = Date.now() / 1000;
      const todayKey = dayKey(nowTs);
      const tomorrowKey = dayKey(nowTs + 86400 + 3600);    // +1 h: sicher über Zeitumstellung
      const today = buildDay(data.slots, todayKey, nowTs);
      const tomorrow = buildDay(data.slots, tomorrowKey, nowTs);

      body.replaceChildren();
      if (!today && !tomorrow) {
        status.hidden = false;
        status.textContent = 'Für heute liegen gerade keine Börsenstrompreise vor. Bitte versuchen Sie es später erneut.';
        return;
      }
      status.hidden = true;

      if (mode === 'full') {
        const tabs = el('div', 'bt-sp-tabs');
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Tag auswählen');
        const mk = (id, text, available) => {
          const t = el('button', 'bt-sp-tab', text);
          t.type = 'button';
          t.setAttribute('role', 'tab');
          t.setAttribute('aria-selected', String(selected === id));
          t.disabled = !available;
          t.addEventListener('click', () => { selected = id; render(); });
          return t;
        };
        tabs.append(mk('today', 'Heute', !!today), mk('tomorrow', tomorrow ? 'Morgen' : 'Morgen (ab ca. 13 Uhr)', !!tomorrow));
        body.append(tabs);
      }

      if (selected === 'tomorrow' && !tomorrow) selected = 'today';
      const showTomorrow = mode === 'full' ? selected === 'tomorrow' : !today;
      const day = showTomorrow ? tomorrow : today;
      const panel = el('div');
      if (mode === 'full') panel.setAttribute('role', 'tabpanel');
      renderDay(panel, day, {nowTs, isToday: !showTomorrow, mode, tableOpen, onTableToggle: v => { tableOpen = v; }});
      body.append(panel);

      const foot = el('div', 'bt-sp-foot');
      foot.append(note(data));
      if (root.dataset.more) {
        const more = el('a', 'bt-sp-more', tomorrow ? 'Details & Preise für morgen →' : 'Alle Details →');
        more.href = root.dataset.more;
        foot.append(more);
      }
      body.append(foot);
    }

    async function load() {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(api, {signal: controller.signal, headers: {Accept: 'application/json'}});
        const json = await res.json();
        if (!json || json.ok !== true || !Array.isArray(json.slots)) throw new Error('invalid');
        data = {
          ...json,
          slots: json.slots.filter(s => Number.isFinite(s.t) && Number.isFinite(s.p)).sort((a, b) => a.t - b.t)
        };
        render();
      } catch {
        if (!data) {
          status.hidden = false;
          status.textContent = 'Die Strompreise sind gerade nicht verfügbar. Bitte versuchen Sie es später erneut.';
        }
      } finally {
        clearTimeout(timer);
      }
    }

    load();
    setInterval(render, 60 * 1000);        // "Jetzt"-Markierung mitlaufen lassen
    setInterval(load, 10 * 60 * 1000);     // neue Daten (z. B. Preise für morgen)
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 150); });
  }

  roots.forEach(setup);
})();
