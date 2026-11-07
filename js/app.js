/* ==========================================================
   BEER ORACLE — logica dell'app
   Nessun server, nessun tracciamento: solo un oracolo inutile.
   ========================================================== */
(function () {
  "use strict";

  /* ---------- Impostazioni ---------- */
  var ARCHIVIO = "data/risposte.json";
  // Stati mostrati se il file dell'archivio non specifica "statiVisibili"
  var STATI_VISIBILI_PREDEFINITI = ["Attiva", "Nuova", ""];
  var EMOJI = { A: "🍻", B: "🍺" };
  var INDIRIZZO = new URL("./", location.href).href;

  /* ---------- Stato ---------- */
  var domande = {};   // { A: { domanda, risposte: [testo...] }, B: {...} }
  var ultimo = {};    // mazzo di ogni sezione, se il browser non può salvarlo
  var corrente = {};  // testo della risposta attualmente mostrata
  var immagine = null; // Promise<Blob> dell'immagine pronta da condividere

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Caricamento archivio ---------- */

  function caricaArchivio() {
    return fetch(ARCHIVIO, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (dati) {
        var visibili = Array.isArray(dati.statiVisibili) ? dati.statiVisibili : STATI_VISIBILI_PREDEFINITI;
        var normalizza = function (s) { return String(s == null ? "" : s).trim().toLowerCase(); };
        var ammessi = visibili.map(normalizza);

        dati.domande.forEach(function (d) {
          var risposte = d.risposte
            .filter(function (r) { return ammessi.indexOf(normalizza(r.stato)) !== -1; })
            .map(function (r) { return r.testo; })               // testo esattamente come nell'archivio
            .filter(function (t) { return typeof t === "string" && t.trim() !== ""; });
          domande[d.id] = { domanda: d.domanda, risposte: risposte };

          var titolo = $("#domanda-" + d.id);
          if (titolo && d.domanda) titolo.textContent = d.domanda;
        });

        $$("[data-interroga]").forEach(function (b) {
          var d = domande[b.getAttribute("data-interroga")];
          b.disabled = !(d && d.risposte.length);
        });
      })
      .catch(function () {
        $$(".risposta").forEach(function (box) {
          box.innerHTML = "";
          var p = document.createElement("p");
          p.className = "risposta-attesa";
          p.textContent = "Il Mastro Birraio non trova l'archivio. Probabilmente l'ha usato come sottobicchiere. Riprova con la connessione attiva.";
          box.appendChild(p);
        });
      });
  }

  /* ---------- Estrazione ---------- */

  /* Estrazione "a mazzo di carte": ogni risposta esce una sola volta finché non sono
     uscite tutte, poi si rimescola. Il telefono ricorda quali sono già uscite (anche nei
     giorni successivi). Le risposte nuove nell'archivio entrano subito nel mazzo, quelle
     tolte spariscono. Se il browser non può salvare, il mazzo vale solo per la visita. */
  var CHIAVE_MAZZO = "beer-oracle-mazzo-";

  function leggiMazzo(id) {
    try {
      var m = JSON.parse(localStorage.getItem(CHIAVE_MAZZO + id));
      if (m && Array.isArray(m.visti)) return m;
    } catch (e) { /* memoria non disponibile */ }
    return ultimo[id] || { visti: [], ultima: null };
  }

  function salvaMazzo(id, mazzo) {
    ultimo[id] = mazzo;
    try { localStorage.setItem(CHIAVE_MAZZO + id, JSON.stringify(mazzo)); } catch (e) { /* pazienza */ }
  }

  function estrai(id) {
    var elenco = domande[id].risposte;
    if (elenco.length === 1) return 0;
    var mazzo = leggiMazzo(id);
    var visti = {};
    mazzo.visti.forEach(function (t) { visti[t] = true; });

    var candidate = [];
    elenco.forEach(function (t, i) { if (!visti[t]) candidate.push(i); });
    if (!candidate.length) {
      // mazzo finito: si rimescola, ma senza ripetere subito l'ultima uscita
      mazzo.visti = [];
      elenco.forEach(function (t, i) { if (t !== mazzo.ultima) candidate.push(i); });
    }

    var i = candidate[Math.floor(Math.random() * candidate.length)];
    var giaVisti = mazzo.visti.filter(function (t) { return elenco.indexOf(t) !== -1; }); // dimentica le risposte tolte
    giaVisti.push(elenco[i]);
    salvaMazzo(id, { visti: giaVisti, ultima: elenco[i] });
    return i;
  }

  // Inserisce il testo così com'è; gli indirizzi web diventano cliccabili senza alterare il testo.
  function riempi(elemento, testo) {
    var url = /(https?:\/\/[^\s)]+)/g;
    var pos = 0, m;
    while ((m = url.exec(testo))) {
      if (m.index > pos) elemento.appendChild(document.createTextNode(testo.slice(pos, m.index)));
      var a = document.createElement("a");
      a.href = m[1];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = m[1];
      elemento.appendChild(a);
      pos = m.index + m[1].length;
    }
    if (pos < testo.length) elemento.appendChild(document.createTextNode(testo.slice(pos)));
  }

  // Sullo smartphone riduce il carattere delle risposte lunghe finché stanno nel riquadro
  var SMARTPHONE = window.matchMedia("(max-width: 819px)");
  var MINIMO = 13;

  function adatta(box) {
    var p = box.querySelector(".risposta-testo");
    if (!p) return;
    p.style.fontSize = "";
    if (!SMARTPHONE.matches) return;
    var stile = getComputedStyle(box);
    var spazio = box.clientHeight - parseFloat(stile.paddingTop) - parseFloat(stile.paddingBottom);
    var dim = parseFloat(getComputedStyle(p).fontSize);
    while (p.offsetHeight > spazio && dim > MINIMO) {
      dim = Math.max(MINIMO, Math.floor(dim - 1));
      p.style.fontSize = dim + "px";
    }
  }

  function adattaTutte() { $$(".risposta").forEach(adatta); }

  function interroga(id, pulsante) {
    var i = estrai(id);
    corrente[id] = domande[id].risposte[i];

    var box = $('.riquadro[data-domanda="' + id + '"] .risposta');
    box.innerHTML = "";
    var p = document.createElement("p");
    p.className = "risposta-testo appare";
    riempi(p, corrente[id]);
    box.appendChild(p);
    adatta(box);

    pulsante.classList.remove("scuote");
    void pulsante.offsetWidth; // riavvia l'animazione
    pulsante.classList.add("scuote");

    aggiornaCondivisione();
  }

  /* ---------- Condivisione ---------- */

  function entrambe() { return Boolean(corrente.A && corrente.B); }

  function aggiornaCondivisione() {
    var pronto = entrambe();
    $("#condividi").disabled = !pronto;
    $("#condividi-nota").textContent = pronto
      ? "Il Mastro Birraio ha parlato. Ora fallo sapere al mondo (il mondo non ha chiesto)."
      : "Interroga il Mastro Birraio su entrambe le domande per sbloccare la condivisione.";
    // prepara l'immagine in anticipo: così il menu di condivisione si apre subito
    immagine = pronto ? creaImmagine() : null;
  }

  function testoCondivisione() {
    return "🍺 BEER ORACLE 🍺\nIL MASTRO BIRRAIO HA PARLATO\n\n" +
      EMOJI.A + " " + domande.A.domanda + "\n» " + corrente.A + "\n\n" +
      EMOJI.B + " " + domande.B.domanda + "\n» " + corrente.B + "\n\n" +
      "Interroga anche tu il Mastro Birraio: " + INDIRIZZO + "\n" +
      "(Satira. Nessun consiglio reale: bevi responsabilmente.)";
  }

  function condividi() {
    if (!entrambe()) return;
    var pulsante = $("#condividi");
    pulsante.disabled = true;

    (immagine || creaImmagine())
      .then(function (blob) {
        var file = new File([blob], "beer-oracle.png", { type: "image/png" });
        var dati = { files: [file], title: "Beer Oracle", text: "Il Mastro Birraio ha parlato 🍺 " + INDIRIZZO };
        if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
          return navigator.share(dati).catch(function (err) {
            if (err && err.name === "AbortError") return; // l'utente ha chiuso il menu
            apriFinestra(blob);
          });
        }
        apriFinestra(blob);
      })
      .catch(function () { apriFinestra(null); })
      .then(function () { pulsante.disabled = !entrambe(); });
  }

  var urlAnteprima = null;

  function apriFinestra(blob) {
    var finestra = $("#finestra-condividi");
    var salva = $("#salva-immagine");
    var anteprima = $("#anteprima");
    $("#finestra-stato").textContent = "";

    if (urlAnteprima) URL.revokeObjectURL(urlAnteprima);
    if (blob) {
      urlAnteprima = URL.createObjectURL(blob);
      anteprima.src = urlAnteprima;
      anteprima.hidden = false;
      salva.href = urlAnteprima;
      salva.hidden = false;
    } else {
      anteprima.hidden = true;
      salva.hidden = true;
    }
    $("#condividi-testo").hidden = !navigator.share;

    if (typeof finestra.showModal === "function") finestra.showModal();
    else finestra.setAttribute("open", "");
  }

  function chiudiFinestra() {
    var finestra = $("#finestra-condividi");
    if (typeof finestra.close === "function") finestra.close();
    else finestra.removeAttribute("open");
  }

  function copiaTesto() {
    var testo = testoCondivisione();
    var stato = $("#finestra-stato");
    var ok = function () { stato.textContent = "Testo copiato. Incollalo dove fa più danni."; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(testo).then(ok, function () { copiaVecchioStile(testo) ? ok() : (stato.textContent = "Copia non riuscita."); });
    } else {
      copiaVecchioStile(testo) ? ok() : (stato.textContent = "Copia non riuscita.");
    }
  }

  function copiaVecchioStile(testo) {
    var t = document.createElement("textarea");
    t.value = testo;
    t.setAttribute("readonly", "");
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(t);
    return ok;
  }

  function condividiTesto() {
    if (!navigator.share) return;
    navigator.share({ title: "Beer Oracle", text: testoCondivisione() }).catch(function () {});
  }

  /* ---------- Immagine PNG ---------- */

  var C = {
    larghezza: 1080,
    margine: 60,
    crema: "#FFF6DE",
    bianco: "#FFFDF6",
    oro: "#F2B705",
    oroChiaro: "#FFD24D",
    ambra: "#E08A00",
    marrone: "#3B2210",
    marroneMedio: "#6B4423",
    ui: '"Poppins", system-ui, sans-serif',
    oracolo: '"Lora", Georgia, serif'
  };

  var boccale = null;
  function caricaBoccale() {
    if (boccale) return boccale;
    boccale = new Promise(function (ok) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { ok(null); };
      img.src = "icons/boccale.svg";
    });
    return boccale;
  }

  function caricaFont() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 40px "Poppins"'),
      document.fonts.load('500 26px "Poppins"'),
      document.fonts.load('700 50px "Lora"')
    ]).catch(function () {});
  }

  // Divide un testo in righe che stanno nella larghezza data (rispetta gli a capo originali)
  function righe(ctx, testo, max) {
    var out = [];
    String(testo).split("\n").forEach(function (paragrafo) {
      if (paragrafo === "") { out.push(""); return; }
      var parole = paragrafo.split(" ");
      var riga = "";
      parole.forEach(function (parola) {
        var prova = riga ? riga + " " + parola : parola;
        if (ctx.measureText(prova).width <= max) { riga = prova; return; }
        if (riga) out.push(riga);
        // parola troppo lunga (es. un indirizzo web): la spezza
        while (ctx.measureText(parola).width > max) {
          var n = parola.length;
          while (n > 1 && ctx.measureText(parola.slice(0, n)).width > max) n--;
          out.push(parola.slice(0, n));
          parola = parola.slice(n);
        }
        riga = parola;
      });
      out.push(riga);
    });
    return out;
  }

  function rettangoloTondo(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Calcola il layout di un riquadro domanda/risposta
  function misuraRiquadro(ctx, id) {
    var interno = C.larghezza - C.margine * 2 - 48 * 2;
    ctx.font = "700 40px " + C.ui;
    var rDomanda = righe(ctx, EMOJI[id] + " " + domande[id].domanda, interno);

    // risposte molto lunghe: carattere un po' più piccolo, mai illeggibile
    var dim = 52;
    var rRisposta;
    do {
      ctx.font = "700 " + dim + "px " + C.oracolo;
      rRisposta = righe(ctx, corrente[id], interno);
      if (rRisposta.length <= 7 || dim <= 40) break;
      dim -= 4;
    } while (true);

    var lhD = 52, lhR = Math.round(dim * 1.3);
    var altezza = 40 + 40 /*etichetta*/ + 22 + rDomanda.length * lhD + 26 /*separatore*/ + 30 + rRisposta.length * lhR + 44;
    return { id: id, rDomanda: rDomanda, rRisposta: rRisposta, dim: dim, lhD: lhD, lhR: lhR, altezza: altezza, interno: interno };
  }

  function disegnaRiquadro(ctx, m, y) {
    var x = C.margine, w = C.larghezza - C.margine * 2;
    // ombra piena e riquadro
    rettangoloTondo(ctx, x + 10, y + 10, w, m.altezza, 36);
    ctx.fillStyle = C.marrone; ctx.fill();
    rettangoloTondo(ctx, x, y, w, m.altezza, 36);
    ctx.fillStyle = C.bianco; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = C.marrone; ctx.stroke();

    var cx = x + 48, cy = y + 40;
    // etichetta
    ctx.font = "700 22px " + C.ui;
    var testoEt = "DOMANDA " + m.id;
    var wEt = ctx.measureText(testoEt).width + 36;
    rettangoloTondo(ctx, cx, cy, wEt, 40, 20);
    ctx.fillStyle = C.marrone; ctx.fill();
    ctx.fillStyle = C.oroChiaro;
    ctx.textBaseline = "middle";
    ctx.fillText(testoEt, cx + 18, cy + 21);
    cy += 40 + 22;

    // domanda
    ctx.textBaseline = "top";
    ctx.font = "700 40px " + C.ui;
    ctx.fillStyle = C.marrone;
    m.rDomanda.forEach(function (r) { ctx.fillText(r, cx, cy); cy += m.lhD; });

    // separatore tratteggiato
    cy += 10;
    ctx.save();
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ambra;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + m.interno, cy); ctx.stroke();
    ctx.restore();
    cy += 16 + 30;

    // risposta
    ctx.font = "700 " + m.dim + "px " + C.oracolo;
    ctx.fillStyle = C.marrone;
    m.rRisposta.forEach(function (r) { ctx.fillText(r, cx, cy); cy += m.lhR; });
  }

  function creaImmagine() {
    return Promise.all([caricaFont(), caricaBoccale()]).then(function (ris) {
      var img = ris[1];
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      var W = C.larghezza;

      // --- misure ---
      var mA = misuraRiquadro(ctx, "A");
      var mB = misuraRiquadro(ctx, "B");
      ctx.font = "500 26px " + C.ui;
      var rAvv = righe(ctx, "Satira pura: risposte estratte a caso, non sono consigli sul consumo di alcol. Bevi responsabilmente.", W - C.margine * 2 - 40);

      var hTestata = 420;
      var hPiede = 40 + rAvv.length * 38 + 20 + 40 + 50;
      var H = hTestata + 56 + mA.altezza + 46 + mB.altezza + 40 + hPiede;

      canvas.width = W;
      canvas.height = H;
      ctx = canvas.getContext("2d");

      // --- sfondo ---
      ctx.fillStyle = C.crema;
      ctx.fillRect(0, 0, W, H);
      // --- testata ---
      ctx.fillStyle = C.oro;
      ctx.fillRect(0, 0, W, hTestata);
      // schiuma sul bordo
      ctx.fillStyle = C.crema;
      for (var sx = 18; sx < W + 30; sx += 44) {
        ctx.beginPath(); ctx.arc(sx, hTestata, 16, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillRect(0, hTestata, W, 4);

      var yT = 44;
      if (img) {
        var hB = 120, wB = hB * 128 / 140;
        ctx.drawImage(img, (W - wB) / 2, yT, wB, hB);
      }
      yT += 132;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = "700 108px " + C.ui;
      ctx.fillStyle = C.crema;
      ctx.fillText("BEER ORACLE", W / 2 + 5, yT + 5);
      ctx.fillStyle = C.marrone;
      ctx.fillText("BEER ORACLE", W / 2, yT);
      yT += 132;

      // nastrino "IL MASTRO BIRRAIO HA PARLATO"
      ctx.font = "700 30px " + C.ui;
      var nastro = "IL MASTRO BIRRAIO HA PARLATO";
      var wN = ctx.measureText(nastro).width + 64;
      rettangoloTondo(ctx, (W - wN) / 2, yT, wN, 60, 30);
      ctx.fillStyle = C.marrone; ctx.fill();
      ctx.fillStyle = C.oroChiaro;
      ctx.textBaseline = "middle";
      ctx.fillText(nastro, W / 2, yT + 31);
      ctx.textAlign = "left";

      // --- riquadri ---
      var y = hTestata + 56;
      disegnaRiquadro(ctx, mA, y);
      y += mA.altezza + 46;
      disegnaRiquadro(ctx, mB, y);
      y += mB.altezza + 40 + 40;

      // --- piede ---
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = "500 26px " + C.ui;
      ctx.fillStyle = C.marroneMedio;
      rAvv.forEach(function (r) { ctx.fillText(r, W / 2, y); y += 38; });
      y += 20;
      ctx.font = "700 28px " + C.ui;
      ctx.fillStyle = C.marrone;
      ctx.fillText(INDIRIZZO.replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, y);

      return new Promise(function (ok, ko) {
        canvas.toBlob(function (b) { b ? ok(b) : ko(new Error("PNG non creato")); }, "image/png");
      });
    });
  }

  /* ---------- Aggiornamenti (service worker) ---------- */

  function registraServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    // se c'era già una versione installata, quando subentra quella nuova la pagina si ricarica da sola
    var cera = Boolean(navigator.serviceWorker.controller);
    var ricaricato = false;

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!cera || ricaricato) return;
      ricaricato = true;
      location.reload();
    });

    navigator.serviceWorker.register("sw.js").then(function (reg) {
      // controlla se c'è una versione nuova ogni volta che l'app torna in primo piano
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") reg.update().catch(function () {});
      });
    }).catch(function () {});
  }

  /* ---------- Avvio ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    $$("[data-interroga]").forEach(function (b) {
      b.addEventListener("click", function () { interroga(b.getAttribute("data-interroga"), b); });
    });
    $("#condividi").addEventListener("click", condividi);
    $("#chiudi-finestra").addEventListener("click", chiudiFinestra);
    $("#copia-testo").addEventListener("click", copiaTesto);
    $("#condividi-testo").addEventListener("click", condividiTesto);
    $("#finestra-condividi").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) chiudiFinestra(); // clic sullo sfondo
    });

    var attesa;
    window.addEventListener("resize", function () {
      clearTimeout(attesa);
      attesa = setTimeout(adattaTutte, 120);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(adattaTutte);

    caricaArchivio();
    caricaFont();
    caricaBoccale();
    registraServiceWorker();
  });
})();
