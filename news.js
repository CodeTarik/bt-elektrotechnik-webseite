/* Öffentliche, bereits freigegebene Meldungen. Keine Zugangsdaten im Browser. */
(() => {
  const grid = document.getElementById('bt-news-grid');
  const status = document.getElementById('bt-news-status');
  if (!grid || !status) return;
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const normalize = item => {
    if (!item || item.approved !== true) return null;
    const title = clean(item.title), summary = clean(item.summary), source = clean(item.source);
    const date = clean(item.date);
    if (!title || !summary || !source || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const stamp = Date.parse(date + 'T00:00:00Z');
    if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0,10) !== date) return null;
    const today = new Date();
    const localDay = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
    if (date > localDay) return null;
    let url;
    try { url = new URL(item.url); } catch { return null; }
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    url.hash = '';
    return {title:title.slice(0,180), summary:summary.slice(0,600), source:source.slice(0,100), category:clean(item.category).slice(0,50) || 'Elektrotechnik', date, stamp, url:url.href};
  };
  async function load() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('./news.json', {cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error('Feed unavailable');
      const data = await response.json();
      if (!data || !Array.isArray(data.articles)) throw new Error('Invalid feed');
      const seen = new Set();
      const articles = data.articles.map(normalize).filter(Boolean).sort((a,b) => b.stamp-a.stamp)
        .filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; }).slice(0,6);
      for (const a of articles) {
        const card = make('article','bt-news-card');
        const meta = make('div','bt-news-meta');
        const time = make('time','',new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(a.stamp)));
        time.dateTime = a.date;
        meta.append(make('span','bt-news-tag',a.category),time);
        const link = make('a','',`Zur Quelle: ${a.source} ↗`);
        link.href = a.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `${a.title} – Quelle: ${a.source} (neuer Tab)`);
        card.append(meta,make('h3','',a.title),make('p','',a.summary),link);
        grid.append(card);
      }
      status.hidden = articles.length > 0;
      status.textContent = articles.length ? '' : 'Hier finden Sie bald ausgewählte Neuigkeiten aus der Elektrotechnik.';
    } catch {
      status.textContent = 'Die Neuigkeiten sind gerade nicht verfügbar. Bitte versuchen Sie es später erneut.';
    } finally { clearTimeout(timer); }
  }
  load();
})();
