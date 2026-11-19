// Pagina di regia degli occhiali di nuova-pagina.html: la stessa scena di quella pagina
// (occhiali valentinavicinanza.glb, luci, camera), più il pannello per scegliere le viste
// dell'animazione e copiarne il collegamento.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ===== 1. la scena, come in nuova-pagina.html =====
const visore = document.getElementById('visore');
const scena = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, visore.clientWidth / visore.clientHeight, 0.1, 100);
camera.position.set(0.2, 0.4, 4.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(visore.clientWidth, visore.clientHeight);
visore.prepend(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scena.add(new THREE.AmbientLight(0xffffff, 0.4));
const luce = new THREE.DirectionalLight(0xffffff, 1.4);
luce.position.set(3, 5, 4);
scena.add(luce);

// gli occhiali, puliti, centrati e larghi 2.6 come in nuova-pagina.html
const oggetto = new THREE.Group();
scena.add(oggetto);

new GLTFLoader().load('modelli_occhiali_glbxweb/valentinavicinanza.glb', function (gltf) {
    const modello = gltf.scene;

    const daTogliere = [];
    modello.traverse(function (parte) {
        const testa = parte.isMesh && (/^testa/i.test(parte.name) ||
            [].concat(parte.material).some(function (m) { return m && m.name === 'testa'; }));
        if (testa || parte.name === 'tavole' || parte.isLine || parte.isLineSegments || parte.isPoints) {
            daTogliere.push(parte);
        }
    });
    daTogliere.forEach(function (p) { if (p.parent) p.parent.remove(p); });
    modello.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(modello);
    const centro = box.getCenter(new THREE.Vector3());
    const dimensione = box.getSize(new THREE.Vector3());
    modello.position.sub(centro);
    oggetto.add(modello);
    oggetto.scale.setScalar(2.6 / (dimensione.x || 1));

    document.querySelector('.visore-segnaposto').style.display = 'none';
}, undefined, function (errore) {
    document.querySelector('.visore-segnaposto').textContent = 'Modello non disponibile';
    console.error('Non riesco a caricare valentinavicinanza.glb:', errore);
});

const controlli = new OrbitControls(camera, renderer.domElement);
controlli.enableDamping = true;

window.addEventListener('resize', function () {
    camera.aspect = visore.clientWidth / visore.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(visore.clientWidth, visore.clientHeight);
});


// ===== 2. l'animazione della camera: tre viste, la camera passa dall'una all'altra =====
// ogni vista ricorda dove sta la camera (posizione) e quale punto guarda (target).
// Partiamo dalle viste usate adesso in nuova-pagina.html
const viste = [
    { posizione: new THREE.Vector3(2.08, 1.216, 2.147),      target: new THREE.Vector3(0, 0, 0) },  // di tre quarti (arrivo dell'entrata)
    { posizione: new THREE.Vector3(-3.324, 2.094, -1.455),   target: new THREE.Vector3(0, 0, 0) },  // da dietro, dall'alto
    { posizione: new THREE.Vector3(0.146, 1.666, 3.567),     target: new THREE.Vector3(0, 0, 0) }   // di fronte, un po' dall'alto
];

const schedeVista = document.querySelectorAll('.vista');
const bottoneAvvia = document.querySelector('.btn-avvia');
const statoAnimazione = document.querySelector('.animazione-stato');
const campoMovimento = document.getElementById('tempo-movimento');
const campoFermo = document.getElementById('tempo-fermo');

const animazione = {
    attiva: false,       // true mentre la camera si muove da sola
    ciclo: false,        // true = va avanti all'infinito; false = un solo movimento (tasto "Vai")
    fase: 'movimento',   // 'movimento' oppure 'fermo'
    tempo: 0,            // secondi passati nella fase attuale
    prossima: 0,         // la vista verso cui stiamo andando
    da: { posizione: new THREE.Vector3(), target: new THREE.Vector3() } // da dove parte il movimento
};

function leggiTempo(campo, minimo) {
    const valore = parseFloat(campo.value);
    return isNaN(valore) ? minimo : Math.max(valore, minimo);
}

// la curva "morbida": parte piano, accelera e rallenta all'arrivo
function morbido(t) {
    return t * t * (3 - 2 * t);
}

function muoviVerso(indice) {
    animazione.da.posizione.copy(camera.position);
    animazione.da.target.copy(controlli.target);
    animazione.prossima = indice;
    animazione.fase = 'movimento';
    animazione.tempo = 0;
    animazione.attiva = true;
    evidenziaVista(indice);
}

function evidenziaVista(indice) {
    schedeVista.forEach(function (scheda, i) {
        scheda.classList.toggle('attiva', i === indice);
    });
}

function fermaAnimazione() {
    animazione.attiva = false;
    bottoneAvvia.textContent = 'Avvia';
    bottoneAvvia.classList.remove('selected');
    statoAnimazione.textContent = 'Animazione ferma';
    evidenziaVista(-1);
}

// sposta la camera tra due viste (t da 0 a 1) girando attorno al punto guardato,
// così non passa mai dentro gli occhiali
const sfericaDa = new THREE.Spherical();
const sfericaA = new THREE.Spherical();
const scarto = new THREE.Vector3();

function posizionaCamera(da, a, t) {
    controlli.target.lerpVectors(da.target, a.target, t);

    sfericaDa.setFromVector3(scarto.subVectors(da.posizione, da.target));
    sfericaA.setFromVector3(scarto.subVectors(a.posizione, a.target));

    // per il giro attorno prendiamo la strada più breve (mai più di mezzo giro)
    let differenza = sfericaA.theta - sfericaDa.theta;
    if (differenza > Math.PI) differenza -= Math.PI * 2;
    if (differenza < -Math.PI) differenza += Math.PI * 2;

    scarto.setFromSphericalCoords(
        sfericaDa.radius + (sfericaA.radius - sfericaDa.radius) * t,  // distanza
        sfericaDa.phi + (sfericaA.phi - sfericaDa.phi) * t,           // altezza
        sfericaDa.theta + differenza * t                              // giro attorno
    );
    camera.position.copy(controlli.target).add(scarto);
    camera.lookAt(controlli.target);
}

function aggiornaAnimazione(delta) {
    animazione.tempo += delta;
    const vista = viste[animazione.prossima];
    const numero = animazione.prossima + 1;

    if (animazione.fase === 'movimento') {
        const t = Math.min(animazione.tempo / leggiTempo(campoMovimento, 0.5), 1);
        posizionaCamera(animazione.da, vista, morbido(t));
        statoAnimazione.textContent = 'In movimento verso la Vista ' + numero;

        if (t >= 1) {
            if (!animazione.ciclo) {        // tasto "Vai": siamo arrivati, fine
                fermaAnimazione();
                return;
            }
            animazione.fase = 'fermo';
            animazione.tempo = 0;
        }
    } else {
        statoAnimazione.textContent = 'Fermo sulla Vista ' + numero;
        if (animazione.tempo >= leggiTempo(campoFermo, 0)) {
            muoviVerso((animazione.prossima + 1) % viste.length); // dalla 3 si torna alla 1
        }
    }
}

schedeVista.forEach(function (scheda, i) {
    // "Salva vista attuale": la vista ricorda l'inquadratura di adesso
    scheda.querySelector('.btn-salva-vista').addEventListener('click', function () {
        viste[i].posizione.copy(camera.position);
        viste[i].target.copy(controlli.target);
        const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        scheda.querySelector('.vista-stato').textContent = 'Salvata alle ' + ora;
        aggiornaCollegamento();
    });

    // "Vai": la camera si sposta su quella vista, una volta sola
    scheda.querySelector('.btn-vai-vista').addEventListener('click', function () {
        animazione.ciclo = false;
        bottoneAvvia.textContent = 'Avvia';
        bottoneAvvia.classList.remove('selected');
        muoviVerso(i);
    });
});

bottoneAvvia.addEventListener('click', function () {
    if (animazione.attiva && animazione.ciclo) {
        fermaAnimazione();
        return;
    }
    animazione.ciclo = true;
    bottoneAvvia.textContent = 'Ferma';
    bottoneAvvia.classList.add('selected');
    muoviVerso(0);
});

// se trascini gli occhiali durante l'animazione, l'animazione si ferma e comandi tu
renderer.domElement.addEventListener('pointerdown', function () {
    if (animazione.attiva) fermaAnimazione();
});


// ===== 3. il collegamento: viste e tempi scritti in un indirizzo da copiare =====
const campoCollegamento = document.getElementById('collegamento');
const bottoneCopia = document.querySelector('.btn-copia');

// arrotonda a 3 decimali, così il collegamento resta corto
function arrotonda(vettore) {
    return vettore.toArray().map(function (n) { return Math.round(n * 1000) / 1000; });
}

function aggiornaCollegamento() {
    const dati = {
        movimento: leggiTempo(campoMovimento, 0.5),
        fermo: leggiTempo(campoFermo, 0),
        viste: viste.map(function (v) {
            return { posizione: arrotonda(v.posizione), target: arrotonda(v.target) };
        })
    };
    // l'indirizzo di nuova-pagina.html (nella stessa cartella) con i dati dopo il #
    const sito = new URL('nuova-pagina.html', window.location.href);
    sito.hash = 'animazione=' + encodeURIComponent(JSON.stringify(dati));
    campoCollegamento.value = sito.href;
}

campoMovimento.addEventListener('input', aggiornaCollegamento);
campoFermo.addEventListener('input', aggiornaCollegamento);
aggiornaCollegamento();

bottoneCopia.addEventListener('click', function () {
    campoCollegamento.select();
    navigator.clipboard.writeText(campoCollegamento.value).then(function () {
        bottoneCopia.textContent = 'Copiato!';
    }, function () {
        document.execCommand('copy'); // per i browser che non permettono la copia automatica
        bottoneCopia.textContent = 'Copiato!';
    });
    setTimeout(function () { bottoneCopia.textContent = 'Copia collegamento'; }, 2000);
});


// ===== 4. il ciclo di disegno =====
const orologio = new THREE.Clock();

function anima() {
    const delta = Math.min(orologio.getDelta(), 0.1);


    if (animazione.attiva) {
        aggiornaAnimazione(delta);
    } else {
        controlli.update();
    }
    renderer.render(scena, camera);
    requestAnimationFrame(anima);
}
anima();
