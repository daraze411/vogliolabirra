# 🍺 BEER ORACLE 🍺

Il Mastro Birraio risponde alle domande che contano davvero. Oracolo satirico, totalmente inutile, potenzialmente esilarante.

Indirizzo pubblico: https://daraze411.github.io/vogliolabirra/

---

## Pubblicazione su GitHub Pages

1. Apri il repository https://github.com/daraze411/vogliolabirra
2. Carica **tutto il contenuto** di questa cartella nella radice del repository (Add file → Upload files), mantenendo le sottocartelle. `index.html` deve trovarsi nella radice, non dentro un'altra cartella.
3. Conferma con **Commit changes**.
4. Vai in **Settings → Pages**: in *Build and deployment* scegli *Deploy from a branch*, branch `main`, cartella `/ (root)`, poi **Save**.
5. Dopo 1-2 minuti l'app è online all'indirizzo pubblico.

## Installazione su Android

Apri l'indirizzo con Chrome, poi menu ⋮ → **Installa app** (o *Aggiungi a schermata Home*). L'app si apre a tutto schermo, senza barra degli indirizzi, e funziona anche senza connessione dopo la prima apertura.

## Aggiornare le risposte

L'archivio vive nel file Excel (un foglio per domanda, colonne *Risposta* e *Stato*, domanda nella cella A2).

1. Apri https://daraze411.github.io/vogliolabirra/strumenti/aggiorna-archivio.html
2. Scegli il file Excel: la pagina mostra quante risposte ci sono per ogni stato.
3. Scarica il nuovo `risposte.json` e caricalo nella cartella `data/` del repository, sostituendo il vecchio.

Non serve toccare altro: l'app scarica sempre l'archivio più recente quando è online.

**Stati:** `Attiva`, `Nuova` e le righe senza stato vengono mostrate; `Da rivedere` ed `Escludere` restano nell'archivio ma non escono mai. I testi vengono mostrati esattamente come scritti, errori voluti compresi. Unica eccezione: il convertitore trasforma sempre «Birrario» in «Birraio».

## Modificare grafica o codice

Dopo aver cambiato HTML, CSS, JavaScript, icone o font, apri `sw.js` e aumenta il valore di `VERSIONE` (es. da `2026-11-05-2` a `2026-11-05-3`). Chi ha l'app installata riceve la nuova versione da solo alla prima apertura con la connessione attiva.

## Struttura

```
index.html                 pagina principale
css/style.css              grafica
js/app.js                  estrazione, condivisione, immagine PNG, aggiornamenti
data/risposte.json         archivio delle risposte
sw.js                      service worker (offline e aggiornamenti)
manifest.webmanifest       configurazione dell'app installabile
icons/                     icone e boccale illustrato
fonts/                     Poppins e Lora (licenza SIL OFL, vedi fonts/OFL.txt)
strumenti/aggiorna-archivio.html   convertitore Excel → risposte.json
```

Nessun server, nessun database, nessuna pubblicità, nessun tracciamento: anche i font sono inclusi nel progetto, quindi l'app non contatta servizi esterni.

---

*Avvertenza: Beer Oracle è satira. Le risposte non sono consigli sul consumo di alcol. Bevi responsabilmente.*
