// Tutti i dati dell'evento in un posto solo: cambia qui, il sito si aggiorna.
// I valori tra [parentesi quadre] sono segnaposto da sostituire.
window.FESTA = {
  nome: 'Simone',
  corso: '[Corso di laurea]',
  dataISO: '2026-12-12T20:00:00',
  dataLabel: 'Sabato 12 dicembre',
  ora: '20:00',
  scadenzaRisposte: '15 novembre',
  invitatiTotali: 32,
  location: {
    nome: '[Nome location]',
    indirizzo: '[Via Roma 1, Milano]',
    // testo cercato su Google Maps: indirizzo o nome del posto
    mapQuery: 'Duomo di Milano',
    comeArrivare: '[Metro, parcheggio, ecc.]'
  },
  // URL dell'Apps Script pubblicato (vedi il passo "Sheet + script").
  // Vuoto = modalità demo: le risposte restano solo nel tuo browser.
  appsScriptUrl: '',
  // Usato solo in modalità demo
  confermatiDemo: 23,
  ibanDemo: 'IT00 X000 0000 0000 0000 0000 000'
};
