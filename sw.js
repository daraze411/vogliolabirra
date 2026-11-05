/* ==========================================================
   BEER ORACLE — service worker
   - Funziona offline dopo la prima visita.
   - La pagina e l'archivio delle risposte vengono presi prima dalla rete
     (così gli aggiornamenti arrivano subito) e, senza connessione, dalla cache.
   - Grafica, script e font vengono presi dalla cache.

   QUANDO MODIFICHI HTML, CSS, JS, ICONE O FONT: aumenta VERSIONE qui sotto.
   Se modifichi solo data/risposte.json non serve toccare nulla.
   ========================================================== */

const VERSIONE = "2026-11-05-1";
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

// Risorse sempre cercate prima in rete
const PRIMA_LA_RETE = [/\/$/, /index\.html$/, /risposte\.json$/, /manifest\.webmanifest$/];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) =>
      // cache: "reload" evita di salvare copie vecchie dalla cache HTTP del browser
      cache.addAll(FILE.map((f) => new Request(f, { cache: "reload" })))
    )
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

// La pagina chiede di attivare subito la nuova versione (pulsante "Aggiorna")
self.addEventListener("message", (evento) => {
  if (evento.data && evento.data.tipo === "SALTA_ATTESA") self.skipWaiting();
});

self.addEventListener("fetch", (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== "GET") return;
  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return;

  const reteFirst = richiesta.mode === "navigate" || PRIMA_LA_RETE.some((r) => r.test(url.pathname));
  evento.respondWith(reteFirst ? primaLaRete(richiesta) : primaLaCache(richiesta));
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

async function primaLaCache(richiesta) {
  const cache = await caches.open(CACHE);
  const salvata = await cache.match(richiesta, { ignoreSearch: true });
  if (salvata) return salvata;
  try {
    const risposta = await fetch(richiesta);
    if (risposta && risposta.ok) cache.put(richiesta, risposta.clone());
    return risposta;
  } catch (e) {
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
