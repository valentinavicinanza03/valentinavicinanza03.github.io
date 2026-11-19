// Pagina di regia: la stessa scena del sito (lampada, luci, ombra),
// più il pannello per preparare l'animazione della camera e copiarne il collegamento.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ===== 1. la scena, come nel sito =====
const visore = document.getElementById('visore');
const scena = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, visore.clientWidth / visore.clientHeight, 0.1, 100);
camera.position.set(3, 2, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(visore.clientWidth, visore.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
visore.prepend(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

scena.add(new THREE.AmbientLight(0xffffff, 0.3));
const luce = new THREE.DirectionalLight(0xffffff, 1.5);
luce.position.set(4, 7, 1);
luce.castShadow = true;
luce.shadow.mapSize.set(1024, 1024);
luce.shadow.radius = 6;
scena.add(luce);

const pavimento = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.18 })
);
pavimento.rotation.x = -Math.PI / 2;
pavimento.position.y = -1.5;
pavimento.receiveShadow = true;
scena.add(pavimento);

// la lampada, centrata e scalata come nel sito
const oggetto = new THREE.Group();
scena.add(oggetto);

new GLTFLoader().load('models/ph5.glb', function (gltf) {
    const lampada = gltf.scene;
    const scatola = new THREE.Box3();
    lampada.traverse(function (parte) {
        if (parte.isMesh) {
            parte.castShadow = true;
            if (parte.name !== 'cavo') scatola.expandByObject(parte);
        }
    });
    const dimensioni = scatola.getSize(new THREE.Vector3());
    const centro = scatola.getCenter(new THREE.Vector3());
    const scala = 2.6 / dimensioni.x;
    lampada.scale.setScalar(scala);
    lampada.position.copy(centro).multiplyScalar(-scala);
    oggetto.add(lampada);
    document.querySelector('.visore-segnaposto').style.display = 'none';
}, undefined, function (errore) {
    console.error('Non riesco a caricare il modello ph5.glb:', errore);
});

const controlli = new OrbitControls(camera, renderer.domElement);
controlli.enableDamping = true;

window.addEventListener('resize', function () {
    camera.aspect = visore.clientWidth / visore.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(visore.clientWidth, visore.clientHeight);
});


// ===== 2. l'animazione della camera: tre viste, la camera passa dall'una all'altra =====
// ogni vista ricorda dove sta la camera (posizione) e quale punto guarda (target)
const viste = [
    { posizione: new THREE.Vector3(3, 2, 4),    target: new THREE.Vector3(0, 0, 0) },  // di tre quarti
    { posizione: new THREE.Vector3(0.5, -1, 5), target: new THREE.Vector3(0, 0, 0) },  // dal basso, di fronte
    { posizione: new THREE.Vector3(-4, 3, -1),  target: new THREE.Vector3(0, 0, 0) }   // dall'alto, dall'altro lato
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
// così non passa mai dentro la lampada
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

// se trascini la lampada durante l'animazione, l'animazione si ferma e comandi tu
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
    // l'indirizzo del sito (index.html nella stessa cartella) con i dati dopo il #
    const sito = new URL('index.html', window.location.href);
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
let fase = 0;

function anima() {
    const delta = Math.min(orologio.getDelta(), 0.1);

    // la stessa ondulazione leggera del sito
    fase += delta * 1.2;
    oggetto.rotation.z = Math.sin(fase) * 0.07;

    if (animazione.attiva) {
        aggiornaAnimazione(delta);
    } else {
        controlli.update();
    }
    renderer.render(scena, camera);
    requestAnimationFrame(anima);
}
anima();
