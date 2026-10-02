// Funzioni condivise da index.html e regali.html
(function () {
  const F = window.FESTA;

  // Codice personale dal link (?g=k7x2): letto in silenzio, mai mostrato nella pagina.
  const params = new URLSearchParams(location.search);
  if (params.get('g')) {
    try { localStorage.setItem('festa_token', params.get('g')); } catch (e) {}
  }
  // ?reset=gioco azzera il record del minigioco salvato su questo telefono (il foglio va pulito a mano)
  if (params.get('reset') === 'gioco') {
    try { ['festa_best', 'festa_best_saved'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }
  function getToken() {
    try { return localStorage.getItem('festa_token') || ''; } catch (e) { return ''; }
  }
  // Nome scritto dall'ospite (solo se è arrivato senza link personale)
  function getNome() {
    try { return localStorage.getItem('festa_nome') || ''; } catch (e) { return ''; }
  }

  // Comunicazione con Google Apps Script. Senza URL: modalità demo.
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // Una chiamata allo script, con un tempo massimo: se Google è lento non resta appesa per sempre
  async function call(body) {
    const ctrl = 'AbortController' in window ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), 30000);
    try {
      // text/plain evita il preflight CORS, che Apps Script non gestisce
      const res = await fetch(F.appsScriptUrl, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body, signal: ctrl ? ctrl.signal : undefined
      });
      const text = await res.text();
      try { return JSON.parse(text); } catch (e) { return { ok: false, error: 'risposta non valida', retry: true }; }
    } catch (e) {
      return { ok: false, error: 'rete', retry: true };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // Invio con riprova: se lo script è occupato o la rete salta, ritenta da solo fino a 3 volte
  async function api(payload) {
    if (!F.appsScriptUrl) return { ok: true, demo: true };
    const body = JSON.stringify(Object.assign({ token: getToken(), nome: getNome() }, payload));
    let res;
    for (let i = 0; i < 3; i++) {
      res = await call(body);
      if (res.ok || !res.retry) return res;
      await wait(1500 * (i + 1) + Math.random() * 1000);
    }
    // conferme e punteggi non si perdono: restano salvati sul telefono e si rimandano in automatico
    if (payload.action === 'rsvp' || payload.action === 'score') {
      queue(body, payload.action);
      return Object.assign({}, res, { queued: true });
    }
    return res;
  }

  function queue(body, action) {
    try {
      const q = JSON.parse(localStorage.getItem('festa_pending') || '{}');
      q[action] = body;   // una sola in attesa per tipo: vale l'ultima risposta / il record più alto
      localStorage.setItem('festa_pending', JSON.stringify(q));
    } catch (e) {}
  }

  async function flushQueue() {
    if (!F.appsScriptUrl) return;
    let q;
    try { q = JSON.parse(localStorage.getItem('festa_pending') || '{}'); } catch (e) { return; }
    for (const action of Object.keys(q)) {
      const body = q[action];
      const res = await call(body);
      if (res.ok || !res.retry) {
        delete q[action];
        if (res.ok && action === 'score') {
          try { localStorage.setItem('festa_best_saved', JSON.parse(body).score); } catch (e) {}
        }
      }
    }
    try { localStorage.setItem('festa_pending', JSON.stringify(q)); } catch (e) {}
  }
  function hasPending() {
    try { return Object.keys(JSON.parse(localStorage.getItem('festa_pending') || '{}')).length > 0; } catch (e) { return false; }
  }
  // all'apertura e poi ogni 20 secondi, finché c'è qualcosa in attesa
  setTimeout(flushQueue, 2500);
  setInterval(() => { if (hasPending()) flushQueue(); }, 20000);

  // Coriandoli
  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const w = (c.width = innerWidth), h = (c.height = innerHeight);
    const colors = ['#FFD93D', '#FF6B6B', '#111111', '#ffffff', '#6BCB77'];
    const bits = Array.from({ length: 140 }, () => ({
      x: w / 2, y: h * 0.6,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
      s: Math.random() * 8 + 5, r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      c: colors[Math.floor(Math.random() * colors.length)]
    }));
    let t = 0;
    (function frame() {
      ctx.clearRect(0, 0, w, h);
      bits.forEach(b => {
        b.vy += 0.35; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.6);
        ctx.restore();
      });
      if (++t < 140) requestAnimationFrame(frame); else c.remove();
    })();
  }

  // Stessa normalizzazione dello script: niente accenti, maiuscole o ordine delle parole
  function nameKey(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(String).sort().join(' ');
  }
  // Nomi famosi (criminali e nomi di comodo) usati per fare gli spiritosi
  const BLOCKED = [
    'massimo bossetti', 'filippo turetta', 'toto riina', 'salvatore riina', 'bernardo provenzano',
    'matteo messina denaro', 'pietro maso', 'olindo romano', 'rosa bazzi', 'annamaria franzoni',
    'alberto stasi', 'renato vallanzasca', 'felice maniero', 'donato bilancia', 'luigi chiatti',
    'mario rossi', 'pinco pallino', 'gerry scotti', 'chuck norris'
  ].map(nameKey);

  // Restituisce un messaggio d'errore, oppure '' se il nome va bene
  function nameError(s) {
    const words = String(s || '').trim().split(/\s+/).filter(w => /\p{L}{2,}/u.test(w));
    if (words.length < 2) return 'Scrivi nome e cognome veri, così so chi sei.';
    if (BLOCKED.includes(nameKey(s))) return 'Bel tentativo. Ora scrivi il tuo nome vero.';
    return '';
  }

  // Su telefono le etichette degli sticker sono nascoste: compaiono al tocco
  // e, la prima volta che gli sticker entrano nello schermo, da sole per qualche secondo.
  function initStickerNotes() {
    const mobile = window.matchMedia('(max-width: 720px)');
    const wraps = document.querySelectorAll('.hero .sticker-wrap, .gift-hero .sticker-wrap');
    if (!wraps.length) return;
    wraps.forEach(w => w.addEventListener('click', () => {
      if (!mobile.matches) return;
      const open = !w.classList.contains('show-note');
      wraps.forEach(x => x.classList.remove('show-note'));
      if (open) w.classList.add('show-note');
    }));
    if (!('IntersectionObserver' in window)) return;
    const watch = () => {
      const io = new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting) || !mobile.matches) return;
        io.disconnect();
        setTimeout(() => {
          wraps.forEach(w => w.classList.add('show-note'));
          setTimeout(() => wraps.forEach(w => w.classList.remove('show-note')), 2600);
        }, 600);
      }, { threshold: 1 });
      wraps.forEach(w => io.observe(w));
    };
    // nella home aspetta che biglietto e minigioco siano chiusi, altrimenti il fumetto non lo vede nessuno
    if (!document.body.classList.contains('locked')) return watch();
    const mo = new MutationObserver(() => {
      if (document.body.classList.contains('locked')) return;
      mo.disconnect();
      watch();
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStickerNotes);
  else initStickerNotes();

  window.Festa = { getToken, api, confetti, nameError, flush: flushQueue };
})();
