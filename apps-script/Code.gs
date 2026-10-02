/**
 * Backend della festa di laurea: Google Sheet + Apps Script.
 * Va incollato in Estensioni > Apps Script del foglio (vedi README.md).
 *
 * Proprietà dello script (Impostazioni progetto > Proprietà script):
 *   IBAN      → il tuo IBAN, restituito solo a chi ha detto sì
 *   SITE_URL  → indirizzo del sito, es. https://simonefusco2001.github.io/festa-laurea/
 */

const SHEET_NAME = 'Invitati';
const HEADERS = [
  'nome', 'token', 'link', 'risposta', 'piu_uno', 'allergie',
  'motivo_no', 'nota', 'data_risposta', 'punteggio', 'data_punteggio', 'controllo'
];
// Valori della colonna "controllo" per le righe create dal sito
const NON_IN_LISTA = '⚠️ non in lista, da verificare';
const DAL_SITO = 'aggiunto dal sito';
// Nomi famosi usati per fare gli spiritosi: non creano righe (stessa lista di js/common.js)
const BLOCKED = [
  'massimo bossetti', 'filippo turetta', 'toto riina', 'salvatore riina', 'bernardo provenzano',
  'matteo messina denaro', 'pietro maso', 'olindo romano', 'rosa bazzi', 'annamaria franzoni',
  'alberto stasi', 'renato vallanzasca', 'felice maniero', 'donato bilancia', 'luigi chiatti',
  'mario rossi', 'pinco pallino', 'gerry scotti', 'chuck norris'
];
const COL = HEADERS.reduce((o, h, i) => (o[h] = i + 1, o), {});
const MAX_SCORE = 100000;

// ---------- Menu nel foglio ----------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🎓 Festa')
    .addItem('Prepara il foglio', 'preparaFoglio')
    .addItem('Genera i link degli invitati', 'generaLink')
    .addToUi();
}

function preparaFoglio() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#FFD93D');
  sh.setFrozenRows(1);
  // colori automatici sulla colonna risposta
  const r = sh.getRange(2, COL.risposta, 500, 1);
  const c = sh.getRange(2, COL.controllo, 500, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Sì').setBackground('#C8F7C5').setRanges([r]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('No').setBackground('#FFC9C9').setRanges([r]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(NON_IN_LISTA).setBackground('#FFE0A3').setRanges([c]).build()
  ]);
  SpreadsheetApp.getUi().alert('Foglio pronto. Se vuoi, scrivi nome e cognome degli invitati nella colonna "nome": le risposte verranno abbinate e chi non è in lista verrà segnalato.');
}

function generaLink() {
  const base = PropertiesService.getScriptProperties().getProperty('SITE_URL');
  if (!base) { SpreadsheetApp.getUi().alert('Imposta prima la proprietà SITE_URL dello script.'); return; }
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return;
  const data = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const used = new Set(data.map(r => r[COL.token - 1]).filter(String));
  data.forEach((r, i) => {
    if (!r[COL.nome - 1]) return;
    let t = r[COL.token - 1];
    if (!t) {
      do { t = Math.random().toString(36).slice(2, 8); } while (used.has(t));
      used.add(t);
      sh.getRange(i + 2, COL.token).setValue(t);
    }
    sh.getRange(i + 2, COL.link).setValue(base.replace(/\/?$/, '/') + '?g=' + t);
  });
}

// ---------- API per il sito ----------
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';
  if (action === 'stats') return json_(stats_());
  return json_({ ok: false, error: 'azione sconosciuta' });
}

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'richiesta non valida' }); }
  try {
    // le letture non si mettono in coda: con tante persone insieme rallentavano tutti
    if (data.action === 'classifica') return json_(classifica_(data));
    if (data.action === 'iban') return json_(iban_(data));
    if (data.action !== 'rsvp' && data.action !== 'score') return json_({ ok: false, error: 'azione sconosciuta' });

    // le scritture una alla volta, per non sovrascriversi; se la coda è lunga il sito riprova
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) return json_({ ok: false, error: 'occupato', retry: true });
    try {
      return json_(data.action === 'rsvp' ? rsvp_(data) : score_(data));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // qualsiasi errore torna come risposta leggibile dal sito, che così può riprovare
    return json_({ ok: false, error: 'errore temporaneo', retry: true });
  }
}

function rsvp_(d) {
  const risposta = d.risposta === 'yes' ? 'Sì' : d.risposta === 'no' ? 'No' : '';
  if (!risposta) return { ok: false, error: 'risposta mancante' };
  const row = findOrCreate_(d);
  if (!row) return { ok: false, error: 'nome e cognome mancanti' };
  const sh = sheet_();
  sh.getRange(row, COL.risposta).setValue(risposta);
  sh.getRange(row, COL.piu_uno).setValue(risposta === 'Sì' ? Number(d.plus) || 0 : '');
  sh.getRange(row, COL.allergie).setValue(risposta === 'Sì' ? clean_(d.allergie) : '');
  sh.getRange(row, COL.motivo_no).setValue(risposta === 'No' ? clean_(d.motivo) : '');
  sh.getRange(row, COL.nota).setValue(risposta === 'No' ? clean_(d.nota) : '');
  sh.getRange(row, COL.data_risposta).setValue(new Date());
  return { ok: true };
}

function score_(d) {
  const s = Math.floor(Number(d.score));
  if (!isFinite(s) || s < 0 || s > MAX_SCORE) return { ok: false, error: 'punteggio non valido' };
  const row = findOrCreate_(d);
  if (!row) return { ok: false, error: 'nome e cognome mancanti' };
  const sh = sheet_();
  const prev = Number(sh.getRange(row, COL.punteggio).getValue()) || 0;
  if (s > prev) {
    sh.getRange(row, COL.punteggio).setValue(s);
    sh.getRange(row, COL.data_punteggio).setValue(new Date());
  }
  return { ok: true, best: Math.max(s, prev) };
}

function iban_(d) {
  const row = findRow_(d);
  if (!row || sheet_().getRange(row, COL.risposta).getValue() !== 'Sì') {
    return { ok: false, error: 'prima conferma la presenza' };
  }
  return { ok: true, iban: PropertiesService.getScriptProperties().getProperty('IBAN') || '' };
}

// Classifica del minigioco: i 10 migliori, mostrati come "Marco R." per non esporre i cognomi
function classifica_(d) {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return { ok: true, top: [] };
  const me = findRow_(d);
  const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues()
    .map((r, i) => ({ row: i + 2, nome: r[COL.nome - 1], p: Number(r[COL.punteggio - 1]) || 0, t: r[COL.data_punteggio - 1] }))
    .filter(r => r.nome && r.p > 0)
    .sort((a, b) => b.p - a.p || new Date(a.t) - new Date(b.t));   // a parità vince chi l'ha fatto prima
  return {
    ok: true,
    top: rows.slice(0, 10).map(r => ({ nome: shortName_(r.nome), punteggio: r.p, io: r.row === me }))
  };
}

function shortName_(nome) {
  const w = String(nome).trim().split(/\s+/);
  const first = w[0].charAt(0).toUpperCase() + w[0].slice(1).toLowerCase();
  return w.length > 1 ? first + ' ' + w[w.length - 1].charAt(0).toUpperCase() + '.' : first;
}

function stats_() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return { ok: true, yes: 0, totale: 0, record: 0 };
  const data = sh.getRange(2, 1, last - 1, HEADERS.length).getValues().filter(r => r[COL.nome - 1]);
  return {
    ok: true,
    yes: data.filter(r => r[COL.risposta - 1] === 'Sì').length,
    totale: data.length,
    record: data.reduce((m, r) => Math.max(m, Number(r[COL.punteggio - 1]) || 0), 0)
  };
}

// ---------- Utilità ----------
function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    // se "Prepara il foglio" non è ancora stato usato, crea almeno il foglio con le intestazioni
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  } else if (!sh.getRange(1, COL.controllo).getValue()) {
    // fogli preparati con una versione precedente: aggiunge l'ultima intestazione
    sh.getRange(1, COL.controllo).setValue('controllo').setFontWeight('bold');
  }
  return sh;
}

// Trova l'ospite: prima col codice del link, poi col nome (per chi è arrivato senza link personale)
function findRow_(d) {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const data = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const token = clean_(d.token);
  const nome = nameKey_(d.nome);
  if (token) {
    const i = data.findIndex(r => String(r[COL.token - 1]) === token);
    if (i >= 0) return i + 2;
  }
  if (nome) {
    const i = data.findIndex(r => nameKey_(r[COL.nome - 1]) === nome);
    if (i >= 0) return i + 2;
  }
  return 0;
}

// "  Rossi  Màrco " e "marco rossi" diventano la stessa chiave: niente accenti, maiuscole o ordine delle parole
function nameKey_(v) {
  return String(v == null ? '' : v)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z' ]/g, ' ')
    .split(/\s+/).filter(String).sort().join(' ');
}

function findOrCreate_(d) {
  const row = findRow_(d);
  if (row) return row;
  const nome = clean_(d.nome);
  // un codice sconosciuto senza nome, o un nome di una parola sola, non crea righe
  if (nameKey_(nome).split(' ').filter(w => w.length >= 2).length < 2) return 0;
  if (BLOCKED.map(nameKey_).includes(nameKey_(nome))) return 0;
  const sh = sheet_();
  // se hai scritto una lista di invitati (righe senza "controllo"), chi non c'è viene segnalato
  const last = sh.getLastRow();
  const hasList = last >= 2 && sh.getRange(2, 1, last - 1, HEADERS.length).getValues()
    .some(r => r[COL.nome - 1] && !r[COL.controllo - 1]);
  const row_ = new Array(HEADERS.length).fill('');
  row_[COL.nome - 1] = nome;
  row_[COL.controllo - 1] = hasList ? NON_IN_LISTA : DAL_SITO;
  sh.appendRow(row_);
  return sh.getLastRow();
}

function clean_(v) {
  // il prefisso ' impedisce che il testo venga interpretato come formula
  const s = String(v == null ? '' : v).trim().slice(0, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
