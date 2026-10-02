(function () {
  const F = window.FESTA;
  const $ = s => document.querySelector(s);

  document.querySelectorAll('[data-f="nome"]').forEach(el => { el.textContent = F.nome; });

  // Avviso morbido se l'ospite non ha ancora confermato (la protezione vera dell'IBAN sta nello script)
  let rsvp = '';
  try { rsvp = localStorage.getItem('festa_rsvp') || ''; } catch (e) {}
  if (rsvp !== 'yes') $('#notice').hidden = false;

  const toggle = $('.nav__toggle'), links = $('#nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });

  $('#btn-iban').addEventListener('click', async () => {
    const btn = $('#btn-iban'), err = $('#iban-err');
    err.textContent = '';
    btn.textContent = 'Un attimo…'; btn.disabled = true;
    try {
      await Festa.flush();   // se la conferma era in coda, parte prima di chiedere l'IBAN
      const res = await Festa.api({ action: 'iban' });
      if (!res.ok || (!res.demo && !res.iban)) throw new Error(res.error || 'non autorizzato');
      $('#iban-text').textContent = res.demo ? F.ibanDemo : res.iban;
      $('#iban-closed').hidden = true;
      $('#iban-open').hidden = false;
      Festa.confetti();
    } catch (e) {
      err.textContent = 'Per vedere l\'IBAN devi prima confermare la presenza dall\'invito.';
      btn.textContent = 'Rivela IBAN'; btn.disabled = false;
    }
  });

  $('#btn-copy').addEventListener('click', async e => {
    try {
      await navigator.clipboard.writeText($('#iban-text').textContent.trim());
      e.target.textContent = 'Copiato!';
    } catch (err) {
      e.target.textContent = 'Seleziona e copia a mano';
    }
  });
})();
