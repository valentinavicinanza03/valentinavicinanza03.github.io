import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cartella, modelli, preparaModello, linkProdotto } from './modelli.js';

// la libreria: gli occhiali dei compagni, 3 per riga, che girano lentamente da destra a sinistra.
// Un solo renderer WebGL per tutti (il browser ne permette pochi): disegna un modello alla volta
// e copia l'immagine nel canvas della sua scheda.
// Clic su una cornice → si apre la pagina di quegli occhiali (prodotto.html).

const griglia = document.getElementById('libreria-griglia');
const velocita = 0.004; // radianti per fotogramma: un giro ogni ~26 secondi

// --- il renderer condiviso, fuori dalla pagina ---
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scena = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scena.add(new THREE.AmbientLight(0xffffff, 0.4));
const luce = new THREE.DirectionalLight(0xffffff, 1.4);
luce.position.set(3, 5, 4);
scena.add(luce);

const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
camera.position.set(0, 0.6, 4);
camera.lookAt(0, 0, 0);

// --- le schede ---
const schede = modelli.map(function (m) {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4 mb-4';
    col.innerHTML =
        '<div class="libreria-scheda">' +
            '<a class="libreria-visore" aria-label="Apri gli occhiali"><canvas></canvas><p class="libreria-carico">Caricamento…</p></a>' +
            '<p class="libreria-nome"></p>' +
        '</div>';
    col.querySelector('.libreria-nome').textContent = m.nome;
    col.querySelector('.libreria-visore').href = linkProdotto(m);   // clic → la pagina di questi occhiali
    griglia.appendChild(col);

    return {
        dati: m,
        col: col,
        visore: col.querySelector('.libreria-visore'),
        canvas: col.querySelector('canvas'),
        scritta: col.querySelector('.libreria-carico'),
        perno: null,       // il gruppo che gira, con dentro il modello
        scalaBase: 1,      // la grandezza normale del modello
        zoom: 1,           // 1 = normale, cresce un po' col cursore sopra
        giro: null,        // il giro veloce in corso: { da, a, inizio }
        sopra: false,      // il cursore è sopra la scheda?
        visibile: false,
        caricato: false
    };
});

// --- l'effetto col cursore: zoom leggero + un giro veloce che rallenta fino alla vista frontale ---
const zoomSopra = 1.15;     // quanto si ingrandisce
const durataGiro = 1800;    // millisecondi del giro veloce
const giroPieno = Math.PI * 2;

// parte veloce e rallenta dolcemente alla fine
function rallenta(t) {
    return 1 - Math.pow(1 - t, 4);
}

schede.forEach(function (scheda) {
    scheda.visore.addEventListener('mouseenter', function () {
        scheda.sopra = true;
        if (!scheda.perno) return;
        // la vista frontale è a rotazione 0 (o a un giro intero): andiamo alla prossima,
        // sempre da destra a sinistra, senza giri in più
        const ora = scheda.perno.rotation.y;
        const arrivo = Math.floor(ora / giroPieno) * giroPieno;
        scheda.giro = { da: ora, a: arrivo, inizio: performance.now() };
    });
    scheda.visore.addEventListener('mouseleave', function () {
        scheda.sopra = false;
        scheda.giro = null;   // riprende a girare piano da dove si trova
    });
});

// carica il modello, lo centra e lo porta sempre alla stessa grandezza
const loader = new GLTFLoader();
function carica(scheda) {
    if (scheda.caricato) return;
    scheda.caricato = true;

    loader.load(encodeURI(cartella + scheda.dati.file), function (gltf) {
        const perno = preparaModello(gltf, scheda.dati);
        perno.visible = false;
        scena.add(perno);

        scheda.scalaBase = perno.userData.scalaBase;
        scheda.perno = perno;
        scheda.scritta.remove();
    }, undefined, function () {
        scheda.scritta.textContent = 'Modello non disponibile';
    });
}

// carichiamo un modello solo quando la sua scheda sta per entrare nello schermo
const osservatore = new IntersectionObserver(function (voci) {
    voci.forEach(function (voce) {
        const scheda = schede.find(function (s) { return s.visore === voce.target; });
        scheda.visibile = voce.isIntersecting;
        if (voce.isIntersecting) carica(scheda);
    });
}, { rootMargin: '300px 0px' });
schede.forEach(function (s) { osservatore.observe(s.visore); });

// disegna una scheda: renderer → immagine → canvas della scheda
function disegna(scheda) {
    const w = scheda.visore.clientWidth;
    const h = scheda.visore.clientHeight;
    if (!w || !h) return;

    const pr = renderer.getPixelRatio();
    if (scheda.canvas.width !== w * pr || scheda.canvas.height !== h * pr) {
        scheda.canvas.width = w * pr;
        scheda.canvas.height = h * pr;
    }
    const dim = renderer.getSize(new THREE.Vector2());
    if (dim.x !== w || dim.y !== h) renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    scheda.perno.visible = true;
    renderer.render(scena, camera);
    scheda.perno.visible = false;

    const ctx = scheda.canvas.getContext('2d');
    ctx.clearRect(0, 0, scheda.canvas.width, scheda.canvas.height);
    ctx.drawImage(renderer.domElement, 0, 0, scheda.canvas.width, scheda.canvas.height);
}

function anima() {
    requestAnimationFrame(anima);
    const adesso = performance.now();
    schede.forEach(function (scheda) {
        if (!scheda.perno) return;

        if (scheda.giro) {
            // il giro veloce: dalla posizione di partenza alla vista frontale, rallentando
            const t = Math.min((adesso - scheda.giro.inizio) / durataGiro, 1);
            scheda.perno.rotation.y = scheda.giro.da + (scheda.giro.a - scheda.giro.da) * rallenta(t);
            // finito il giro resta fermo di fronte finché il cursore è sopra
        } else if (!scheda.sopra) {
            scheda.perno.rotation.y -= velocita;   // verso negativo = da destra a sinistra
        }

        // lo zoom arriva piano al valore voluto (e torna indietro quando il cursore esce)
        const zoomVoluto = scheda.sopra ? zoomSopra : 1;
        scheda.zoom += (zoomVoluto - scheda.zoom) * 0.1;
        scheda.perno.scale.setScalar(scheda.scalaBase * scheda.zoom);

        if (scheda.visibile) disegna(scheda);
    });

}

anima();
