import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FaceLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
import { cartella, modelli, tavolozze, preparaModello, idDi, linkProdotto, dividiInParti, coloraParti,
         impostaLente, lenteBase, coloriLenti, SFONDO_SPECCHIO } from './modelli.js';

// la prova virtuale: la fotocamera riprende il viso, MediaPipe trova i punti del viso (occhi, naso, mento...)
// e noi mettiamo gli occhiali 3D sopra il video, nella posizione e con la rotazione della testa.
// Tutto avviene nel browser: le immagini della fotocamera non vengono inviate da nessuna parte.

// ===== 1. quale occhiale e quali colori: lo dice l'indirizzo (prova.html?m=nomefile&c=colori&f=finitura) =====
const q = new URLSearchParams(location.search);
const indice = Math.max(0, modelli.findIndex(function (m) { return idDi(m) === q.get('m'); }));
const dati = modelli[indice];
const tavolozza = tavolozze[dati.nome] || tavolozze['Valentina Vicinanza'];

const chiaviParti = ['montatura', 'stanghette', 'lenti', 'cerniere'];
const chiaviTavolozza = ['m', 's', 'l', 'c'];
const coloriDalLink = (q.get('c') || '').split('-');
const colori = {};
chiaviParti.forEach(function (parte, i) {
    const hex = coloriDalLink[i] || '';
    // se nel link non c'è un colore valido usiamo il primo della tavolozza, come nella pagina dell'occhiale
    colori[parte] = /^[0-9a-f]{6}$/i.test(hex) ? '#' + hex : tavolozza[chiaviTavolozza[i]][0][1];
});
let finitura = q.get('f') === 'opaca' ? 'opaca' : 'lucida';
let tipoLente = ['normale', 'specchio', 'sfumato'].includes(q.get('t')) ? q.get('t') : lenteBase(dati);   // il tipo di lente

document.title = 'Provami · ' + dati.nome + ' – Triennale Milano';
document.querySelector('.prova-nome').textContent = dati.nome;
document.querySelector('.prova-indietro').href = linkProdotto(dati);

const palco = document.querySelector('.prova-palco');
const video = palco.querySelector('video');
const messaggio = palco.querySelector('.prova-messaggio');

function mostraMessaggio(testo) {
    messaggio.textContent = testo || '';
    messaggio.hidden = !testo;
}

// ===== 2. la scena 3D sopra il video =====
// la camera è "ortografica" e misurata in pixel: un punto del video (x, y) è il punto 3D (x, -y)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
palco.appendChild(renderer.domElement);

const scena = new THREE.Scene();
scena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scena.add(new THREE.AmbientLight(0xffffff, 0.6));
const luce = new THREE.DirectionalLight(0xffffff, 1.2);
luce.position.set(0, 1, 2);   // la luce arriva da davanti, come quella dello schermo
scena.add(luce);

const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10000, 10000);

// si può provare in più persone insieme: fino a MAX_VISI visi, ognuno con i suoi occhiali
const MAX_VISI = 4;

// per ogni viso una "testa" che lo segue: sta tra gli occhi, ruota come la testa ed è grande quanto
// la montatura adatta a quel viso (dentro misuriamo in "larghezze della montatura": 1 = la montatura giusta)
const geometriaOcclusore = new THREE.SphereGeometry(1, 32, 24);
const materialeOcclusore = new THREE.MeshBasicMaterial({ colorWrite: false });

const visi = [];
for (let i = 0; i < MAX_VISI; i++) {
    const testa = new THREE.Group();
    testa.visible = false;
    scena.add(testa);

    const occhiali = new THREE.Group();
    occhiali.position.z = 0.04;   // un po' davanti al naso
    testa.add(occhiali);

    // una testa invisibile: non si vede ma nasconde le stanghette quando passano dietro la testa
    const occlusore = new THREE.Mesh(geometriaOcclusore, materialeOcclusore);
    occlusore.renderOrder = -1;   // disegnata per prima
    testa.add(occlusore);

    visi.push({ testa: testa, occhiali: occhiali, occlusore: occlusore, usato: false });
}

// ===== 3. gli occhiali: stesso modello e stessi colori della pagina dell'occhiale =====
let larghezzaFrontale = 1;   // la larghezza del frontale del modello (si misura quando è caricato)
let regolazione = 1;         // il cursore "Grandezza": 1 = automatica
let occhialiVisibili = true; // il bottone "Nascondi occhiali"
let partiOcchiali = null;    // le parti del modello (montatura, stanghette, lenti, cerniere), per cambiare i colori

// dentro ogni "testa" 1 unità = la larghezza della montatura adatta a quel viso
function aggiornaScalaOcchiali() {
    visi.forEach(function (v) {
        v.occhiali.scale.setScalar(regolazione / larghezzaFrontale);
        v.occhiali.visible = occhialiVisibili;
    });
}

// ogni stanghetta (sinistra e destra) entra in un perno messo sulla cerniera, cioè sulla sua punta davanti.
// Nel perno ricordiamo dove sta la cerniera, quanto è lunga la stanghetta e quanto è già aperta nel modello.
function creaPerniStanghette(perno, parti) {
    if (parti.stanghette.length === 0) return;
    const scala = perno.scale.x;
    perno.scale.setScalar(1);               // misure nelle unità del modello
    perno.updateMatrixWorld(true);

    [-1, 1].forEach(function (lato) {
        const pezzi = parti.stanghette.filter(function (m) {
            return Math.sign(new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).x) === lato;
        });
        if (pezzi.length === 0) return;
        const box = new THREE.Box3();
        pezzi.forEach(function (m) { box.expandByObject(m); });

        // la cerniera: davanti; la punta: dietro (dove si appoggia all'orecchio)
        const cerniera = new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z);
        const punta = new THREE.Vector3(lato < 0 ? box.min.x : box.max.x, cerniera.y, box.min.z);
        const lunghezza = Math.max(cerniera.z - punta.z, 1e-6);

        const p = new THREE.Group();
        p.name = 'perno-stanghetta';
        p.position.copy(cerniera);
        p.userData = {
            lato: lato,
            cernieraX: cerniera.x,
            lunghezza: lunghezza,
            // quanto è già aperta verso l'esterno nel modello (in radianti)
            apertura: Math.atan2((punta.x - cerniera.x) * lato, lunghezza)
        };
        perno.add(p);
        perno.updateMatrixWorld(true);
        pezzi.forEach(function (m) { p.attach(m); });   // entrano nel perno senza spostarsi
    });

    perno.scale.setScalar(scala);
    perno.updateMatrixWorld(true);
}

new GLTFLoader().load(encodeURI(cartella + dati.file), function (gltf) {
    const perno = preparaModello(gltf, dati);
    const parti = dividiInParti(perno);
    coloraParti(parti, colori, finitura, tipoLente);
    partiOcchiali = parti;

    // le stanghette su un perno alla cerniera, così possiamo aprirle o chiuderle fino alle orecchie
    creaPerniStanghette(perno, parti);

    // spostiamo il modello in modo che il punto di riferimento sia il frontale, all'altezza delle lenti:
    // è quel punto che va appoggiato tra gli occhi
    perno.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(perno);
    let altezzaLenti = (box.min.y + box.max.y) / 2;
    if (parti.lenti.length) {
        const boxLenti = new THREE.Box3();
        parti.lenti.forEach(function (m) { boxLenti.expandByObject(m); });
        altezzaLenti = (boxLenti.min.y + boxLenti.max.y) / 2;
    }

    // la larghezza del frontale (montatura, lenti e cerniere, senza le stanghette che si allargano):
    // è questa che facciamo coincidere con la larghezza del viso, misurata a ogni fotogramma
    const boxFrontale = new THREE.Box3();
    parti.montatura.concat(parti.lenti, parti.cerniere).forEach(function (m) { boxFrontale.expandByObject(m); });
    larghezzaFrontale = boxFrontale.isEmpty()
        ? box.max.x - box.min.x
        : boxFrontale.max.x - boxFrontale.min.x;

    perno.position.set(-(box.min.x + box.max.x) / 2, -altezzaLenti, -box.max.z);

    // una copia per ogni viso (stessa geometria e stessi materiali: non pesa di più)
    visi.forEach(function (v, i) {
        const copia = i === 0 ? perno : perno.clone();
        v.occhiali.add(copia);
        v.perni = [];
        copia.traverse(function (o) { if (o.name === 'perno-stanghetta') v.perni.push(o); });
    });
    aggiornaScalaOcchiali();
}, undefined, function () {
    mostraMessaggio('Non riesco a caricare gli occhiali');
});

// ===== 4. la fotocamera =====
async function avviaFotocamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        mostraMessaggio('Questo browser non può usare la fotocamera (serve una pagina https o localhost)');
        return false;
    }
    try {
        const flusso = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = flusso;
        await video.play();
        // il palco prende le proporzioni del video, così i punti del viso coincidono con l'immagine
        palco.style.aspectRatio = video.videoWidth + ' / ' + video.videoHeight;
        ridimensiona();
        return true;
    } catch (errore) {
        mostraMessaggio(errore.name === 'NotAllowedError'
            ? 'Hai negato l\'accesso alla fotocamera: consentilo dalle impostazioni del browser e ricarica la pagina'
            : 'Non trovo una fotocamera da usare');
        return false;
    }
}

// ===== 5. il riconoscimento del viso (MediaPipe Face Landmarker) =====
let riconoscitore = null;

async function avviaRiconoscitore() {
    const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    const opzioni = function (delegate) {
        return {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate: delegate
            },
            runningMode: 'VIDEO',
            numFaces: MAX_VISI
        };
    };
    try {
        riconoscitore = await FaceLandmarker.createFromOptions(vision, opzioni('GPU'));
    } catch (e) {
        riconoscitore = await FaceLandmarker.createFromOptions(vision, opzioni('CPU'));
    }
}

// i punti del viso che usiamo (numerazione di MediaPipe)
const RADICE_NASO = 168, OCCHIO_DX = 33, OCCHIO_SX = 263, OCCHIO_DX_INT = 133, OCCHIO_SX_INT = 362,
      TEMPIA_DX = 127, TEMPIA_SX = 356, FRONTE = 10, MENTO = 152,
      ORECCHIO_DX = 234, ORECCHIO_SX = 454;   // i bordi del viso davanti alle orecchie

const punto = function (lm, i, w, h) {
    // da coordinate del video (0..1, y verso il basso, z negativa verso la camera) a pixel 3D (y in alto, z verso la camera)
    return new THREE.Vector3(lm[i].x * w, -lm[i].y * h, -lm[i].z * w);
};

const asseX = new THREE.Vector3(), asseY = new THREE.Vector3(), asseZ = new THREE.Vector3();
const base = new THREE.Matrix4();

// misura un viso: dove sta, quanto è grande e come è girato
function misuraViso(lm, w, h) {
    // dove: in mezzo ai quattro angoli degli occhi (così le lenti stanno all'altezza degli occhi),
    // con la profondità della radice del naso (così la montatura sta davanti al viso)
    const posizione = new THREE.Vector3();
    [OCCHIO_DX, OCCHIO_DX_INT, OCCHIO_SX, OCCHIO_SX_INT].forEach(function (i) {
        posizione.add(punto(lm, i, w, h));
    });
    posizione.multiplyScalar(0.25);
    posizione.z = punto(lm, RADICE_NASO, w, h).z;

    // quanto grande: la montatura giusta è larga circa quanto il viso alle tempie
    // e circa una volta e mezza la distanza tra gli angoli esterni degli occhi.
    // Facciamo la media delle due misure, così il risultato è più stabile.
    const tempie = punto(lm, TEMPIA_DX, w, h).distanceTo(punto(lm, TEMPIA_SX, w, h));
    const occhi = punto(lm, OCCHIO_DX, w, h).distanceTo(punto(lm, OCCHIO_SX, w, h));
    const larghezza = (tempie * 0.95 + occhi * 1.55) / 2;
    const altezza = punto(lm, FRONTE, w, h).distanceTo(punto(lm, MENTO, w, h));

    // come è girata la testa: l'asse X va da un occhio all'altro, l'asse Y dal mento alla fronte
    asseX.subVectors(punto(lm, OCCHIO_SX, w, h), punto(lm, OCCHIO_DX, w, h)).normalize();
    asseY.subVectors(punto(lm, FRONTE, w, h), punto(lm, MENTO, w, h)).normalize();
    asseZ.crossVectors(asseX, asseY).normalize();   // esce dalla faccia, verso la camera
    asseY.crossVectors(asseZ, asseX).normalize();   // di nuovo perpendicolare agli altri due
    base.makeBasis(asseX, asseY, asseZ);
    const rotazione = new THREE.Quaternion().setFromRotationMatrix(base);

    return {
        posizione: posizione, rotazione: rotazione, larghezza: larghezza, tempie: tempie, altezza: altezza,
        orecchioDx: punto(lm, ORECCHIO_DX, w, h), orecchioSx: punto(lm, ORECCHIO_SX, w, h)
    };
}

// sposta una testa sul suo viso
const inversa = new THREE.Matrix4();
const orecchioDx = new THREE.Vector3(), orecchioSx = new THREE.Vector3();

function seguiViso(v, m, salta) {
    // un viso appena comparso salta subito al suo posto, poi lo seguiamo con un po' di morbidezza (niente tremolii)
    if (salta) {
        v.testa.position.copy(m.posizione);
        v.testa.quaternion.copy(m.rotazione);
        v.testa.scale.setScalar(m.larghezza);
        v.testa.visible = true;
    } else {
        v.testa.position.lerp(m.posizione, 0.5);
        v.testa.quaternion.slerp(m.rotazione, 0.5);
        v.testa.scale.setScalar(THREE.MathUtils.lerp(v.testa.scale.x, m.larghezza, 0.5));
    }

    // le orecchie viste dalla testa (in larghezze della montatura): quanto sono distanti dal centro e quanto indietro
    v.testa.updateMatrixWorld(true);
    inversa.copy(v.testa.matrixWorld).invert();
    orecchioDx.copy(m.orecchioDx).applyMatrix4(inversa);
    orecchioSx.copy(m.orecchioSx).applyMatrix4(inversa);
    const metaTesta = THREE.MathUtils.clamp((Math.abs(orecchioDx.x) + Math.abs(orecchioSx.x)) / 2, 0.35, 0.65);
    const profonditaOrecchie = THREE.MathUtils.clamp((orecchioDx.z + orecchioSx.z) / 2, -0.9, -0.3);
    const altezzaViso = m.altezza / m.larghezza;

    if (salta || v.metaTesta === undefined) {
        v.metaTesta = metaTesta;
        v.profonditaOrecchie = profonditaOrecchie;
    } else {
        v.metaTesta = THREE.MathUtils.lerp(v.metaTesta, metaTesta, 0.3);
        v.profonditaOrecchie = THREE.MathUtils.lerp(v.profonditaOrecchie, profonditaOrecchie, 0.3);
    }

    // la testa invisibile: un ovale largo quanto la testa alle orecchie, con il centro poco dietro le orecchie.
    // Nasconde la stanghetta che passa dietro la testa quando ti giri, ma lascia vedere quella dalla parte della camera.
    // (il davanti dell'ovale resta sempre dietro la montatura, così non copre mai le lenti)
    const profonditaOvale = 0.6;
    v.occlusore.scale.set(v.metaTesta * 0.97, altezzaViso * 0.55, profonditaOvale);
    v.occlusore.position.set(0, -altezzaViso * 0.12,
        Math.min(v.profonditaOrecchie - 0.05, -0.08 - profonditaOvale));

    // le stanghette: le apriamo o chiudiamo sulla cerniera finché la punta arriva all'orecchio,
    // così stanno appoggiate ai lati della testa invece di restare sospese o di entrarci dentro
    const scala = v.occhiali.scale.x * (v.occhiali.children[0] ? v.occhiali.children[0].scale.x : 1);
    const spostamentoX = v.occhiali.children[0] ? v.occhiali.children[0].position.x : 0;
    (v.perni || []).forEach(function (p) {
        const d = p.userData;
        const cernieraX = Math.abs((d.cernieraX * (v.occhiali.children[0].scale.x) + spostamentoX) * v.occhiali.scale.x);
        const lunghezza = d.lunghezza * scala;
        // di quanto deve andare verso l'esterno (o verso l'interno) la punta per toccare l'orecchio
        const seno = THREE.MathUtils.clamp((v.metaTesta * 1.02 - cernieraX) / lunghezza, -0.35, 0.35);
        const voluta = Math.asin(seno);
        // ruotare sull'asse verticale: per la stanghetta destra (+x) verso l'esterno è un angolo negativo
        p.rotation.y = -d.lato * (voluta - d.apertura);
    });
}

function aggiornaVisi(risultato) {
    const trovati = risultato.faceLandmarks || [];
    if (trovati.length === 0) {
        visi.forEach(function (v) { v.testa.visible = false; });
        mostraMessaggio('Mettiti davanti alla fotocamera');
        return;
    }
    mostraMessaggio('');

    const w = palco.clientWidth;
    const h = palco.clientHeight;
    const misure = trovati.map(function (lm) { return misuraViso(lm, w, h); });

    // MediaPipe non restituisce i visi sempre nello stesso ordine: ogni viso va alla testa che
    // nel fotogramma prima era più vicina (così gli occhiali non saltano da una persona all'altra)
    visi.forEach(function (v) { v.usato = false; });
    const assegnati = new Array(misure.length).fill(null);
    const coppie = [];
    misure.forEach(function (m, i) {
        visi.forEach(function (v, j) {
            if (v.testa.visible) coppie.push({ i: i, j: j, d: v.testa.position.distanceTo(m.posizione) });
        });
    });
    coppie.sort(function (a, b) { return a.d - b.d; });
    coppie.forEach(function (c) {
        // più lontano di una larghezza di viso: è un'altra persona
        if (assegnati[c.i] !== null || visi[c.j].usato || c.d > misure[c.i].larghezza) return;
        assegnati[c.i] = c.j;
        visi[c.j].usato = true;
    });

    misure.forEach(function (m, i) {
        let salta = false;
        if (assegnati[i] === null) {
            // una persona nuova: prendiamo una testa libera
            const libera = visi.findIndex(function (v) { return !v.usato; });
            if (libera < 0) return;
            assegnati[i] = libera;
            visi[libera].usato = true;
            salta = true;
        }
        seguiViso(visi[assegnati[i]], m, salta);
    });

    // le teste senza viso si nascondono
    visi.forEach(function (v) { if (!v.usato) v.testa.visible = false; });
}

// ===== 6. misure e animazione =====
function ridimensiona() {
    const w = palco.clientWidth;
    const h = palco.clientHeight;
    renderer.setSize(w, h, false);
    camera.left = 0;
    camera.right = w;
    camera.top = 0;
    camera.bottom = -h;
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', ridimensiona);
ridimensiona();

let ultimoFotogramma = -1;
function anima() {
    requestAnimationFrame(anima);
    // un nuovo fotogramma del video → cerchiamo il viso
    if (riconoscitore && video.readyState >= 2 && video.currentTime !== ultimoFotogramma) {
        ultimoFotogramma = video.currentTime;
        aggiornaVisi(riconoscitore.detectForVideo(video, performance.now()));
    }
    renderer.render(scena, camera);
}

// ===== 7. i bottoni =====
// scatta una foto: video + occhiali in un'unica immagine, già specchiata come la vedi
document.querySelector('.btn-foto').addEventListener('click', function () {
    if (!video.videoWidth) return;
    const foto = document.createElement('canvas');
    foto.width = video.videoWidth;
    foto.height = video.videoHeight;
    const ctx = foto.getContext('2d');
    ctx.translate(foto.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, foto.width, foto.height);
    ctx.drawImage(renderer.domElement, 0, 0, foto.width, foto.height);

    const link = document.createElement('a');
    link.download = 'provami-' + idDi(dati) + '.png';
    link.href = foto.toDataURL('image/png');
    link.click();
});

// la grandezza: automatica (100%), ma si può ritoccare a mano
const cursoreGrandezza = document.querySelector('.cursore-grandezza');
const valoreGrandezza = document.querySelector('.valore-grandezza');
cursoreGrandezza.addEventListener('input', function () {
    const percento = Number(cursoreGrandezza.value);
    regolazione = percento / 100;
    aggiornaScalaOcchiali();
    valoreGrandezza.textContent = percento === 100
        ? 'Automatica'
        : (percento > 100 ? '+' : '') + (percento - 100) + '%';
});

// ===== i colori, da cambiare mentre ti guardi =====
// le copie degli occhiali (una per persona) usano gli stessi materiali dell'originale:
// cambiando il colore di un materiale cambiano tutte insieme
// tipo: solo per le lenti, 'normale' o 'specchio' (se manca: il tipo di partenza del modello)
function coloraParte(parte, colore, tipo) {
    colori[parte] = colore;
    if (parte === 'lenti') tipoLente = tipo || lenteBase(dati);
    if (!partiOcchiali) return;   // non ancora caricati: il colore verrà usato al caricamento
    const fatti = new Set();       // le lenti di tutte le copie usano lo stesso materiale: lo cambiamo una volta
    partiOcchiali[parte].forEach(function (m) {
        [].concat(m.material).forEach(function (mat) {
            if (fatti.has(mat)) return;
            fatti.add(mat);
            if (mat.color) mat.color.set(colore);
            if (parte === 'lenti') impostaLente(mat, tipoLente, partiOcchiali.lenti);
        });
    });
    salvaNelLink();
}

function applicaFinitura(scelta) {
    finitura = scelta;
    if (!partiOcchiali) return;
    ['montatura', 'stanghette', 'cerniere'].forEach(function (parte) {
        partiOcchiali[parte].forEach(function (m) {
            [].concat(m.material).forEach(function (mat) {
                if (!('roughness' in mat)) return;
                mat.roughness = scelta === 'opaca' ? 0.85 : 0.15;
                mat.envMapIntensity = scelta === 'opaca' ? 0.4 : 0.9;
            });
        });
    });
    salvaNelLink();
}

// l'indirizzo della pagina si aggiorna con i colori scelti: se ricarichi restano quelli
function salvaNelLink() {
    const nuovo = new URLSearchParams(location.search);
    nuovo.set('c', chiaviParti.map(function (k) { return colori[k].replace('#', ''); }).join('-'));
    nuovo.set('f', finitura);
    nuovo.set('t', tipoLente);
    history.replaceState(null, '', '?' + nuovo.toString());
}

const pannelloColori = document.querySelector('.prova-opzioni');
const gruppiColore = pannelloColori.querySelectorAll('.campioni');
const contenitoreAccostamenti = pannelloColori.querySelector('.accostamenti');
const bottoniFinitura = pannelloColori.querySelectorAll('.finitura[data-finitura]');

function scriviValore(elemento, testo) {
    elemento.closest('.opzione').querySelector('.opzione-valore').textContent = testo;
}

function seleziona(bottone, gruppo) {
    gruppo.forEach(function (b) { b.classList.remove('selected'); });
    bottone.classList.add('selected');
    scriviValore(bottone, bottone.dataset.nome);
}

function deselezionaAccostamenti() {
    contenitoreAccostamenti.querySelectorAll('.accostamento').forEach(function (a) { a.classList.remove('selected'); });
    scriviValore(contenitoreAccostamenti, 'Personalizzato');
}

// i campioni: la tavolozza di questo modello, con già scelto il colore arrivato dalla pagina degli occhiali
gruppiColore.forEach(function (gruppo, i) {
    const parte = chiaviParti[i];
    gruppo.dataset.parti = parte;
    let lista = tavolozza[chiaviTavolozza[i]];
    if (parte === 'lenti') lista = coloriLenti(dati, lista);   // + lo specchio sfumato
    lista.forEach(function (colore) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'campione';
        b.dataset.nome = colore[0];
        b.dataset.color = colore[1];
        b.style.backgroundColor = colore[1];
        if (colore[2]) {
            // un tipo di lente speciale (lo specchio sfumato): il campione mostra la sfumatura
            b.dataset.tipo = colore[2];
            b.style.background = SFONDO_SPECCHIO;
        }
        b.setAttribute('aria-label', colore[0]);
        gruppo.appendChild(b);
    });

    const campioni = gruppo.querySelectorAll('.campione');
    campioni.forEach(function (campione) {
        campione.addEventListener('click', function () {
            coloraParte(parte, campione.dataset.color, campione.dataset.tipo);
            seleziona(campione, campioni);
            deselezionaAccostamenti();
        });
    });

    const attuale = Array.from(campioni).find(function (c) {
        const stessoTipo = parte !== 'lenti' || (c.dataset.tipo || lenteBase(dati)) === tipoLente;
        return stessoTipo && c.dataset.color.toLowerCase() === colori[parte].toLowerCase();
    });
    if (attuale) seleziona(attuale, campioni);
    else scriviValore(gruppo, 'Personalizzato');
});

// gli accostamenti: 4 pallini con i colori, poi il nome
tavolozza.a.forEach(function (acc) {
    const scelti = acc[1].map(function (n, i) { return tavolozza[chiaviTavolozza[i]][n]; });
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'accostamento';
    b.dataset.nome = acc[0];
    const pallini = document.createElement('span');
    pallini.className = 'pallini';
    scelti.forEach(function (c) {
        const p = document.createElement('span');
        p.className = 'pallino';
        p.style.backgroundColor = c[1];
        pallini.appendChild(p);
    });
    b.appendChild(pallini);
    b.appendChild(document.createTextNode(acc[0]));
    contenitoreAccostamenti.appendChild(b);

    b.addEventListener('click', function () {
        gruppiColore.forEach(function (gruppo, i) {
            coloraParte(chiaviParti[i], scelti[i][1], scelti[i][2]);
            gruppo.querySelectorAll('.campione').forEach(function (c) {
                c.classList.toggle('selected', c.dataset.color === scelti[i][1]);
            });
            scriviValore(gruppo, scelti[i][0]);
        });
        seleziona(b, contenitoreAccostamenti.querySelectorAll('.accostamento'));
    });
});
deselezionaAccostamenti();

// la finitura
bottoniFinitura.forEach(function (bottone) {
    if (bottone.dataset.finitura === finitura) seleziona(bottone, bottoniFinitura);
    bottone.addEventListener('click', function () {
        applicaFinitura(bottone.dataset.finitura);
        seleziona(bottone, bottoniFinitura);
    });
});

// nascondi / mostra gli occhiali, per confrontare
const bottoneNascondi = document.querySelector('.btn-nascondi');
bottoneNascondi.addEventListener('click', function () {
    occhialiVisibili = !occhialiVisibili;
    aggiornaScalaOcchiali();
    bottoneNascondi.classList.toggle('selected', !occhialiVisibili);
    bottoneNascondi.textContent = occhialiVisibili ? 'Nascondi occhiali' : 'Mostra occhiali';
});

// ===== 8. si parte =====
(async function () {
    mostraMessaggio('Consenti l\'accesso alla fotocamera per provare gli occhiali');
    const ok = await avviaFotocamera();
    if (!ok) return;
    mostraMessaggio('Preparo il riconoscimento del viso…');
    try {
        await avviaRiconoscitore();
        mostraMessaggio('Mettiti davanti alla fotocamera');
    } catch (e) {
        mostraMessaggio('Non riesco a caricare il riconoscimento del viso: controlla la connessione');
    }
})();

anima();
