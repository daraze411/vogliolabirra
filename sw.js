/* ==========================================================
   BEER ORACLE — service worker
   - Funziona offline dopo la prima visita.
   - Ogni file viene preso prima dalla rete, così pagina, grafica e testi sono
     sempre aggiornati e coerenti tra loro; senza connessione si usa la copia salvata.
   - Una nuova versione si attiva da sola alla prima apertura dell'app.

   Dopo una modifica conviene aumentare VERSIONE qui sotto: così anche la copia
   per l'uso offline viene rinnovata subito.
   ========================================================== */

const VERSIONE = "2026-11-05-2";
const CACHE = "beer-oracle-" + VERSIONE;

const FILE = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "data/risposte.json",
  "manifest.webmanifest",
  "icons/boccale.svg",
  "icons/favicon.png",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "fonts/Poppins-Bold.woff",
  "fonts/Poppins-Medium.woff",
  "fonts/Lora-Variable.woff"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) =>
      // cache: "reload" evita di salvare copie vecchie dalla cache HTTP del browser
      cache.addAll(FILE.map((f) => new Request(f, { cache: "reload" })))
    ).then(() => self.skipWaiting()) // la nuova versione non aspetta: si attiva subito
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(
        nomi.filter((n) => n.startsWith("beer-oracle-") && n !== CACHE).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== "GET") return;
  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return;

  evento.respondWith(primaLaRete(richiesta));
});

async function primaLaRete(richiesta) {
  const cache = await caches.open(CACHE);
  try {
    const risposta = await conTimeout(fetch(richiesta, { cache: "no-cache" }), 4000);
    if (risposta && risposta.ok) cache.put(chiave(richiesta), risposta.clone());
    return risposta;
  } catch (e) {
    const salvata = await cache.match(chiave(richiesta), { ignoreSearch: true });
    if (salvata) return salvata;
    if (richiesta.mode === "navigate") {
      const pagina = await cache.match("index.html");
      if (pagina) return pagina;
    }
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}


// Le navigazioni verso la pagina principale condividono la stessa voce in cache
function chiave(richiesta) {
  return richiesta.mode === "navigate" ? new Request("./") : richiesta;
}

function conTimeout(promessa, ms) {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error("timeout")), ms);
    promessa.then((r) => { clearTimeout(t); ok(r); }, (e) => { clearTimeout(t); ko(e); });
  });
}
