(function () {
  const F = window.FESTA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---- Dati dell'evento nel testo ----
  const map = {
    nome: F.nome, dataLabel: F.dataLabel, ora: F.ora, scadenzaRisposte: F.scadenzaRisposte,
    locNome: F.location.nome, locIndirizzo: F.location.indirizzo, locArrivare: F.location.comeArrivare
  };
  $$('[data-f]').forEach(el => { if (map[el.dataset.f] != null) el.textContent = map[el.dataset.f]; });
  document.title = 'Sei invitato alla laurea di ' + F.nome;

  // ---- Mappa ----
  const q = encodeURIComponent(F.location.mapQuery);
  $('#map').src = 'https://maps.google.com/maps?q=' + q + '&z=15&output=embed';
  $('#map-link').href = 'https://www.google.com/maps/search/?api=1&query=' + q;

  // ---- Biglietto d'ingresso ----
  const splash = $('#splash');
  let opened = false;
  function openSplash() {
    if (opened) return;
    opened = true;
    splash.classList.add('open');
    // dopo lo strappo del biglietto parte il minigioco; chiudendolo si apre l'invito
    Gioco.open(() => window.scrollTo(0, 0));
    setTimeout(() => {
      splash.classList.add('gone');
      setTimeout(() => splash.remove(), 800);
    }, 700);
  }
  Gioco.init();
  $('#btn-gioca').addEventListener('click', () => Gioco.open(() => {
    $('#sfida').scrollIntoView();
    loadStats();
  }));
  splash.addEventListener('click', openSplash);
  splash.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSplash(); }
  });
  splash.focus();

  // ---- Menu ----
  const toggle = $('.nav__toggle'), links = $('#nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('.nav a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false');
  }));
  const navLinks = $$('.nav__link');
  const sections = navLinks.map(a => $(a.getAttribute('href')));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => s && io.observe(s));

  // ---- Countdown ----
  const target = new Date(F.dataISO).getTime();
  function tick() {
    let d = Math.max(0, target - Date.now());
    const days = Math.floor(d / 864e5); d %= 864e5;
    const h = Math.floor(d / 36e5); d %= 36e5;
    const m = Math.floor(d / 6e4), s = Math.floor((d % 6e4) / 1e3);
    const pad = n => String(n).padStart(2, '0');
    $('#cd-d').textContent = pad(days); $('#cd-h').textContent = pad(h);
    $('#cd-m').textContent = pad(m); $('#cd-s').textContent = pad(s);
  }
  tick(); setInterval(tick, 1000);

  // ---- Contatore "persone che hanno confermato" ----
  async function loadStats() {
    let yes = F.confermatiDemo, totale = F.invitatiTotali, record = 0;
    try { record = +localStorage.getItem('festa_best') || 0; } catch (e) {}
    if (F.appsScriptUrl) {
      try {
        const r = await fetch(F.appsScriptUrl + '?action=stats');
        const j = await r.json();
        if (j && typeof j.yes === 'number') yes = j.yes;
        if (j && j.totale) totale = j.totale;
        if (j && typeof j.record === 'number') record = Math.max(record, j.record);
      } catch (e) {}
    }
    $('#count-yes').textContent = yes;
    $('#sfida-record').textContent = record;
    requestAnimationFrame(() => {
      $('#bar-fill').style.width = Math.min(100, Math.round(yes / totale * 100)) + '%';
    });
  }
  loadStats();

  // ---- RSVP ----
  // Senza codice personale nel link, chiediamo il nome per sapere chi risponde.
  if (!Festa.getToken()) {
    $$('[data-name-field]').forEach(box => {
      box.innerHTML = '<label>Nome e cognome<input name="nome" type="text" autocomplete="name" required></label>';
    });
  }

  function show(id) {
    $$('.step').forEach(s => s.classList.toggle('is-active', s.id === 'step-' + id));
    $('#step-' + id).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('#btn-yes').addEventListener('click', () => show('yes'));
  $('#btn-no').addEventListener('click', () => show('no1'));
  $$('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));

  async function submit(form, payload, doneStep, btnText) {
    const err = $('.err', form), btn = $('button[type=submit]', form);
    err.textContent = '';
    const nameInput = form.elements.nome;
    if (nameInput) {
      if (!nameInput.value.trim()) { err.textContent = 'Scrivi nome e cognome, così so chi sei.'; return false; }
      payload.nome = nameInput.value.trim();
      try { localStorage.setItem('festa_nome', payload.nome); } catch (e) {}
    }
    const old = btn.textContent;
    btn.textContent = 'Invio…'; btn.disabled = true;
    try {
      const res = await Festa.api(payload);
      if (!res.ok) throw new Error(res.error || 'errore');
      try { localStorage.setItem('festa_rsvp', payload.risposta); } catch (e) {}
      show(doneStep);
      return true;
    } catch (e) {
      err.textContent = 'Non sono riuscito a inviare. Riprova tra un attimo.';
      return false;
    } finally {
      btn.textContent = old; btn.disabled = false;
    }
  }

  $('#form-yes').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const ok = await submit(f, {
      action: 'rsvp', risposta: 'yes', plus: f.plus.value, allergie: f.allergie.value.trim()
    }, 'yes-done');
    if (ok) {
      Festa.confetti();
      setTimeout(() => { location.href = 'regali.html'; }, 3000);
    }
  });
  $('#form-no').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    await submit(f, { action: 'rsvp', risposta: 'no', motivo: f.reason.value, nota: f.note.value.trim() }, 'no-done');
  });
})();
