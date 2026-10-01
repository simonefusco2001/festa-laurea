// Tutti i dati dell'evento in un posto solo: cambia qui, il sito si aggiorna.
// I valori tra [parentesi quadre] sono segnaposto da sostituire.
window.FESTA = {
  nome: 'Simone',
  corso: '[Corso di laurea]',
  dataISO: '2026-10-31T19:00:00',
  dataLabel: 'Sabato 31 ottobre',
  ora: '19:00',
  scadenzaRisposte: '23 ottobre',
  invitatiTotali: 36,
  location: {
    nome: 'Casale Valle Palomba',
    indirizzo: 'Via Nettunense, 00042 Anzio (RM)',
    // testo cercato su Google Maps: indirizzo o nome del posto
    mapQuery: 'Casale Valle Palomba, Via Nettunense, Anzio',
    comeArrivare: 'In auto lungo la Via Nettunense: segui la mappa qui sotto. Organizzatevi con i passaggi, e rileggete la FAQ sul bere.'
  },
  // URL dell'Apps Script pubblicato (vedi il passo "Sheet + script").
  // Vuoto = modalità demo: le risposte restano solo nel tuo browser.
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyR3BMJ8pquToaXrNV1Eaxb5Gi9b8ny6okLg9ldNDdnwsL5TMmFJNF9SlCt0rNmRUGl/exec',
  // Usato solo in modalità demo
  confermatiDemo: 23,
  ibanDemo: 'IT00 X000 0000 0000 0000 0000 000'
};
