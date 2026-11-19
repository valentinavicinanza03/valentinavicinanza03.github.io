import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cartella, modelli, tavolozze, preparaModello, idDi, linkProdotto, dividiInParti, materialiDi, linkProva, impostaLente, lenteBase, coloriLenti, SFONDO_SPECCHIO } from './modelli.js';

// la pagina di un occhiale della libreria: stessa struttura della row degli occhiali in index.html
// (visore con l'ombra, il quadrante "Il percorso" e il pannello con le opzioni).
// Cambiano solo il modello e i suoi colori, scelti dall'indirizzo: prodotto.html?m=nomefile

const velocita = 0.004;   // la stessa della libreria

let dettaglioPerno = null;  // la copia del modello mostrata nel dettaglio
let gira = false;           // il bottone "Gira": spento di default, come sopra
let chiuse = false;         // stanghette chiuse?
let apertura = 0;           // 0 = aperte, 1 = chiuse (la usiamo per l'animazione)
let perniStanghette = [];   // i perni sulle cerniere, ognuno con il suo lato (-1 sinistra, 1 destra)
let parti = null;           // le mesh del modello divise per parte
let scalaBaseDettaglio = 1;
let scalaCalibro = 1;
const angoloChiuse = THREE.MathUtils.degToRad(85);

// la row: è già scritta in prodotto.html, qui prendiamo i suoi pezzi
const dettaglio = document.querySelector('.libreria-dettaglio');
const visoreDettaglio = dettaglio.querySelector('.libreria-dettaglio-visore');
const visorePercorsoD = dettaglio.querySelector('.libreria-dettaglio-percorso');
const opzioni = dettaglio.querySelector('.libreria-opzioni');

// i 4 gruppi di colori nell'ordine montatura, stanghette, lenti, cerniere (i campioni li riempiamo per ogni modello)
const gruppiColoreD = opzioni.querySelectorAll('.campioni');
const chiaviParti = ['montatura', 'stanghette', 'lenti', 'cerniere'];
const chiaviTavolozza = ['m', 's', 'l', 'c'];
gruppiColoreD.forEach(function (g, i) { g.dataset.parti = chiaviParti[i]; });
const contenitoreAccostamenti = opzioni.querySelector('.accostamenti');

const misureD = opzioni.querySelectorAll('.misura');
const finitureD = opzioni.querySelectorAll('.finitura[data-finitura]');
const bottoneStanghetteD = opzioni.querySelector('.btn-stanghette');
const bottoneGiraD = opzioni.querySelector('.btn-gira');

function scriviValore(elemento, testo) {
    const valore = elemento.closest('.opzione').querySelector('.opzione-valore');
    if (valore) valore.textContent = testo;
}

function selezionaD(bottone, gruppo) {
    gruppo.forEach(function (b) { b.classList.remove('selected'); });
    bottone.classList.add('selected');
    scriviValore(bottone, bottone.dataset.nome);
}

function deselezionaAccostamentiD() {
    contenitoreAccostamenti.querySelectorAll('.accostamento').forEach(function (a) { a.classList.remove('selected'); });
    scriviValore(contenitoreAccostamenti, 'Personalizzato');
}

// le lenti colorate: lo stesso materiale delle lenti degli occhiali sopra
const materialeLenti = new THREE.MeshPhysicalMaterial({
    color: 0x3a3a3a, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.6, envMapIntensity: 1.2
});

function preparaParti() {
    parti = { montatura: [], stanghette: [], lenti: [], cerniere: [] };
    perniStanghette = [];

    // misuriamo il modello senza scala e senza rotazione, così le misure sono quelle del perno
    dettaglioPerno.scale.setScalar(1);
    dettaglioPerno.rotation.set(0, 0, 0);
    dettaglioPerno.updateMatrixWorld(true);

    // le parti (montatura, stanghette, lenti, cerniere): vedi dividiInParti in modelli.js
    parti = dividiInParti(dettaglioPerno);
    dettaglioPerno.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    parti.lenti.forEach(function (m) { m.castShadow = false; });  // le lenti non fanno un'ombra piena

    // le stanghette: per ogni lato un perno sulla cerniera, cioè sulla punta davanti della stanghetta
    [-1, 1].forEach(function (lato) {
        const pezzi = parti.stanghette.filter(function (m) {
            const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
            return Math.sign(c.x) === lato;
        });
        if (pezzi.length === 0) return;

        const box = new THREE.Box3();
        pezzi.forEach(function (m) { box.expandByObject(m); });

        const perno = new THREE.Group();
        perno.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z);
        perno.userData.lato = lato;
        dettaglioPerno.add(perno);
        dettaglioPerno.updateMatrixWorld(true);
        pezzi.forEach(function (m) { perno.attach(m); });  // entrano nel perno senza spostarsi
        perniStanghette.push(perno);
    });

    applicaCalibro();
}

// il calibro cambia la grandezza; il pavimento (con l'ombra) resta sempre appena sotto gli occhiali
function applicaCalibro() {
    if (!dettaglioPerno) return;
    const rotazione = dettaglioPerno.rotation.y;
    dettaglioPerno.rotation.y = 0;
    dettaglioPerno.scale.setScalar(scalaBaseDettaglio * scalaCalibro);
    dettaglioPerno.updateMatrixWorld(true);
    pavimentoD.position.y = new THREE.Box3().setFromObject(dettaglioPerno).min.y - 0.02;
    dettaglioPerno.rotation.y = rotazione;
}

// tipo: solo per le lenti, 'normale' o 'specchio' (se manca: il tipo di partenza del modello)
function coloraParte(parte, colore, tipo) {
    if (!parti) return;
    if (parte === 'lenti') {
        materialeLenti.color.set(colore);
        impostaLente(materialeLenti, tipo || lenteBase(dati), parti.lenti);
    }
    parti[parte].forEach(function (m) {
        if (parte === 'lenti') {
            m.material = materialeLenti;
        } else {
            materialiDi(m).forEach(function (mat) {
                if (mat.color) mat.color.set(colore);
                mat.map = null;            // via le texture del file, così si vede il colore scelto
                mat.needsUpdate = true;
            });
        }
    });
}

function applicaFinituraD(finitura) {
    if (!parti) return;
    ['montatura', 'stanghette', 'cerniere'].forEach(function (parte) {
        parti[parte].forEach(function (m) {
            materialiDi(m).forEach(function (mat) {
                if (!('roughness' in mat)) return;
                mat.roughness = finitura === 'opaca' ? 0.85 : 0.15;
                mat.envMapIntensity = finitura === 'opaca' ? 0.4 : 0.9;
            });
        });
    });
}

// --- i campioni e gli accostamenti: si riempiono con la tavolozza del modello aperto ---
function bottoneCampione(colore) {
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
    return b;
}

function riempiPannello(t) {
    // i campioni: il primo di ogni gruppo è quello scelto all'inizio
    gruppiColoreD.forEach(function (gruppo, i) {
        let lista = t[chiaviTavolozza[i]];
        if (gruppo.dataset.parti === 'lenti') lista = coloriLenti(dati, lista);   // + lo specchio sfumato
        gruppo.innerHTML = '';
        lista.forEach(function (colore) { gruppo.appendChild(bottoneCampione(colore)); });

        const campioni = gruppo.querySelectorAll('.campione');
        campioni.forEach(function (campione) {
            campione.addEventListener('click', function () {
                coloraParte(gruppo.dataset.parti, campione.dataset.color, campione.dataset.tipo);
                selezionaD(campione, campioni);
                deselezionaAccostamentiD();
            });
        });
        selezionaD(campioni[0], campioni);
        coloraParte(gruppo.dataset.parti, lista[0][1], lista[0][2]);
    });

    // gli accostamenti: 4 pallini con i colori, poi il nome
    contenitoreAccostamenti.innerHTML = '';
    t.a.forEach(function (acc) {
        const colori = acc[1].map(function (n, i) { return t[chiaviTavolozza[i]][n]; });
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'accostamento';
        b.dataset.nome = acc[0];
        const pallini = document.createElement('span');
        pallini.className = 'pallini';
        colori.forEach(function (c) {
            const p = document.createElement('span');
            p.className = 'pallino';
            p.style.backgroundColor = c[1];
            pallini.appendChild(p);
        });
        b.appendChild(pallini);
        b.appendChild(document.createTextNode(acc[0]));
        contenitoreAccostamenti.appendChild(b);

        b.addEventListener('click', function () {
            gruppiColoreD.forEach(function (gruppo, i) {
                coloraParte(gruppo.dataset.parti, colori[i][1], colori[i][2]);
                gruppo.querySelectorAll('.campione').forEach(function (c) {
                    c.classList.toggle('selected', c.dataset.color === colori[i][1]);
                });
                scriviValore(gruppo, colori[i][0]);
            });
            selezionaD(b, contenitoreAccostamenti.querySelectorAll('.accostamento'));
        });
    });
    deselezionaAccostamentiD();
}

// il pannello torna allo stato iniziale: calibro medio, finitura lucida, stanghette aperte, gira spento
function azzeraPannello() {
    misureD.forEach(function (m) { if (m.dataset.misura === '52') selezionaD(m, misureD); });
    scalaCalibro = 1;
    finitureD.forEach(function (f) { if (f.dataset.finitura === 'lucida') selezionaD(f, finitureD); });

    chiuse = false;
    apertura = 0;
    bottoneStanghetteD.classList.remove('selected');
    bottoneStanghetteD.textContent = 'Chiudi stanghette';
    gira = false;
    bottoneGiraD.classList.remove('selected');
}

misureD.forEach(function (misura) {
    misura.addEventListener('click', function () {
        scalaCalibro = Number(misura.dataset.misura) / 52;   // 48 → 0.92, 52 → 1, 56 → 1.08
        applicaCalibro();
        selezionaD(misura, misureD);
    });
});

finitureD.forEach(function (finitura) {
    finitura.addEventListener('click', function () {
        applicaFinituraD(finitura.dataset.finitura);
        selezionaD(finitura, finitureD);
    });
});

bottoneStanghetteD.addEventListener('click', function () {
    chiuse = !chiuse;
    bottoneStanghetteD.classList.toggle('selected', chiuse);
    bottoneStanghetteD.textContent = chiuse ? 'Apri stanghette' : 'Chiudi stanghette';
});

bottoneGiraD.addEventListener('click', function () {
    gira = !gira;
    bottoneGiraD.classList.toggle('selected', gira);
});

// --- la scena del dettaglio: stesse luci e stessa ombra a terra degli occhiali sopra ---
const scenaDettaglio = new THREE.Scene();
scenaDettaglio.add(new THREE.AmbientLight(0xffffff, 0.3));
const luceDettaglio = new THREE.DirectionalLight(0xffffff, 1.5);
luceDettaglio.position.set(4, 7, 1);
luceDettaglio.castShadow = true;
luceDettaglio.shadow.mapSize.set(1024, 1024);
luceDettaglio.shadow.radius = 6;
scenaDettaglio.add(luceDettaglio);

const pavimentoD = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.18 })
);
pavimentoD.rotation.x = -Math.PI / 2;
pavimentoD.receiveShadow = true;
scenaDettaglio.add(pavimentoD);

function nuovoRenderer(contenitore) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    contenitore.appendChild(r.domElement);
    return r;
}

// il visore grande, che si può trascinare e zoomare
const rendererDettaglio = nuovoRenderer(visoreDettaglio);
scenaDettaglio.environment = new THREE.PMREMGenerator(rendererDettaglio)
    .fromScene(new RoomEnvironment(), 0.04).texture;

const cameraDettaglio = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
const posizioneIniziale = new THREE.Vector3(3, 2, 4).multiplyScalar(0.8);  // di tre quarti, come sopra
const controlliDettaglio = new OrbitControls(cameraDettaglio, rendererDettaglio.domElement);
controlliDettaglio.enableDamping = true;

// il quadrante "Il percorso": la camera passa da sola tra tre viste (come sopra)
const rendererPercorsoD = nuovoRenderer(visorePercorsoD);
const ambientePercorsoD = new THREE.PMREMGenerator(rendererPercorsoD).fromScene(new RoomEnvironment(), 0.04).texture;
const cameraPercorsoD = new THREE.PerspectiveCamera(45, 1, 0.01, 100);

const vistePercorsoD = [
    [-1.789, 2.843, 3.166],
    [0.2, 0.4, 4.6],       // di fronte, come allo specchio
    [3.9, 1.2, -1.6]       // di lato, si vedono le stanghette
].map(function (p) { return new THREE.Vector3().fromArray(p).multiplyScalar(0.8); });
const tempoMovimento = 1.5, tempoFermo = 2;
const percorsoD = { fase: 'fermo', tempo: 0, da: 0, a: 0 };
const orologio = new THREE.Clock();

function morbido(t) {
    return t * t * (3 - 2 * t);
}

const sferaDa = new THREE.Spherical(), sferaA = new THREE.Spherical(), puntoD = new THREE.Vector3();
function posizionaPercorsoD(da, a, t) {
    sferaDa.setFromVector3(da);
    sferaA.setFromVector3(a);
    let diff = sferaA.theta - sferaDa.theta;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    puntoD.setFromSphericalCoords(
        sferaDa.radius + (sferaA.radius - sferaDa.radius) * t,
        sferaDa.phi + (sferaA.phi - sferaDa.phi) * t,
        sferaDa.theta + diff * t
    );
    cameraPercorsoD.position.copy(puntoD);
    cameraPercorsoD.lookAt(0, 0, 0);
}

function aggiornaPercorsoD(delta) {
    percorsoD.tempo += delta;
    if (percorsoD.fase === 'fermo') {
        posizionaPercorsoD(vistePercorsoD[percorsoD.a], vistePercorsoD[percorsoD.a], 0);
        if (percorsoD.tempo >= tempoFermo) {
            percorsoD.da = percorsoD.a;
            percorsoD.a = (percorsoD.a + 1) % vistePercorsoD.length;
            percorsoD.fase = 'movimento';
            percorsoD.tempo = 0;
        }
    } else {
        const t = Math.min(percorsoD.tempo / tempoMovimento, 1);
        posizionaPercorsoD(vistePercorsoD[percorsoD.da], vistePercorsoD[percorsoD.a], morbido(t));
        if (t >= 1) {
            percorsoD.fase = 'fermo';
            percorsoD.tempo = 0;
        }
    }
}

function disegnaDettaglio() {
    const delta = Math.min(orologio.getDelta(), 0.1);
    if (!dettaglioPerno) return;

    if (gira) dettaglioPerno.rotation.y -= velocita * 2;   // "Gira": da destra a sinistra

    // le stanghette si chiudono (o si aprono) piano sulla cerniera
    apertura += ((chiuse ? 1 : 0) - apertura) * 0.08;
    perniStanghette.forEach(function (perno) {
        perno.rotation.y = perno.userData.lato * angoloChiuse * apertura;
    });

    controlliDettaglio.update();
    rendererDettaglio.render(scenaDettaglio, cameraDettaglio);

    aggiornaPercorsoD(delta);
    const ambiente = scenaDettaglio.environment;
    scenaDettaglio.environment = ambientePercorsoD;
    rendererPercorsoD.render(scenaDettaglio, cameraPercorsoD);
    scenaDettaglio.environment = ambiente;
}

function ridimensionaDettaglio() {
    [[visoreDettaglio, rendererDettaglio, cameraDettaglio], [visorePercorsoD, rendererPercorsoD, cameraPercorsoD]]
        .forEach(function ([contenitore, r, cam]) {
            const w = contenitore.clientWidth;
            const h = contenitore.clientHeight;
            if (!w || !h) return;
            r.setSize(w, h);
            cam.aspect = w / h;
            cam.updateProjectionMatrix();
        });
}

// ===== la pagina: quale occhiale mostrare lo dice l'indirizzo (prodotto.html?m=nomefile) =====
const id = new URLSearchParams(location.search).get('m');
const indice = Math.max(0, modelli.findIndex(function (m) { return idDi(m) === id; }));
const dati = modelli[indice];

document.title = dati.nome + ' – I nostri prodotti';

// il tipo di lente di partenza (a specchio per esempio per gli occhiali di Edoardo Fabbri)
impostaLente(materialeLenti, lenteBase(dati));
dettaglio.querySelector('.libreria-dettaglio-nome').textContent = dati.nome;
dettaglio.querySelector('.libreria-dettaglio-autore').textContent = dati.nome;

// i link agli occhiali prima e dopo nella libreria
const precedente = modelli[(indice - 1 + modelli.length) % modelli.length];
const successivo = modelli[(indice + 1) % modelli.length];
const linkPrima = document.querySelector('.prodotto-precedente');
const linkDopo = document.querySelector('.prodotto-successivo');
linkPrima.href = linkProdotto(precedente);
linkPrima.querySelector('.prodotto-nav-nome').textContent = precedente.nome;
linkDopo.href = linkProdotto(successivo);
linkDopo.querySelector('.prodotto-nav-nome').textContent = successivo.nome;

azzeraPannello();
bottoneStanghetteD.disabled = true;

cameraDettaglio.position.copy(posizioneIniziale);
controlliDettaglio.target.set(0, 0, 0);
controlliDettaglio.update();
ridimensionaDettaglio();

const segnaposto = visoreDettaglio.querySelector('.visore-segnaposto');
new GLTFLoader().load(encodeURI(cartella + dati.file), function (gltf) {
    dettaglioPerno = preparaModello(gltf, dati);
    scalaBaseDettaglio = dettaglioPerno.userData.scalaBase;
    preparaParti();
    dettaglioPerno.rotation.set(0, 0, 0);
    scenaDettaglio.add(dettaglioPerno);

    // i colori di questo modello, già applicati (il primo campione di ogni parte), e la finitura lucida
    riempiPannello(tavolozze[dati.nome] || tavolozze['Valentina Vicinanza']);
    applicaFinituraD('lucida');

    // se non abbiamo trovato le stanghette il bottone non serve
    bottoneStanghetteD.disabled = perniStanghette.length === 0;
    segnaposto.style.display = 'none';
}, undefined, function () {
    segnaposto.textContent = 'Modello non disponibile';
});

// il bottone "Provami": apre la prova con la fotocamera, con i colori e la finitura scelti adesso
const bottoneProvami = document.querySelector('.btn-provami');
bottoneProvami.href = linkProva(dati);
bottoneProvami.addEventListener('click', function (e) {
    const colori = {};
    gruppiColoreD.forEach(function (gruppo) {
        const scelto = gruppo.querySelector('.campione.selected') || gruppo.querySelector('.campione');
        if (scelto) colori[gruppo.dataset.parti] = scelto.dataset.color;
    });
    const finitura = opzioni.querySelector('.finitura[data-finitura].selected');
    if (Object.keys(colori).length === 4) {
        e.preventDefault();
        const lente = opzioni.querySelector('.campioni[data-parti="lenti"] .campione.selected');
        const tipoLente = (lente && lente.dataset.tipo) || lenteBase(dati);
        location.href = linkProva(dati, colori, finitura ? finitura.dataset.finitura : 'lucida', tipoLente);
    }
});

window.addEventListener('resize', ridimensionaDettaglio);

function anima() {
    requestAnimationFrame(anima);
    disegnaDettaglio();
}
anima();
