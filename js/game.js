// Minigioco "La corsa alla laurea": l'omino col cappello da laureato salta gli ostacoli
// dell'università e del marketing. Più CFU fai, più il percorso si complica.
(function () {
  const $ = s => document.querySelector(s);
  const INK = '#111111', CREAM = '#FFF6E0', YELLOW = '#FFD93D', CORAL = '#FF6B6B', WHITE = '#ffffff', GREEN = '#4E9F3D';
  const H = 260, GY = 222;          // altezza logica e linea del terreno
  const MAX_W = 640;                // larghezza logica massima: tutti vedono lo stesso spazio davanti

  // Ostacoli a terra: università e marketing
  const GROUND = [
    { t: 'TESI', w: 30, h: 40, c: WHITE, d: 'paper' },
    { t: 'ESAME', w: 44, h: 32, c: YELLOW },
    { t: 'PROF', w: 28, h: 56, c: CORAL, d: 'prof' },
    { t: 'RELATORE', w: 30, h: 60, c: YELLOW, d: 'prof' },
    { t: 'SESSIONE', w: 64, h: 26, c: CORAL },
    { t: 'FUORICORSO', w: 24, h: 50, c: CORAL },
    { t: 'SEGRETERIA', w: 40, h: 36, c: WHITE },
    { t: 'CRM', w: 36, h: 34, c: WHITE },
    { t: 'STRATEGIA PAID', w: 52, h: 30, c: YELLOW },
    { t: 'KPI', w: 34, h: 44, c: WHITE, d: 'chart' },
    { t: 'ROAS', w: 38, h: 40, c: YELLOW, d: 'chart' },
    { t: 'FUNNEL', w: 40, h: 46, c: CORAL, d: 'funnel' },
    { t: 'SEO', w: 30, h: 30, c: WHITE },
    { t: 'BRIEF', w: 32, h: 38, c: WHITE, d: 'paper' },
    { t: 'A/B TEST', w: 46, h: 28, c: CORAL },
    { t: 'BUDGET 0€', w: 40, h: 34, c: YELLOW }
  ];
  // Ostacoli in volo: si passa sotto restando a terra, saltandoci dentro si perde
  const FLYING = ['DEADLINE', 'MAIL DEL PROF', 'CALL ALLE 9', 'REVISIONI', 'ALGORITMO META'];

  // Livelli: da questi CFU in poi il percorso cambia
  const LEVELS = [
    { at: 150, txt: 'Arrivano le corone d\'alloro: saltale!' },
    { at: 320, txt: 'Occhio alle DEADLINE: resta a terra!' },
    { at: 520, txt: 'Le corone ora rimbalzano!' },
    { at: 750, txt: 'Sessione straordinaria!' }
  ];
  // Ostacoli bassi per i primi CFU, così si prende confidenza
  const EASY = GROUND.filter(o => o.h <= 40);
  const MILESTONES = [[180, 'Laurea triennale!'], [300, 'Magistrale!'], [480, 'Dottorato?!'], [800, 'Rettore.']];

  let canvas, ctx, W = 600, scale = 1, raf = 0, last = 0;
  let state = 'ready';              // ready | run | over
  let p, obs, speed, score, nextGap, frame, banner, groundOff, level, jumpQueued;
  let onCloseCb = null;

  const store = {
    get: (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const getBest = () => +store.get('festa_best', 0);
  const getSaved = () => +store.get('festa_best_saved', 0);
  const getNome = () => store.get('festa_nome', '');

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    const cssW = box.width;
    const cssH = Math.round(Math.min(320, Math.max(230, cssW * 0.62)));
    const dpr = window.devicePixelRatio || 1;
    scale = cssH / H;
    W = Math.min(MAX_W, cssW / scale);
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    // centra il campo di gioco se lo schermo è più largo del massimo
    const offX = (cssW / scale - W) / 2;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * scale * dpr, 0);
    if (state !== 'run') draw();
  }

  function reset() {
    p = { x: 64, y: GY, vy: 0, ground: true };
    obs = []; speed = 5.5; score = 0; frame = 0; banner = null; groundOff = 0; level = 0; jumpQueued = -99;
    nextGap = 220;
  }

  function jump() {
    if (state === 'ready') return start();
    if (state !== 'run') return;
    if (p.ground) { p.vy = -12.6; p.ground = false; }
    else jumpQueued = frame;   // tocco in aria: se atterri entro pochi istanti, salta da solo
  }

  function start() {
    reset();
    state = 'run';
    $('#g-start').hidden = true;
    $('#g-over').hidden = true;
    $('#g-name-form').hidden = true;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  const pick = a => a[Math.floor(Math.random() * a.length)];

  // Sceglie il prossimo ostacolo in base al livello raggiunto
  function spawn(extra = 0) {
    const x = W + 20 + extra;
    const r = Math.random();
    if (level >= 2 && r < 0.2) {
      // davanti alla deadline serve spazio per atterrare dal salto precedente
      const prev = obs[obs.length - 1];
      const fx = prev ? Math.max(x, prev.x + prev.w + speed * 44) : x;
      const t = pick(FLYING);
      ctx.font = '800 10px Inter, system-ui, sans-serif';
      obs.push({ kind: 'fly', t, x: fx, w: Math.max(70, ctx.measureText(t).width + 18), h: 22, bottom: GY - 76 });
      nextGap = Math.max(speed * 44, 300 + Math.random() * 160);   // spazio libero sotto la deadline
      return;
    }
    if (level >= 1 && r < 0.42) {
      const bounce = level >= 3 && Math.random() < 0.5;
      const extra = bounce ? 0.6 : 1.2;
      // la corona va più veloce: parte più indietro del tanto che recupera prima di arrivare all'omino
      const prev = obs[obs.length - 1];
      const catchUp = extra * (W - p.x) / speed;
      const wx = prev ? Math.max(x, prev.x + prev.w + speed * 44 + catchUp) : x;
      obs.push({ kind: 'wreath', x: wx, w: 28, h: 28, extra, bounce, phase: Math.random() * Math.PI, rot: 0 });
      nextGap = Math.max(speed * 44, 260 + Math.random() * 220);
      return;
    } else {
      const type = pick(score < 100 ? EASY : GROUND);
      obs.push(Object.assign({ kind: 'box', x }, type));
      // ostacoli doppi sempre più frequenti
      const dbl = level >= 4 ? 0.35 : level >= 2 ? 0.2 : speed > 8.5 ? 0.12 : 0;
      if (Math.random() < dbl) {
        const t2 = pick(GROUND);
        obs.push(Object.assign({ kind: 'box', x: x + type.w + 6 }, t2, { h: Math.min(t2.h, 36) }));
      }
    }
    // gli spazi si accorciano col punteggio, ma restano sempre saltabili
    const shrink = Math.min(120, score * 0.14);
    nextGap = Math.max(speed * 44, 250 + Math.random() * 260 + speed * 14 - shrink);
  }

  function loop(now) {
    const dt = Math.min(3, (now - last) / 16.67);
    last = now;
    update(dt);
    if (state === 'run') { draw(); raf = requestAnimationFrame(loop); }
  }

  function update(dt) {
    frame += dt;
    speed = Math.min(level >= 4 ? 12.5 : 11, speed + 0.0018 * dt);
    const prev = Math.floor(score);
    score += speed * dt * 0.045;
    const now = Math.floor(score);
    MILESTONES.forEach(([m, txt]) => { if (prev < m && now >= m) banner = { txt, until: frame + 90 }; });
    LEVELS.forEach((l, i) => { if (prev < l.at && now >= l.at) { level = i + 1; banner = { txt: l.txt, until: frame + 110 }; } });
    $('#g-score').textContent = now;

    // fisica dell'omino
    p.vy += 0.62 * dt;
    p.y += p.vy * dt;
    if (p.y >= GY) {
      p.y = GY; p.vy = 0; p.ground = true;
      if (frame - jumpQueued < 9) { jumpQueued = -99; p.vy = -12.6; p.ground = false; }
    }

    groundOff = (groundOff + speed * dt) % 40;

    obs.forEach(o => {
      o.x -= (speed + (o.extra || 0)) * dt;
      if (o.kind === 'wreath') {
        o.rot -= (speed + o.extra) * dt / 16;
        o.lift = o.bounce ? Math.abs(Math.sin(frame * 0.07 + o.phase)) * 22 : 0;
      }
    });
    obs = obs.filter(o => o.x + o.w > -10);
    const lastOb = obs[obs.length - 1];
    if (!lastOb) spawn(frame < 30 ? 240 : 0);   // il primo ostacolo arriva con un po' di respiro
    else if (lastOb.x < W - nextGap) spawn();

    // collisione con un po' di tolleranza, per non sembrare ingiusta
    const px1 = p.x - 7, px2 = p.x + 7, py1 = p.y - 52, py2 = p.y;
    for (const o of obs) {
      let ox1 = o.x + 5, ox2 = o.x + o.w - 5, oy1, oy2;
      if (o.kind === 'fly') { oy1 = o.bottom - o.h; oy2 = o.bottom - 4; }
      else if (o.kind === 'wreath') { oy2 = GY - o.lift - 4; oy1 = oy2 - o.h + 8; }
      else { oy1 = GY - o.h + 4; oy2 = GY; }
      if (px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < oy2) return gameOver();
    }
  }

  function drawPlayer() {
    const x = p.x, y = p.y;
    const run = p.ground ? Math.sin(frame * 0.45) * 7 : 4;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 20); ctx.lineTo(x + run, y);            // gamba
    ctx.moveTo(x, y - 20); ctx.lineTo(x - run, y);            // gamba
    ctx.moveTo(x, y - 20); ctx.lineTo(x, y - 38);             // corpo
    ctx.moveTo(x, y - 34); ctx.lineTo(x + 9, y - 26 - run * 0.4); // braccio
    ctx.moveTo(x, y - 34); ctx.lineTo(x - 9, y - 26 + run * 0.4); // braccio
    ctx.stroke();
    // testa
    ctx.fillStyle = WHITE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - 46, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // cappello da laureato: base e tavola
    ctx.fillStyle = INK;
    ctx.fillRect(x - 6, y - 56, 12, 5);
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 57); ctx.lineTo(x, y - 63); ctx.lineTo(x + 14, y - 57); ctx.lineTo(x, y - 51);
    ctx.closePath(); ctx.fill();
    // nappa
    ctx.strokeStyle = CORAL; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y - 57); ctx.lineTo(x + 11, y - 55); ctx.lineTo(x + 11 + (p.ground ? 0 : 2), y - 45); ctx.stroke();
  }

  function drawLabel(text, cx, y) {
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    const tw = ctx.measureText(text).width + 8;
    ctx.fillStyle = INK; ctx.fillRect(cx - tw / 2, y - 7, tw, 14);
    ctx.fillStyle = YELLOW; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, y);
  }

  function drawBox(o) {
    const y = GY - o.h;
    ctx.fillStyle = INK; ctx.fillRect(o.x + 3, y + 3, o.w, o.h);   // ombra netta
    ctx.fillStyle = o.c; ctx.fillRect(o.x, y, o.w, o.h);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(o.x, y, o.w, o.h);
    ctx.lineWidth = 2;
    const cx = o.x + o.w / 2;
    ctx.beginPath();
    if (o.d === 'paper') {
      for (let i = 8; i < o.h - 4; i += 7) { ctx.moveTo(o.x + 5, y + i); ctx.lineTo(o.x + o.w - 5, y + i); }
    } else if (o.d === 'prof') {
      ctx.arc(cx - 6, y + 12, 4, 0, Math.PI * 2); ctx.moveTo(cx + 10, y + 12); ctx.arc(cx + 6, y + 12, 4, 0, Math.PI * 2);
      ctx.moveTo(cx - 2, y + 12); ctx.lineTo(cx + 2, y + 12);
      ctx.moveTo(cx - 6, y + 24); ctx.lineTo(cx + 6, y + 24);  // bocca severa
    } else if (o.d === 'chart') {
      ctx.moveTo(o.x + 5, y + o.h - 8); ctx.lineTo(o.x + o.w * 0.4, y + o.h * 0.45);
      ctx.lineTo(o.x + o.w * 0.6, y + o.h * 0.65); ctx.lineTo(o.x + o.w - 5, y + 8);  // grafico in calo... o in crescita
    } else if (o.d === 'funnel') {
      ctx.moveTo(o.x + 5, y + 8); ctx.lineTo(o.x + o.w - 5, y + 8); ctx.lineTo(cx + 3, y + o.h - 8);
      ctx.lineTo(cx - 3, y + o.h - 8); ctx.closePath();
    }
    ctx.stroke();
    drawLabel(o.t, cx, y - 11);
  }

  function drawWreath(o) {
    const cx = o.x + o.w / 2, cy = GY - o.lift - o.h / 2, r = o.h / 2 - 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(o.rot);
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {                      // foglie d'alloro intorno all'anello
      const a = (i / 12) * Math.PI * 2;
      ctx.save(); ctx.rotate(a); ctx.translate(r, 0); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = GREEN;
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = CORAL; ctx.fillRect(-4, r - 4, 8, 8);   // fiocco
    ctx.restore();
    if (o.bounce) { ctx.fillStyle = 'rgba(17,17,17,.15)'; ctx.fillRect(o.x + 4, GY - 3, o.w - 8, 3); }  // ombra a terra
  }

  function drawFlying(o) {
    const y = o.bottom - o.h;
    ctx.fillStyle = INK; ctx.fillRect(o.x + 3, y + 3, o.w, o.h);
    ctx.fillStyle = CORAL; ctx.fillRect(o.x, y, o.w, o.h);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(o.x, y, o.w, o.h);
    // piccole ali per far capire che vola
    const wing = Math.sin(frame * 0.4) * 4;
    ctx.beginPath(); ctx.moveTo(o.x + 10, y); ctx.lineTo(o.x + 4, y - 8 - wing); ctx.lineTo(o.x + 22, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.x + o.w - 22, y); ctx.lineTo(o.x + o.w - 4, y - 8 - wing); ctx.lineTo(o.x + o.w - 10, y); ctx.stroke();
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.t, o.x + o.w / 2, y + o.h / 2 + 1);
  }

  function draw() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    // pavimento
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-40, GY); ctx.lineTo(W + 40, GY); ctx.stroke();
    ctx.lineWidth = 2;
    for (let x = -groundOff; x < W + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, GY + 10); ctx.lineTo(x + 12, GY + 10); ctx.stroke(); }
    if (obs) obs.forEach(o => o.kind === 'wreath' ? drawWreath(o) : o.kind === 'fly' ? drawFlying(o) : drawBox(o));
    if (p) drawPlayer();
    if (banner && frame < banner.until) {
      ctx.font = '800 22px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = Math.min(W - 20, ctx.measureText(banner.txt).width + 24);
      ctx.fillStyle = INK; ctx.fillRect(W / 2 - tw / 2 + 4, 54, tw, 38);
      ctx.fillStyle = YELLOW; ctx.fillRect(W / 2 - tw / 2, 50, tw, 38);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(W / 2 - tw / 2, 50, tw, 38);
      ctx.fillStyle = INK; ctx.fillText(banner.txt, W / 2, 70, tw - 12);
    }
  }

  // ---- Fine partita e classifica ----
  function gameOver() {
    state = 'over';
    cancelAnimationFrame(raf);
    draw();
    const s = Math.floor(score);
    const prevBest = getBest();
    const best = Math.max(s, prevBest);
    if (s > prevBest) store.set('festa_best', s);
    $('#g-final').textContent = s;
    $('#g-best').textContent = best;
    $('#g-over-title').textContent = s > prevBest && prevBest > 0 ? 'Nuovo record personale!' : pickInsult();
    $('#g-over').hidden = false;
    canvas.parentElement.classList.add('shake');
    setTimeout(() => canvas.parentElement.classList.remove('shake'), 400);

    if (best <= getSaved()) {
      setStatus(`Il tuo record (${best} CFU) è già in classifica.`);
    } else if (!Festa.getToken() && !getNome()) {
      setStatus('↓ Scrivi il tuo nome qui sotto per entrare in classifica');
      $('#g-name-form').hidden = false;
    } else {
      saveScore(best);
    }
  }

  function setStatus(txt) { $('#g-status').textContent = txt; }

  async function saveScore(s, nome) {
    setStatus('Salvo il punteggio in classifica…');
    try {
      const res = await Festa.api({ action: 'score', score: s, nome: nome || getNome() });
      if (!res.ok) throw new Error(res.error);
      store.set('festa_best_saved', s);
      $('#g-name-form').hidden = true;
      setStatus(res.demo ? 'Modalità demo: punteggio salvato solo qui.' : `Record di ${s} CFU salvato in classifica!`);
      loadBoard();
    } catch (e) {
      setStatus(e.message === 'nome e cognome mancanti' ? 'Serve nome e cognome per la classifica.' : 'Non sono riuscito a salvarlo, riprova tra poco.');
      if (!Festa.getToken()) $('#g-name-form').hidden = false;
    }
  }

  // Classifica generale: mostra solo nome e iniziale del cognome
  async function loadBoard() {
    let rows = null;
    try {
      const res = await Festa.api({ action: 'classifica' });
      if (res.demo) rows = getBest() ? [{ nome: getNome() || 'Tu', punteggio: getBest(), io: true }] : [];
      else if (res.ok && Array.isArray(res.top)) rows = res.top;
    } catch (e) {}
    document.querySelectorAll('[data-board]').forEach(el => {
      const box = el.closest('[data-board-box]');
      if (!rows) { if (box) box.hidden = true; return; }
      if (box) box.hidden = false;
      const limit = +el.dataset.board || 10;
      el.innerHTML = rows.length
        ? rows.slice(0, limit).map((r, i) =>
            `<li class="${r.io ? 'me' : ''}"><span class="pos">${['🥇', '🥈', '🥉'][i] || (i + 1) + '°'}</span>` +
            `<span class="who">${escapeHtml(r.nome)}${r.io ? ' (tu)' : ''}</span><b>${r.punteggio} CFU</b></li>`).join('')
        : '<li class="empty">Ancora nessun punteggio: il primo posto è libero!</li>';
    });
    // il record da battere è il primo della classifica (se la classifica non è disponibile resta quello di loadStats)
    const recEl = $('#sfida-record');
    if (recEl && rows) recEl.textContent = rows[0] ? rows[0].punteggio : 0;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function pickInsult() {
    return pick(['Bocciato!', 'Rimandato a settembre.', 'Il relatore non approva.', 'Torna alla prossima sessione.', 'Fuoricorso!', 'ROAS negativo.', 'Campagna respinta.']);
  }

  function open(onClose) {
    onCloseCb = onClose || null;
    document.body.classList.add('locked');
    $('#game').hidden = false;
    $('#game').scrollTop = 0;
    state = 'ready';
    reset();
    $('#g-start').hidden = false;
    $('#g-over').hidden = true;
    $('#g-name-form').hidden = true;
    $('#g-score').textContent = '0';
    $('#g-best').textContent = getBest();
    resize();
    loadBoard();
    $('#g-play').focus();
  }

  function close() {
    state = 'ready';
    cancelAnimationFrame(raf);
    $('#game').hidden = true;
    document.body.classList.remove('locked');
    if (onCloseCb) onCloseCb();
  }

  function init() {
    canvas = $('#game-canvas');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', () => { if (!$('#game').hidden) resize(); });

    // tocco ovunque sul campo per saltare (ma non sui bottoni dei pannelli)
    $('#game-stage').addEventListener('pointerdown', e => {
      if (e.target.closest('button, input, form')) return;
      e.preventDefault();
      jump();
    });
    document.addEventListener('keydown', e => {
      if ($('#game').hidden) return;
      if (e.target.closest && e.target.closest('input')) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (state === 'over') start(); else jump();
      }
      if (e.code === 'Escape') close();
    });
    $('#g-play').addEventListener('click', start);
    $('#g-retry').addEventListener('click', start);
    $('#g-close').addEventListener('click', close);
    $('#g-close-top').addEventListener('click', close);
    $('#g-exit').addEventListener('click', close);
    $('#g-name-form').addEventListener('submit', e => {
      e.preventDefault();
      const nome = e.target.nome.value.trim();
      const nameErr = Festa.nameError(nome);
      if (nameErr) { setStatus(nameErr); return; }
      store.set('festa_nome', nome);
      saveScore(getBest(), nome);
    });
    loadBoard();
  }

  window.Gioco = { init, open, close, loadBoard };
})();
