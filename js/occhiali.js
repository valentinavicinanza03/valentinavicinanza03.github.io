import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// il visualizzatore degli occhiali: stessa struttura di configuratore.js (la PH5),
// ma con le parti del modello occhiali.glb

// la sezione degli occhiali: cerchiamo i bottoni solo qui dentro, così non prendiamo quelli della PH5
const sezione = document.getElementById('sezione-occhiali');
const visore = document.getElementById('visore-occhiali');

// 1. la scena
const scena = new THREE.Scene();

// 2. la camera
const camera = new THREE.PerspectiveCamera(45, visore.clientWidth / visore.clientHeight, 0.1, 100);
camera.position.set(3, 2, 4);

// 3. il renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(visore.clientWidth, visore.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
visore.prepend(renderer.domElement);

// 3b. l'ambiente riflesso (si vede nei riflessi delle lenti e della montatura lucida)
const pmrem = new THREE.PMREMGenerator(renderer);
scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// 4. le luci
const luceAmbiente = new THREE.AmbientLight(0xffffff, 0.3);
scena.add(luceAmbiente);
const luce = new THREE.DirectionalLight(0xffffff, 1.5);
luce.position.set(4, 7, 1);
luce.castShadow = true;
luce.shadow.mapSize.set(1024, 1024);
luce.shadow.radius = 6;
scena.add(luce);

// 4b. il pavimento invisibile: si vede solo l'ombra
const pavimento = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.18 })
);
pavimento.rotation.x = -Math.PI / 2;
pavimento.position.y = -1;               // gli occhiali sono bassi: il pavimento sta più vicino
pavimento.receiveShadow = true;
scena.add(pavimento);

// 5. gli occhiali: carichiamo il modello 3D dal file models/occhiali.glb
const oggetto = new THREE.Group();
scena.add(oggetto);

// i gruppi del file che usiamo: ogni parte del modello appartiene a uno di questi
const nomiGruppi = ['montatura', 'STANGHETTE', 'LENTI', 'ganci'];

// per ogni gruppo, la lista dei materiali delle sue parti (un gruppo ha molte parti)
const materialiPerGruppo = { montatura: [], STANGHETTE: [], LENTI: [], ganci: [] };
const tuttiMateriali = []; // quelli a cui cambia la finitura (tutti tranne le lenti)

// le due stanghette, ognuna dentro un "perno" che le fa ruotare sulla cerniera
const perni = [];

// risale dalla parte fino al gruppo a cui appartiene (montatura, LENTI...)
function gruppoDi(parte) {
    let p = parte;
    while (p) {
        if (nomiGruppi.includes(p.name)) return p.name;
        p = p.parent;
    }
    return null;
}

new GLTFLoader().load('models/occhiali.glb', function (gltf) {
    const occhiali = gltf.scene;

    // il file contiene anche le tavole di disegno (linee e quote): le nascondiamo
    const tavole = occhiali.getObjectByName('tavole');
    if (tavole) tavole.visible = false;

    occhiali.traverse(function (parte) {
        // le linee (contorni del disegno tecnico) non servono nel 3D
        if (parte.isLine || parte.isLineSegments) {
            parte.visible = false;
            return;
        }
        if (!parte.isMesh) return;

        const gruppo = gruppoDi(parte);
        if (!gruppo) return;

        parte.castShadow = true;

        if (gruppo === 'LENTI') {
            // le lenti: un materiale trasparente, colorato e sempre lucido
            parte.material = new THREE.MeshPhysicalMaterial({
                color: 0x3a3a3a,
                metalness: 0,
                roughness: 0.05,
                transparent: true,
                opacity: 0.6,
                envMapIntensity: 1.2
            });
            parte.castShadow = false; // le lenti trasparenti non fanno un'ombra piena
        } else {
            parte.material = parte.material.clone();
            if (gruppo === 'ganci') {
                parte.material.metalness = 1; // le cerniere sono di metallo
            }
            tuttiMateriali.push(parte.material);
        }
        materialiPerGruppo[gruppo].push(parte.material);
    });

    // le stanghette: nel file la sinistra e la destra sono due oggetti separati.
    // mettiamo ognuna in un perno posto sulla sua cerniera (misure in metri, come il modello)
    const stanghette = occhiali.getObjectByName('STANGHETTE');
    if (stanghette) {
        stanghette.children.slice().forEach(function (stanghetta) {
            const centro = new THREE.Box3().setFromObject(stanghetta).getCenter(new THREE.Vector3());
            const lato = centro.x < 0 ? -1 : 1;      // -1 sinistra, 1 destra

            const perno = new THREE.Group();
            perno.position.set(lato * 0.0705, 0.034, -0.088); // dove sta la vite della cerniera
            stanghette.add(perno);
            perno.attach(stanghetta);                 // la stanghetta entra nel perno senza spostarsi
            perno.userData.lato = lato;
            perni.push(perno);
        });
    }

    // il modello è in metri (largo circa 15 cm): lo portiamo a una larghezza di 2.6 e lo centriamo
    const scatola = new THREE.Box3();
    occhiali.traverse(function (parte) {
        if (parte.isMesh && parte.visible && gruppoDi(parte)) {
            scatola.expandByObject(parte);
        }
    });
    const dimensioni = scatola.getSize(new THREE.Vector3());
    const centro = scatola.getCenter(new THREE.Vector3());
    const scala = 2.6 / dimensioni.x;
    occhiali.scale.setScalar(scala);
    occhiali.position.copy(centro).multiplyScalar(-scala);

    oggetto.add(occhiali);

    // la composizione esplosa usa una copia degli occhiali (vedi 10)
    preparaEsploso(occhiali);

    // il modello c'è: applichiamo colori e finitura scelti nei bottoni
    sezione.querySelectorAll('.campioni').forEach(function (gruppo) {
        applicaColore(gruppo, gruppo.querySelector('.campione.selected').dataset.color);
    });
    applicaFinitura(sezione.querySelector('.finitura.selected').dataset.finitura);

    visore.querySelector('.visore-segnaposto').style.display = 'none';
}, undefined, function (errore) {
    console.error('Non riesco a caricare il modello occhiali.glb:', errore);
});

// colora tutte le parti dei gruppi scritti nel data-parti
function applicaColore(gruppo, colore) {
    gruppo.dataset.parti.split(' ').forEach(function (nome) {
        (materialiPerGruppo[nome] || []).forEach(function (materiale) {
            materiale.color.set(colore);
        });
    });
}

// segna il bottone come "selected" e scrive il suo nome accanto al titolo dell'opzione
function selezionaBottone(bottone, gruppo) {
    gruppo.forEach(function (b) {
        b.classList.remove('selected');
    });
    bottone.classList.add('selected');

    const valore = bottone.closest('.opzione').querySelector('.opzione-valore');
    valore.textContent = bottone.dataset.nome;
}

// 5b. i campioni
sezione.querySelectorAll('.campioni').forEach(function (gruppo) {
    const campioni = gruppo.querySelectorAll('.campione');

    campioni.forEach(function (campione) {
        campione.addEventListener('click', function () {
            applicaColore(gruppo, campione.dataset.color);
            selezionaBottone(campione, campioni);
            deselezionaAccostamenti();
        });
    });
});

// 5c. gli accostamenti: colorano insieme le 4 parti (montatura, stanghette, lenti, cerniere)
const accostamenti = sezione.querySelectorAll('.accostamento');
const gruppiColore = sezione.querySelectorAll('.campioni');

accostamenti.forEach(function (accostamento) {
    accostamento.addEventListener('click', function () {
        const colori = accostamento.dataset.colori.split(',');
        const nomi = accostamento.dataset.nomiColori.split(',');

        gruppiColore.forEach(function (gruppo, i) {
            applicaColore(gruppo, colori[i]);

            // segniamo il campione che ha lo stesso colore (se c'è)
            gruppo.querySelectorAll('.campione').forEach(function (c) {
                c.classList.toggle('selected', c.dataset.color === colori[i]);
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

// 5d. il calibro: il Medio (52 mm) è la grandezza "normale", cioè scala 1
function scalaPerMisura(misura) {
    return Number(misura) / 52; // 48 → 0.92, 52 → 1, 56 → 1.08
}

const misure = sezione.querySelectorAll('.misura');
oggetto.scale.setScalar(scalaPerMisura(sezione.querySelector('.misura.selected').dataset.misura));

misure.forEach(function (misura) {
    misura.addEventListener('click', function () {
        oggetto.scale.setScalar(scalaPerMisura(misura.dataset.misura));
        selezionaBottone(misura, misure);
    });
});

// 5e. le finiture (le lenti restano sempre lucide)
function applicaFinitura(finitura) {
    tuttiMateriali.forEach(function (materiale) {
        if (finitura === 'opaca') {
            materiale.roughness = 0.85;
            materiale.envMapIntensity = 0.4;
        } else {
            materiale.roughness = 0.15;
            materiale.envMapIntensity = 0.9;
        }
    });
}

const finiture = sezione.querySelectorAll('.finitura[data-finitura]'); // solo Lucida e Opaca

finiture.forEach(function (finitura) {
    finitura.addEventListener('click', function () {
        applicaFinitura(finitura.dataset.finitura);
        selezionaBottone(finitura, finiture);
    });
});

// 5f. chiudi e apri le stanghette: ruotano piano sulla cerniera
let chiuse = false;
let apertura = 0; // 0 = aperte, 1 = chiuse (la usiamo per l'animazione)
const bottoneStanghette = sezione.querySelector('.btn-stanghette');

bottoneStanghette.addEventListener('click', function () {
    chiuse = !chiuse;
    bottoneStanghette.classList.toggle('selected', chiuse);
    bottoneStanghette.textContent = chiuse ? 'Apri stanghette' : 'Chiudi stanghette';
});

// 5g. gira: gli occhiali ruotano da soli
const bottoneGira = sezione.querySelector('.btn-gira');
bottoneGira.addEventListener('click', function () {
    controlli.autoRotate = !controlli.autoRotate;
    bottoneGira.classList.toggle('selected', controlli.autoRotate);
});

// 6. i controlli
const controlli = new OrbitControls(camera, renderer.domElement);
controlli.enableDamping = true;
controlli.autoRotateSpeed = 3;

// 7. se la finestra cambia misura, adattiamo camera e canvas
window.addEventListener('resize', function () {
    camera.aspect = visore.clientWidth / visore.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(visore.clientWidth, visore.clientHeight);
});

// 9. il secondo quadrante: la camera che si muove da sola tra tre viste
const animazionePercorso = {
    movimento: 1.5,
    fermo: 2,
    viste: [
        { posizione: [-1.789, 2.843, 3.166], target: [0, 0, 0] },
        { posizione: [0.2, 0.4, 4.6], target: [0, 0, 0] },      // di fronte, come allo specchio
        { posizione: [3.9, 1.2, -1.6], target: [0, 0, 0] }      // di lato, si vedono le stanghette
    ]
};

const visorePercorso = document.getElementById('visore-occhiali-percorso');

const cameraPercorso = new THREE.PerspectiveCamera(45, visorePercorso.clientWidth / visorePercorso.clientHeight, 0.1, 100);
const rendererPercorso = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rendererPercorso.setPixelRatio(window.devicePixelRatio);
rendererPercorso.setSize(visorePercorso.clientWidth, visorePercorso.clientHeight);
rendererPercorso.shadowMap.enabled = true;
rendererPercorso.shadowMap.type = THREE.PCFShadowMap;
visorePercorso.appendChild(rendererPercorso.domElement);

const ambientePercorso = new THREE.PMREMGenerator(rendererPercorso).fromScene(new RoomEnvironment(), 0.04).texture;

const vistePercorso = animazionePercorso.viste.map(function (v) {
    return { posizione: new THREE.Vector3().fromArray(v.posizione), target: new THREE.Vector3().fromArray(v.target) };
});

const percorso = { fase: 'fermo', tempo: 0, da: 0, a: 0 };
const targetPercorso = new THREE.Vector3();

function morbido(t) {
    return t * t * (3 - 2 * t);
}

const sfericaDa = new THREE.Spherical();
const sfericaA = new THREE.Spherical();
const scarto = new THREE.Vector3();

function posizionaCameraPercorso(da, a, t) {
    targetPercorso.lerpVectors(da.target, a.target, t);

    sfericaDa.setFromVector3(scarto.subVectors(da.posizione, da.target));
    sfericaA.setFromVector3(scarto.subVectors(a.posizione, a.target));

    let differenza = sfericaA.theta - sfericaDa.theta;
    if (differenza > Math.PI) differenza -= Math.PI * 2;
    if (differenza < -Math.PI) differenza += Math.PI * 2;

    scarto.setFromSphericalCoords(
        sfericaDa.radius + (sfericaA.radius - sfericaDa.radius) * t,
        sfericaDa.phi + (sfericaA.phi - sfericaDa.phi) * t,
        sfericaDa.theta + differenza * t
    );
    cameraPercorso.position.copy(targetPercorso).add(scarto);
    cameraPercorso.lookAt(targetPercorso);
}

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

function disegnaPercorso() {
    const ambiente = scena.environment;
    scena.environment = ambientePercorso;
    rendererPercorso.render(scena, cameraPercorso);
    scena.environment = ambiente;
}

window.addEventListener('resize', function () {
    cameraPercorso.aspect = visorePercorso.clientWidth / visorePercorso.clientHeight;
    cameraPercorso.updateProjectionMatrix();
    rendererPercorso.setSize(visorePercorso.clientWidth, visorePercorso.clientHeight);
});

// 10. la composizione esplosa: una terza scena con una copia degli occhiali,
// in cui ogni parte si allontana dalla montatura lungo una sua direzione
const visoreEsploso = document.getElementById('visore-esploso');

const scenaEsplosa = new THREE.Scene();

const cameraEsplosa = new THREE.PerspectiveCamera(40, visoreEsploso.clientWidth / visoreEsploso.clientHeight, 0.1, 100);
cameraEsplosa.position.set(4.2, 3.2, 6.2);

const rendererEsploso = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rendererEsploso.setPixelRatio(window.devicePixelRatio);
rendererEsploso.setSize(visoreEsploso.clientWidth, visoreEsploso.clientHeight);
rendererEsploso.shadowMap.enabled = true;
rendererEsploso.shadowMap.type = THREE.PCFShadowMap;
visoreEsploso.prepend(rendererEsploso.domElement);

// le etichette sono normali <div> HTML che seguono le parti: le disegna il CSS2DRenderer
const rendererEtichette = new CSS2DRenderer();
rendererEtichette.setSize(visoreEsploso.clientWidth, visoreEsploso.clientHeight);
rendererEtichette.domElement.className = 'strato-etichette';
visoreEsploso.appendChild(rendererEtichette.domElement);

scenaEsplosa.environment = new THREE.PMREMGenerator(rendererEsploso).fromScene(new RoomEnvironment(), 0.04).texture;

scenaEsplosa.add(new THREE.AmbientLight(0xffffff, 0.3));
const luceEsplosa = new THREE.DirectionalLight(0xffffff, 1.5);
luceEsplosa.position.set(4, 7, 1);
luceEsplosa.castShadow = true;
luceEsplosa.shadow.mapSize.set(1024, 1024);
luceEsplosa.shadow.radius = 6;
luceEsplosa.shadow.camera.left = -5;   // la zona dell'ombra si allarga: le parti sono più sparse
luceEsplosa.shadow.camera.right = 5;
luceEsplosa.shadow.camera.top = 5;
luceEsplosa.shadow.camera.bottom = -5;
scenaEsplosa.add(luceEsplosa);

const pavimentoEsploso = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.15 })
);
pavimentoEsploso.rotation.x = -Math.PI / 2;
pavimentoEsploso.position.y = -1.2;
pavimentoEsploso.receiveShadow = true;
scenaEsplosa.add(pavimentoEsploso);

const controlliEsplosi = new OrbitControls(cameraEsplosa, rendererEsploso.domElement);
controlliEsplosi.enableDamping = true;

// le parti che si muovono: per ognuna la posizione di partenza e lo spostamento massimo (in metri)
const pezzi = [];
const etichette = [];
let esploso = 0;            // 0 = montati, 1 = esplosi (cambia piano verso "obiettivoEsploso")
let obiettivoEsploso = 1;   // si parte montati e le parti si aprono da sole appena caricate

// aggiunge una parte alla composizione esplosa, con il suo spostamento
function aggiungiPezzo(oggetto3d, spostamento) {
    pezzi.push({
        oggetto: oggetto3d,
        partenza: oggetto3d.position.clone(),
        spostamento: new THREE.Vector3().fromArray(spostamento)
    });
}

// mette un'etichetta sulla parte: "dove" sceglie il punto (centro, sopra o sotto la parte)
function aggiungiEtichetta(oggetto3d, testo, dove) {
    const scatola = new THREE.Box3().setFromObject(oggetto3d);
    const punto = scatola.getCenter(new THREE.Vector3());
    if (dove === 'sopra') punto.y = scatola.max.y;
    if (dove === 'sotto') punto.y = scatola.min.y;

    const div = document.createElement('div');
    div.className = 'etichetta-esploso etichetta-' + dove;
    div.textContent = testo;

    const etichetta = new CSS2DObject(div);
    etichetta.position.copy(oggetto3d.worldToLocal(punto)); // il punto, misurato dentro la parte
    oggetto3d.add(etichetta);                                // così l'etichetta si muove con lei
    etichette.push(etichetta);
}

function preparaEsploso(occhiali) {
    // la copia condivide i materiali con l'originale: i colori scelti valgono anche qui
    const copia = occhiali.clone();
    scenaEsplosa.add(copia);
    copia.updateMatrixWorld(true);

    const montatura = copia.getObjectByName('montatura');
    const lenti = copia.getObjectByName('LENTI');
    const ganci = copia.getObjectByName('ganci');
    const stanghette = copia.getObjectByName('STANGHETTE');

    // le etichette vanno messe prima di spostare le parti
    if (montatura) {
        aggiungiPezzo(montatura, [0, 0, 0]);   // la montatura resta ferma al centro
        aggiungiEtichetta(montatura, 'Montatura', 'sopra');
    }
    if (lenti) {
        aggiungiPezzo(lenti, [0, -0.01, 0.06]);  // le lenti escono in avanti
        aggiungiEtichetta(lenti, 'Lenti', 'sotto');
    }
    if (ganci) {
        // sinistra e destra si allontanano verso l'esterno, ognuna dalla sua parte
        ganci.children.forEach(function (gancio) {
            const lato = new THREE.Box3().setFromObject(gancio).getCenter(new THREE.Vector3()).x < 0 ? -1 : 1;
            aggiungiPezzo(gancio, [lato * 0.03, 0.012, -0.005]);
            if (lato > 0) aggiungiEtichetta(gancio, 'Cerniere', 'sopra');
        });
    }
    if (stanghette) {
        // i figli di STANGHETTE sono i perni preparati prima: uno per lato
        stanghette.children.forEach(function (perno) {
            const lato = perno.userData.lato;
            aggiungiPezzo(perno, [lato * 0.06, 0, -0.05]);
            aggiungiEtichetta(perno, lato < 0 ? 'Stanghetta sinistra' : 'Stanghetta destra', 'centro');
        });
    }

    visoreEsploso.querySelector('.visore-segnaposto').style.display = 'none';
}

// la curva morbida anche per l'esploso: le parti partono e arrivano piano
function aggiornaEsploso(delta) {
    esploso += (obiettivoEsploso - esploso) * Math.min(delta * 4, 1);
    const t = morbido(esploso);

    pezzi.forEach(function (pezzo) {
        pezzo.oggetto.position.copy(pezzo.partenza).addScaledVector(pezzo.spostamento, t);
    });

    // le etichette compaiono man mano che le parti si separano
    etichette.forEach(function (etichetta) {
        etichetta.element.style.opacity = Math.min(esploso * 1.5, 1);
    });
}

// i comandi del pannello
const cursoreEsploso = sezione.querySelector('.cursore-esploso');
const valoreEsploso = sezione.querySelector('.valore-esploso');
const bottoneComponi = sezione.querySelector('.btn-componi');
const bottoneEsplodi = sezione.querySelector('.btn-esplodi');
const bottoneEtichette = sezione.querySelector('.btn-etichette');

function impostaEsploso(valore) {
    obiettivoEsploso = valore;
    cursoreEsploso.value = Math.round(valore * 100);
    valoreEsploso.textContent = Math.round(valore * 100) + '%';
    bottoneComponi.classList.toggle('selected', valore === 0);
    bottoneEsplodi.classList.toggle('selected', valore === 1);
}

cursoreEsploso.addEventListener('input', function () {
    impostaEsploso(Number(cursoreEsploso.value) / 100);
});
bottoneComponi.addEventListener('click', function () {
    impostaEsploso(0);
});
bottoneEsplodi.addEventListener('click', function () {
    impostaEsploso(1);
});
bottoneEtichette.addEventListener('click', function () {
    const visibili = rendererEtichette.domElement.classList.toggle('nascoste') === false;
    bottoneEtichette.classList.toggle('selected', visibili);
});

window.addEventListener('resize', function () {
    cameraEsplosa.aspect = visoreEsploso.clientWidth / visoreEsploso.clientHeight;
    cameraEsplosa.updateProjectionMatrix();
    rendererEsploso.setSize(visoreEsploso.clientWidth, visoreEsploso.clientHeight);
    rendererEtichette.setSize(visoreEsploso.clientWidth, visoreEsploso.clientHeight);
});

// 8. il ciclo di disegno
const orologio = new THREE.Clock();

function anima() {
    const delta = Math.min(orologio.getDelta(), 0.1);

    // le stanghette si avvicinano piano alla posizione scelta (circa mezzo secondo)
    const obiettivo = chiuse ? 1 : 0;
    apertura += (obiettivo - apertura) * Math.min(delta * 6, 1);
    perni.forEach(function (perno) {
        // la sinistra gira in un verso, la destra nell'altro; una si chiude un po' meno,
        // così da chiuse si appoggiano una sull'altra invece di attraversarsi
        const angolo = perno.userData.lato < 0 ? 1.45 : 1.6;
        perno.rotation.y = perno.userData.lato * apertura * angolo;
    });

    controlli.update();
    renderer.render(scena, camera);

    aggiornaPercorso(delta);
    disegnaPercorso();

    // il terzo visore: la composizione esplosa
    aggiornaEsploso(delta);
    controlliEsplosi.update();
    rendererEsploso.render(scenaEsplosa, cameraEsplosa);
    rendererEtichette.render(scenaEsplosa, cameraEsplosa);

    requestAnimationFrame(anima);
}
anima();
