// Minigioco "La corsa alla laurea": l'omino col tocco salta gli ostacoli del percorso di studi.
(function () {
  const $ = s => document.querySelector(s);
  const INK = '#111111', CREAM = '#FFF6E0', YELLOW = '#FFD93D', CORAL = '#FF6B6B', WHITE = '#ffffff';
  const H = 260, GY = 222;          // altezza logica e linea del terreno
  const MAX_W = 640;                // larghezza logica massima: tutti vedono lo stesso spazio davanti

  // Ostacoli: etichetta, dimensioni, colore e un piccolo disegno caratteristico
  const TYPES = [
    { t: 'TESI', w: 30, h: 40, c: WHITE, d: 'paper' },
    { t: 'ESAME', w: 44, h: 32, c: YELLOW },
    { t: 'PROF', w: 28, h: 56, c: CORAL, d: 'prof' },
    { t: 'RELATORE', w: 30, h: 60, c: YELLOW, d: 'prof' },
    { t: 'SESSIONE', w: 64, h: 26, c: CORAL },
    { t: 'STATISTICA', w: 36, h: 46, c: WHITE, d: 'paper' },
    { t: 'BUROCRAZIA', w: 40, h: 36, c: WHITE },
    { t: 'FUORICORSO', w: 24, h: 50, c: CORAL }
  ];
  const MILESTONES = [[180, 'Laurea triennale!'], [300, 'Magistrale!'], [500, 'Dottorato?!'], [800, 'Rettore.']];

  let canvas, ctx, W = 600, scale = 1, raf = 0, last = 0;
  let state = 'ready';              // ready | run | over
  let p, obs, speed, score, nextGap, frame, banner, groundOff;
  let onCloseCb = null;

  function getBest() { try { return +localStorage.getItem('festa_best') || 0; } catch (e) { return 0; } }
  function setBest(v) { try { localStorage.setItem('festa_best', v); } catch (e) {} }
  function getNome() { try { return localStorage.getItem('festa_nome') || ''; } catch (e) { return ''; } }

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
    obs = []; speed = 6; score = 0; frame = 0; banner = null; groundOff = 0;
    nextGap = 220;
  }

  function jump() {
    if (state === 'ready') return start();
    if (state === 'run' && p.ground) { p.vy = -12.6; p.ground = false; }
  }

  function start() {
    reset();
    state = 'run';
    $('#g-start').hidden = true;
    $('#g-over').hidden = true;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function spawn(extra = 0) {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    obs.push(Object.assign({ x: W + 20 + extra }, type));
    // ogni tanto un secondo ostacolo attaccato, quando si va già veloci
    if (speed > 8 && Math.random() < 0.25) {
      const t2 = TYPES[Math.floor(Math.random() * TYPES.length)];
      obs.push(Object.assign({ x: W + 20 + type.w + 6 }, t2, { h: Math.min(t2.h, 36) }));
    }
    nextGap = 230 + Math.random() * 260 + speed * 14;
  }

  function loop(now) {
    const dt = Math.min(3, (now - last) / 16.67);
    last = now;
    update(dt);
    draw();
    if (state === 'run') raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    frame += dt;
    speed = Math.min(14, speed + 0.0028 * dt);
    const prev = Math.floor(score);
    score += speed * dt * 0.045;
    const now = Math.floor(score);
    MILESTONES.forEach(([m, txt]) => { if (prev < m && now >= m) banner = { txt, until: frame + 90 }; });
    $('#g-score').textContent = now;

    // fisica dell'omino
    p.vy += 0.62 * dt;
    p.y += p.vy * dt;
    if (p.y >= GY) { p.y = GY; p.vy = 0; p.ground = true; }

    groundOff = (groundOff + speed * dt) % 40;

    obs.forEach(o => { o.x -= speed * dt; });
    obs = obs.filter(o => o.x + o.w > -10);
    const lastOb = obs[obs.length - 1];
    if (!lastOb) spawn(frame < 30 ? 240 : 0);   // il primo ostacolo arriva con un po' di respiro
    else if (lastOb.x < W - nextGap) spawn();

    // collisione con un po' di tolleranza, per non sembrare ingiusta
    const px1 = p.x - 8, px2 = p.x + 8, py1 = p.y - 54, py2 = p.y;
    for (const o of obs) {
      const ox1 = o.x + 4, ox2 = o.x + o.w - 4, oy1 = GY - o.h + 4;
      if (px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < GY) return gameOver();
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

  function drawObstacle(o) {
    const y = GY - o.h;
    ctx.fillStyle = INK; ctx.fillRect(o.x + 3, y + 3, o.w, o.h);   // ombra netta
    ctx.fillStyle = o.c; ctx.fillRect(o.x, y, o.w, o.h);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(o.x, y, o.w, o.h);
    ctx.lineWidth = 2;
    if (o.d === 'paper') {
      for (let i = 8; i < o.h - 4; i += 7) { ctx.beginPath(); ctx.moveTo(o.x + 5, y + i); ctx.lineTo(o.x + o.w - 5, y + i); ctx.stroke(); }
    } else if (o.d === 'prof') {
      const cx = o.x + o.w / 2;
      ctx.beginPath(); ctx.arc(cx - 6, y + 12, 4, 0, Math.PI * 2); ctx.arc(cx + 6, y + 12, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 2, y + 12); ctx.lineTo(cx + 2, y + 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 6, y + 24); ctx.lineTo(cx + 6, y + 24); ctx.stroke(); // bocca severa
    }
    // etichetta
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    const tw = ctx.measureText(o.t).width + 8;
    const lx = o.x + o.w / 2 - tw / 2;
    ctx.fillStyle = INK; ctx.fillRect(lx, y - 18, tw, 14);
    ctx.fillStyle = YELLOW; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.t, o.x + o.w / 2, y - 11);
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
    if (obs) obs.forEach(drawObstacle);
    if (p) drawPlayer();
    if (banner && frame < banner.until) {
      ctx.font = '800 26px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(banner.txt).width + 24;
      ctx.fillStyle = INK; ctx.fillRect(W / 2 - tw / 2 + 4, 54, tw, 40);
      ctx.fillStyle = YELLOW; ctx.fillRect(W / 2 - tw / 2, 50, tw, 40);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(W / 2 - tw / 2, 50, tw, 40);
      ctx.fillStyle = INK; ctx.fillText(banner.txt, W / 2, 71);
    }
  }

  async function gameOver() {
    state = 'over';
    cancelAnimationFrame(raf);
    const s = Math.floor(score);
    const prevBest = getBest();
    const isRecord = s > prevBest;
    if (isRecord) setBest(s);
    $('#g-final').textContent = s;
    $('#g-best').textContent = Math.max(s, prevBest);
    $('#g-over-title').textContent = isRecord && prevBest > 0 ? 'Nuovo record personale!' : pickInsult();
    $('#g-saved').textContent = '';
    $('#g-over').hidden = false;
    canvas.parentElement.classList.add('shake');
    setTimeout(() => canvas.parentElement.classList.remove('shake'), 400);

    if (!isRecord) return;
    // Senza link personale né nome già noto, chiediamo il nome per la classifica
    if (!Festa.getToken() && !getNome()) {
      $('#g-name-form').hidden = false;
      return;
    }
    saveScore(s);
  }

  async function saveScore(s, nome) {
    const msg = $('#g-saved');
    msg.textContent = 'Salvo il punteggio…';
    try {
      const res = await Festa.api({ action: 'score', score: s, nome: nome || getNome() });
      if (res.demo) { $('#g-name-form').hidden = true; msg.textContent = 'Modalità demo: punteggio salvato solo su questo telefono.'; return; }
      if (!res.ok) throw new Error(res.error);
      msg.textContent = 'Punteggio salvato in classifica.';
      $('#g-name-form').hidden = true;
    } catch (e) {
      msg.textContent = 'Non sono riuscito a salvarlo, riprova più tardi.';
    }
  }

  function pickInsult() {
    const l = ['Bocciato!', 'Rimandato a settembre.', 'Il relatore non approva.', 'Torna alla prossima sessione.', 'Fuoricorso!'];
    return l[Math.floor(Math.random() * l.length)];
  }

  function open(onClose) {
    onCloseCb = onClose || null;
    document.body.classList.add('locked');
    $('#game').hidden = false;
    state = 'ready';
    reset();
    $('#g-start').hidden = false;
    $('#g-over').hidden = true;
    $('#g-name-form').hidden = true;
    $('#g-score').textContent = '0';
    $('#g-best').textContent = getBest();
    resize();
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
    $('#g-exit').addEventListener('click', close);
    $('#g-name-form').addEventListener('submit', e => {
      e.preventDefault();
      const nome = e.target.nome.value.trim();
      if (!Festa.validName(nome)) { $('#g-saved').textContent = 'Scrivi nome e cognome veri: niente premio per "Batman".'; return; }
      try { localStorage.setItem('festa_nome', nome); } catch (err) {}
      saveScore(getBest(), nome);
    });
  }

  window.Gioco = { init, open, close };
})();
