# Configurazione tecnica

Istruzioni per far funzionare il sito con Google Sheet. Il README principale presenta il progetto; qui ci sono i passaggi da fare una volta sola.

## Google Sheet e Apps Script

1. Crea un Google Sheet e rinomina la prima scheda (la linguetta in basso) in **`Invitati`**.
2. Apri **Estensioni → Apps Script**, cancella il codice presente e incolla tutto [`apps-script/Code.gs`](../apps-script/Code.gs). Salva.
3. In Apps Script apri **Impostazioni progetto (ingranaggio) → Proprietà script** e aggiungi:
   - `IBAN` → l'IBAN mostrato nella pagina regali (solo a chi ha detto sì)
   - `SITE_URL` → `https://simonefusco2001.github.io/festa-laurea/`
4. Clicca **Esegui il deployment → Nuovo deployment → Tipo: App web**.
   - Esegui come: **Me**
   - Chi ha accesso: **Chiunque**
   - Autorizza quando richiesto, poi copia l'**URL dell'app web**.
5. Incolla l'URL in [`js/config.js`](../js/config.js) alla voce `appsScriptUrl`.
6. Ricarica il foglio: compare il menu **🎓 Festa**. Clicca **Prepara il foglio** (scrive le intestazioni in riga 1).

> Ogni volta che modifichi `Code.gs`: **Gestisci deployment → matita → Versione: Nuova versione → Esegui il deployment**. L'URL resta lo stesso.

## Come si legge il foglio

- Tutti ricevono lo stesso link e scrivono nome e cognome.
- Se nella colonna `nome` scrivi la lista degli invitati, ogni risposta viene abbinata alla riga giusta (maiuscole, accenti e ordine delle parole non contano). Chi ha `risposta` vuota non ha ancora risposto.
- I nomi che non sono nella lista finiscono in fondo con **⚠️ non in lista, da verificare** nella colonna `controllo`.
- La colonna `punteggio` contiene il miglior punteggio del minigioco: il più alto vince il premio.
- Facoltativo: **🎓 Festa → Genera i link degli invitati** crea un link personale per ogni nome della lista.

## Aggiornare il sito

- I dati dell'evento (nome, data, ora, location, scadenza) sono tutti in [`js/config.js`](../js/config.js).
- Dopo ogni modifica a CSS o JavaScript, aumenta il numero `?v=` nei link di `index.html` e `regali.html`, così i telefoni scaricano i file nuovi.
- GitHub Pages pubblica da solo ogni push sul branch `main` in 1-2 minuti.

## Provarlo in locale

```bash
python -m http.server 5180
```

Poi apri http://localhost:5180. Con `appsScriptUrl` vuoto il sito funziona in **modalità demo**: le risposte restano solo nel browser.
