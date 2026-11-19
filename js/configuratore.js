import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// il contenitore in cui disegnare la scena
const visore = document.getElementById('visore');
// la sezione della PH5: cerchiamo i bottoni solo qui dentro, così non prendiamo quelli degli occhiali
const sezione = document.getElementById('sezione-ph5');

// 1. la scena: lo "spazio" che contiene tutti gli oggetti
const scena = new THREE.Scene();

// 2. la camera: il punto di vista da cui guardiamo la scena
const camera = new THREE.PerspectiveCamera(45, visore.clientWidth / visore.clientHeight, 0.1, 100);
camera.position.set(3, 2, 4);

// 3. il renderer: disegna la scena in un <canvas> dentro il visore
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(visore.clientWidth, visore.clientHeight);
renderer.shadowMap.enabled = true;                  // attiviamo le ombre
renderer.shadowMap.type = THREE.PCFShadowMap;       // ombre filtrate: il bordo si sfuma con luce.shadow.radius
visore.prepend(renderer.domElement);      // il canvas va per primo, così i tasti nel visore restano sopra

// 3b. l'ambiente riflesso: una "stanza" virtuale con finestre luminose
// che le superfici lucide riflettono (si vede solo nei riflessi, non come sfondo)
const pmrem = new THREE.PMREMGenerator(renderer);
scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// 4. le luci: una diffusa ovunque e una che arriva da una direzione
const luceAmbiente = new THREE.AmbientLight(0xffffff, 0.3); // più bassa: ora illumina anche l'ambiente riflesso
scena.add(luceAmbiente);
const luce = new THREE.DirectionalLight(0xffffff, 1.5);
luce.position.set(4, 7, 1);              // la luce arriva dall'alto a destra (rispetto a chi guarda)
luce.castShadow = true;                  // questa luce produce ombre
luce.shadow.mapSize.set(1024, 1024);     // qualità dell'ombra
luce.shadow.radius = 6;                  // morbidezza del bordo
scena.add(luce);

// 4b. il pavimento invisibile: si vede solo l'ombra, il resto lascia vedere il fondo beige
const pavimento = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.18 })   // opacità = quanto è scura l'ombra
);
pavimento.rotation.x = -Math.PI / 2;     // il piano nasce in verticale: lo mettiamo in orizzontale
pavimento.position.y = -1.5;             // un po' sotto il solido, così c'è spazio anche per Grande
pavimento.receiveShadow = true;          // il pavimento riceve le ombre
scena.add(pavimento);

// 5. la lampada: carichiamo il modello 3D dal file models/ph5.glb
// "oggetto" è un gruppo vuoto che conterrà la lampada: lo usiamo per girarla e scalarla
const oggetto = new THREE.Group();
scena.add(oggetto);

// qui mettiamo i materiali di tutte le parti, per cambiarne colore e finitura:
// "materialiPerNome" ci permette di trovare il materiale di una parte dal suo nome
// (i nomi sono quelli del file: paralume_grande, attacco, anello_riflettore...)
const materialiPerNome = {};
const tuttiMateriali = [];

new GLTFLoader().load('models/ph5.glb', function (gltf) {
    const lampada = gltf.scene;

    lampada.traverse(function (parte) {
        if (parte.isMesh) {
            parte.castShadow = true;                // ogni parte proietta la sua ombra
            parte.material = parte.material.clone(); // una copia del materiale, tutta per questa parte
            tuttiMateriali.push(parte.material);
            materialiPerNome[parte.name] = parte.material;
        }
    });

    // il modello è in metri (largo 0,5 m): lo portiamo a una larghezza di 2.6
    // e lo mettiamo al centro, misurando solo la lampada (senza il cavo, che è molto lungo)
    const scatola = new THREE.Box3();
    lampada.traverse(function (parte) {
        if (parte.isMesh && parte.name !== 'cavo') {
            scatola.expandByObject(parte);
        }
    });
    const dimensioni = scatola.getSize(new THREE.Vector3());
    const centro = scatola.getCenter(new THREE.Vector3());
    const scala = 2.6 / dimensioni.x;
    lampada.scale.setScalar(scala);
    lampada.position.copy(centro).multiplyScalar(-scala);

    oggetto.add(lampada);

    // le luci della lampada (spente all'inizio): le mettiamo dentro il modello,
    // così si muovono con lei quando oscilla. Le posizioni sono in metri, come il modello.
    // una luce calda tra i paralumi, che illumina il loro interno...
    luceLampadina = new THREE.PointLight(0xffd59a, 0, 0, 2);
    luceLampadina.position.set(0, 0.1, 0);
    lampada.add(luceLampadina);

    // ...e un cono di luce verso il basso, che fa una pozza di luce sul pavimento
    luceCono = new THREE.SpotLight(0xffd59a, 0, 0, 1.0, 0.6, 2);
    luceCono.position.set(0, 0.05, 0);
    luceCono.target.position.set(0, -1, 0);   // punta dritto in giù
    lampada.add(luceCono);
    lampada.add(luceCono.target);

    // il modello c'è: applichiamo colore e finitura scelti nei bottoni
    // per ogni gruppo di campioni, il colore del campione selezionato
    sezione.querySelectorAll('.campioni').forEach(function (gruppo) {
        applicaColore(gruppo, gruppo.querySelector('.campione.selected').dataset.color);
    });
    applicaFinitura(sezione.querySelector('.finitura.selected').dataset.finitura);

    // nascondiamo la scritta segnaposto
    sezione.querySelector('.visore-segnaposto').style.display = 'none';
}, undefined, function (errore) {
    console.error('Non riesco a caricare il modello ph5.glb:', errore);
});

// colora le parti scritte nel data-parti del gruppo di campioni
function applicaColore(gruppo, colore) {
    gruppo.dataset.parti.split(' ').forEach(function (nome) {
        const materiale = materialiPerNome[nome];
        if (materiale) {
            materiale.color.set(colore);
        }
    });
}

// quando si clicca un bottone: lo segniamo come "selected"
// e scriviamo il suo data-nome accanto al titolo dell'opzione
function selezionaBottone(bottone, gruppo) {
    gruppo.forEach(function (b) {
        b.classList.remove('selected');
    });
    bottone.classList.add('selected');

    const valore = bottone.closest('.opzione').querySelector('.opzione-valore');
    valore.textContent = bottone.dataset.nome;
}

// 5b. i campioni: ogni gruppo colora le sue parti della lampada
sezione.querySelectorAll('.campioni').forEach(function (gruppo) {
    const campioni = gruppo.querySelectorAll('.campione');

    campioni.forEach(function (campione) {
        campione.addEventListener('click', function () {
            applicaColore(gruppo, campione.dataset.color);
            selezionaBottone(campione, campioni);
            deselezionaAccostamenti(); // un colore scelto a mano: non è più un accostamento
        });
    });
});

// 5c. gli accostamenti: un tasto colora insieme le 4 parti, nell'ordine dei gruppi di campioni
// (paralume grande e attacco, paralume superiore, paralumi inferiori, anello riflettore)
const accostamenti = sezione.querySelectorAll('.accostamento');
const gruppiColore = sezione.querySelectorAll('.campioni');

accostamenti.forEach(function (accostamento) {
    accostamento.addEventListener('click', function () {
        const colori = accostamento.dataset.colori.split(',');
        const nomi = accostamento.dataset.nomiColori.split(',');

        gruppiColore.forEach(function (gruppo, i) {
            applicaColore(gruppo, colori[i]);

            // questi colori non sono tra i campioni: togliamo la selezione
            // e scriviamo il nome del colore accanto al titolo del gruppo
            gruppo.querySelectorAll('.campione').forEach(function (c) {
                c.classList.remove('selected');
            });
            gruppo.closest('.opzione').querySelector('.opzione-valore').textContent = nomi[i];
        });

        selezionaBottone(accostamento, accostamenti);
    });
});

function deselezionaAccostamenti() {
    accostamenti.forEach(function (a) {
        a.classList.remove('selected');
    });
    sezione.querySelector('.accostamenti').closest('.opzione')
        .querySelector('.opzione-valore').textContent = 'Personalizzato';
}

// 5d. le misure: cliccandone una l'oggetto si ingrandisce o rimpicciolisce
// la misura Classic (50 cm) è la grandezza "normale", cioè scala 1
function scalaPerMisura(misura) {
    return Number(misura) / 50; // Mini 30 → 0.6, Classic 50 → 1, Grande 60 → 1.2
}

const misure = sezione.querySelectorAll('.misura');
const misuraIniziale = sezione.querySelector('.misura.selected').dataset.misura;
oggetto.scale.setScalar(scalaPerMisura(misuraIniziale));

misure.forEach(function (misura) {
    misura.addEventListener('click', function () {
        oggetto.scale.setScalar(scalaPerMisura(misura.dataset.misura));
        selezionaBottone(misura, misure);
    });
});

// 5e. le finiture: lucida o opaca cambiano come la superficie riflette la luce
function applicaFinitura(finitura) {
    tuttiMateriali.forEach(function (materiale) {
        if (finitura === 'opaca') {
            materiale.roughness = 0.9;          // superficie ruvida: la luce si sparpaglia
            materiale.envMapIntensity = 0.4;    // riflessi dell'ambiente appena accennati
        } else {
            materiale.roughness = 0.2;          // superficie liscia
            materiale.envMapIntensity = 0.8;    // riflessi ben visibili
        }
    });
}

const finiture = sezione.querySelectorAll('.finitura[data-finitura]'); // solo Lucida e Opaca, non Soffia

finiture.forEach(function (finitura) {
    finitura.addEventListener('click', function () {
        applicaFinitura(finitura.dataset.finitura);
        selezionaBottone(finitura, finiture);
    });
});

// 5f. accendi e spegni: lo sfondo diventa buio e la lampada si illumina
let luceLampadina = null; // le creiamo quando il modello è caricato (vedi 5)
let luceCono = null;
let accesa = false;
const ambienteRiflesso = scena.environment; // lo teniamo da parte per rimetterlo quando si spegne

// un pavimento scuro che si vede solo a lampada accesa: riceve la pozza di luce
const pavimentoBuio = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 1 })
);
pavimentoBuio.rotation.x = -Math.PI / 2;
pavimentoBuio.position.y = -1.5;
pavimentoBuio.visible = false;
scena.add(pavimentoBuio);

const bottoneLuce = sezione.querySelector('.btn-luce');

bottoneLuce.addEventListener('click', function () {
    accesa = !accesa; // ogni clic inverte: spenta → accesa → spenta...

    visore.classList.toggle('acceso', accesa);          // lo sfondo nero è nel CSS
    visorePercorso.classList.toggle('acceso', accesa);  // anche il secondo quadrante va al buio
    bottoneLuce.classList.toggle('selected', accesa);
    bottoneLuce.textContent = accesa ? 'Spegni' : 'Accendi';

    // le luci della stanza: quasi spente al buio, normali alla luce
    luceAmbiente.intensity = accesa ? 0.04 : 0.3;
    luce.intensity = accesa ? 0.1 : 1.5;
    scena.environment = accesa ? null : ambienteRiflesso; // al buio niente riflessi della stanza
    pavimentoBuio.visible = accesa;

    // le luci della lampada
    if (luceLampadina) {
        luceLampadina.intensity = accesa ? 7 : 0;    // luce tra i paralumi
        luceCono.intensity = accesa ? 25 : 0;        // pozza di luce sul pavimento
    }

    // il diffusore (la parte al centro, vicino alla lampadina) brilla di luce propria
    const diffusore = materialiPerNome['diffusore'];
    if (diffusore) {
        diffusore.emissive.set(accesa ? 0xffe2b0 : 0x000000);
        diffusore.emissiveIntensity = accesa ? 3 : 0;
    }
});

// 6. i controlli: trascina per girare, rotella per avvicinarti
const controlli = new OrbitControls(camera, renderer.domElement);
controlli.enableDamping = true;

// 7. se la finestra cambia misura, adattiamo camera e canvas al visore
window.addEventListener('resize', function () {
    camera.aspect = visore.clientWidth / visore.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(visore.clientWidth, visore.clientHeight);
});

// 9. il secondo quadrante: la stessa scena vista da una camera che si muove da sola
// l'animazione è quella preparata nella pagina di regia (regia.html):
// tempi in secondi e tre viste, ognuna con la posizione della camera e il punto guardato (target)
const animazionePercorso = {
    movimento: 1.5,
    fermo: 2,
    viste: [
        { posizione: [-1.789, 2.843, 3.166], target: [0, 0, 0] },
        { posizione: [-1.136, -1.527, 4.205], target: [0, 0, 0] },
        { posizione: [2.179, 1.097, 2.414], target: [0, 0, 0] }
    ]
};

const visorePercorso = document.getElementById('visore-percorso');

// una seconda camera e un secondo renderer, che disegnano la stessa scena nel secondo quadrante
const cameraPercorso = new THREE.PerspectiveCamera(45, visorePercorso.clientWidth / visorePercorso.clientHeight, 0.1, 100);
const rendererPercorso = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rendererPercorso.setPixelRatio(window.devicePixelRatio);
rendererPercorso.setSize(visorePercorso.clientWidth, visorePercorso.clientHeight);
rendererPercorso.shadowMap.enabled = true;
rendererPercorso.shadowMap.type = THREE.PCFShadowMap;
visorePercorso.appendChild(rendererPercorso.domElement);

// l'ambiente riflesso va creato anche per questo renderer (ognuno ha la sua memoria video)
const ambientePercorso = new THREE.PMREMGenerator(rendererPercorso).fromScene(new RoomEnvironment(), 0.04).texture;

// le viste come vettori di Three.js
const vistePercorso = animazionePercorso.viste.map(function (v) {
    return { posizione: new THREE.Vector3().fromArray(v.posizione), target: new THREE.Vector3().fromArray(v.target) };
});

// lo stato: si parte fermi sulla Vista 1
const percorso = { fase: 'fermo', tempo: 0, da: 0, a: 0 };
const targetPercorso = new THREE.Vector3();

// la curva "morbida": parte piano, accelera e rallenta all'arrivo
function morbido(t) {
    return t * t * (3 - 2 * t);
}

// posiziona la camera tra due viste (t da 0 a 1) girando attorno al punto guardato,
// così non passa mai dentro la lampada
const sfericaDa = new THREE.Spherical();
const sfericaA = new THREE.Spherical();
const scarto = new THREE.Vector3();

function posizionaCameraPercorso(da, a, t) {
    targetPercorso.lerpVectors(da.target, a.target, t);

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
    cameraPercorso.position.copy(targetPercorso).add(scarto);
    cameraPercorso.lookAt(targetPercorso);
}

// a ogni fotogramma: fermo su una vista, poi movimento verso la successiva (dalla 3 si torna alla 1)
function aggiornaPercorso(delta) {
    percorso.tempo += delta;

    if (percorso.fase === 'fermo') {
        posizionaCameraPercorso(vistePercorso[percorso.a], vistePercorso[percorso.a], 0);
        if (percorso.tempo >= animazionePercorso.fermo) {
            percorso.da = percorso.a;
            percorso.a = (percorso.a + 1) % vistePercorso.length;
            percorso.fase = 'movimento';
            percorso.tempo = 0;
        }
    } else {
        const t = Math.min(percorso.tempo / animazionePercorso.movimento, 1);
        posizionaCameraPercorso(vistePercorso[percorso.da], vistePercorso[percorso.a], morbido(t));
        if (t >= 1) {
            percorso.fase = 'fermo';
            percorso.tempo = 0;
        }
    }
}

// disegna la scena nel secondo quadrante, con il suo ambiente riflesso
function disegnaPercorso() {
    const ambiente = scena.environment;               // quello del primo renderer (o nessuno, a luce accesa)
    scena.environment = ambiente ? ambientePercorso : null;
    rendererPercorso.render(scena, cameraPercorso);
    scena.environment = ambiente;                     // rimettiamo quello di prima
}

window.addEventListener('resize', function () {
    cameraPercorso.aspect = visorePercorso.clientWidth / visorePercorso.clientHeight;
    cameraPercorso.updateProjectionMatrix();
    rendererPercorso.setSize(visorePercorso.clientWidth, visorePercorso.clientHeight);
});

// 8. il ciclo di disegno: ridisegna la scena a ogni fotogramma
const orologio = new THREE.Clock(); // misura il tempo passato tra un fotogramma e l'altro

// 7b. il vento: "vento" va da 0 (aria ferma) a 1 (soffio fortissimo)
let vento = 0;
let fase = 0; // a che punto dell'oscillazione si trova la lampada

// il tasto "soffia": ogni clic aggiunge un po' di vento (fino al massimo, 1)
sezione.querySelector('.btn-soffia').addEventListener('click', function () {
    vento = Math.min(vento + 0.25, 1);
});

function anima() {
    const delta = Math.min(orologio.getDelta(), 0.1); // secondi dall'ultimo fotogramma

    // se non si clicca, il vento cala piano piano e la lampada rallenta
    vento = Math.max(vento - delta * 0.15, 0);

    // ondulazione da destra a sinistra, come una lampada appesa mossa dall'aria:
    // con il vento l'oscillazione diventa più ampia (fino a ~20 gradi) e più veloce
    const velocita = 1.2 + vento * 2.3;
    const ampiezza = 0.07 + vento * 0.28;
    fase += delta * velocita;                 // la fase avanza: così cambiare velocità non fa scatti
    oggetto.rotation.z = Math.sin(fase) * ampiezza;

    controlli.update();
    renderer.render(scena, camera);

    // il secondo quadrante
    aggiornaPercorso(delta);
    disegnaPercorso();
    requestAnimationFrame(anima);
}
anima();
