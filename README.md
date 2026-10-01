# Festa di laurea, invito online

Landing page per invitare alla festa di laurea, con RSVP, minigioco a premi e pagina regali.
HTML, CSS e JavaScript puro, pubblicata gratis con GitHub Pages. Le risposte finiscono in un Google Sheet.

## Struttura

| File | Cosa fa |
|---|---|
| `index.html` | Biglietto d'ingresso, minigioco, invito, RSVP |
| `regali.html` | Lista regali e IBAN (mostrato solo a chi ha detto sì) |
| `js/config.js` | **Tutti i dati dell'evento**: nome, data, location, URL dello script |
| `js/game.js` | Minigioco "La corsa alla laurea" |
| `apps-script/Code.gs` | Backend da incollare nel Google Sheet |

## Configurare Google Sheet (una volta sola)

1. Crea un nuovo Google Sheet, ad esempio "Festa di laurea".
2. Apri **Estensioni → Apps Script**, cancella il codice presente e incolla tutto `apps-script/Code.gs`. Salva.
3. In Apps Script apri **Impostazioni progetto (ingranaggio) → Proprietà script** e aggiungi:
   - `IBAN` → il tuo IBAN
   - `SITE_URL` → l'indirizzo del sito GitHub Pages
4. Clicca **Esegui il deployment → Nuovo deployment → Tipo: App web**.
   - Esegui come: **Me**
   - Chi ha accesso: **Chiunque**
   - Autorizza quando richiesto, poi copia l'**URL dell'app web**.
5. Incolla l'URL in `js/config.js` alla voce `appsScriptUrl`.
6. Ricarica il foglio: compare il menu **🎓 Festa**. Clicca **Prepara il foglio**.
7. Scrivi i nomi degli invitati nella colonna `nome`, poi **🎓 Festa → Genera i link degli invitati**.
   Nella colonna `link` trovi il link personale da mandare a ciascuno su WhatsApp.

Chi ha la colonna `risposta` vuota non ha ancora risposto. La colonna `punteggio` contiene il miglior punteggio del minigioco.

> Se modifichi `Code.gs`, fai **Gestisci deployment → Modifica → Nuova versione**, altrimenti il sito continua a usare la versione vecchia.

## Provarlo in locale

```bash
python -m http.server 5180
```

Poi apri http://localhost:5180. Con `appsScriptUrl` vuoto il sito funziona in **modalità demo**: le risposte restano solo nel browser.
