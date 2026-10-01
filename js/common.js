// Funzioni condivise da index.html e regali.html
(function () {
  const F = window.FESTA;

  // Codice personale dal link (?g=k7x2): letto in silenzio, mai mostrato nella pagina.
  const params = new URLSearchParams(location.search);
  if (params.get('g')) {
    try { localStorage.setItem('festa_token', params.get('g')); } catch (e) {}
  }
  function getToken() {
    try { return localStorage.getItem('festa_token') || ''; } catch (e) { return ''; }
  }
  // Nome scritto dall'ospite (solo se è arrivato senza link personale)
  function getNome() {
    try { return localStorage.getItem('festa_nome') || ''; } catch (e) { return ''; }
  }

  // Comunicazione con Google Apps Script. Senza URL: modalità demo.
  async function api(payload) {
    if (!F.appsScriptUrl) {
      return { ok: true, demo: true };
    }
    // text/plain evita il preflight CORS, che Apps Script non gestisce
    const res = await fetch(F.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ token: getToken(), nome: getNome() }, payload))
    });
    return res.json();
  }

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

  window.Festa = { getToken, api, confetti, nameError };
})();
