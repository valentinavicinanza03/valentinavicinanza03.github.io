import * as THREE from 'three';

// i dati condivisi tra la libreria (index.html) e la pagina di ogni occhiale (prodotto.html)

export const cartella = 'modelli_occhiali_glbxweb/';

// nome del file → nome da mostrare (il nome del file senza .glb è anche l'indirizzo della pagina prodotto)
// ruota: gradi attorno all'asse verticale per i modelli esportati girati al contrario
// (lenti verso il retro invece che verso la camera)
// lentiSpecchio: lenti a specchio con la sfumatura dal blu al viola (vedi i tipi di lente più in basso)
// capovolgi: per i modelli esportati sottosopra (li gira di 180° sull'asse della profondità)
export const modelli = [
    { file: 'demariniadele.glb', nome: 'Adele De Marini' },
    { file: 'alessandromorri.glb', nome: 'Alessandro Morri' },
    { file: 'AnnaPorcellini.glb', nome: 'Anna Porcellini' },
    { file: 'camilasaraviaruiz.glb', nome: 'Camila Saravia Ruiz' },
    { file: 'davidesebastianelli.glb', nome: 'Davide Sebastianelli' },
    { file: 'fabbri_Edoardo.glb', capovolgi: true, lentiSpecchio: true, nome: 'Edoardo Fabbri' },
    { file: 'Eleonora_Nobili.glb', nome: 'Eleonora Nobili' },
    { file: 'federicacancello.glb', nome: 'Federica Cancello' },
    { file: 'francescagalli.glb', nome: 'Francesca Galli' },
    { file: 'giacomocerioni.glb', ruota: 180, nome: 'Giacomo Cerioni' },
    { file: 'gianmarcotito.glb', ruota: 180, nome: 'Gianmarco Tito' },
    { file: 'giuliacamasso.glb', nome: 'Giulia Camasso' },
    { file: 'Jacopo_Del_Bianco.glb', ruota: 180, nome: 'Jacopo Del Bianco' },
    { file: 'lindagarnaroli.glb', nome: 'Linda Garnaroli' },
    { file: 'lucagiorgetti.glb', nome: 'Luca Giorgetti' },
    { file: 'luigiboccarossa.glb', nome: 'Luigi Boccarossa' },
    { file: 'martinacarnevali.glb', capovolgi: true, nome: 'Martina Carnevali' },
    { file: 'SofiaBezzicheri.glb', nome: 'Sofia Bezzicheri' },
    { file: 'takwaguezguez.glb', nome: 'Takwa Guezguez' },
    { file: 'valentinavicinanza.glb', nome: 'Valentina Vicinanza' },
    { file: 'mongiustiviola.glb', nome: 'Viola Mongiusti' }
];

// l'indirizzo della pagina di un modello: prodotto.html?m=nomefile
export function idDi(modello) {
    return modello.file.replace(/\.glb$/, '');
}

export function linkProdotto(modello) {
    return 'prodotto.html?m=' + encodeURIComponent(idDi(modello));
}

// --- le tavolozze: per ogni modello colori diversi ---
// m = montatura (5), s = stanghette (4), l = lenti (5), c = cerniere (3)
// a = accostamenti: [nome, [montatura, stanghette, lenti, cerniere]] con il numero del colore in ogni lista
const ARG = ['Argento', '#c9c9c9'], ORO = ['Oro', '#d4af37'], CANNA = ['Canna di fucile', '#4a4a4a'],
      ROSA = ['Oro rosa', '#b76e79'], BRONZO = ['Bronzo', '#8c6239'], RAME = ['Rame', '#b87333'],
      TITANIO = ['Titanio', '#878681'], OTTONE = ['Ottone', '#b5a642'], PLATINO = ['Platino', '#e5e4e2'],
      BRUNITO = ['Acciaio brunito', '#5a5f66'], CHAMPAGNE = ['Champagne', '#d7c49e'], NEROMET = ['Nero satinato', '#2b2b2b'];
const TRASP = ['Trasparenti', '#e8eef0'], FUME = ['Fumé', '#3a3a3a'];

export const tavolozze = {
    'Adele De Marini': {
        m: [['Lavanda', '#9b8ec4'], ['Lilla', '#c8a2c8'], ['Prugna', '#5e3a5e'], ['Grigio perla', '#d8d5d0'], ['Viola notte', '#3b2c4f']],
        s: [['Prugna', '#5e3a5e'], ['Lavanda', '#9b8ec4'], ['Argilla', '#b0745a'], ['Grafite', '#3a3a3a']],
        l: [['Viola', '#6a5a8c'], ['Rosa', '#d9a0a8'], FUME, ['Ambra', '#b8862b'], TRASP],
        c: [ROSA, ARG, CANNA],
        a: [['Glicine', [0, 1, 1, 0]], ['Crepuscolo', [4, 0, 0, 2]], ['Cipria', [3, 2, 1, 0]], ['Inchiostro', [2, 3, 2, 1]]]
    },
    'Alessandro Morri': {
        m: [['Blu cobalto', '#1f4fa3'], ['Bianco ottico', '#f4f4f0'], ['Arancio', '#e2672b'], ['Antracite', '#33363b'], ['Celeste', '#8fb8de']],
        s: [['Bianco ottico', '#f4f4f0'], ['Blu cobalto', '#1f4fa3'], ['Arancio', '#e2672b'], ['Antracite', '#33363b']],
        l: [['Specchio blu', '#3b6fb6'], ['Arancio', '#d9772e'], FUME, ['Giallo', '#e3c241'], TRASP],
        c: [TITANIO, ARG, NEROMET],
        a: [['Regata', [0, 0, 0, 1]], ['Pista', [3, 2, 1, 2]], ['Ghiaccio', [1, 1, 4, 0]], ['Sole', [2, 3, 3, 0]]]
    },
    'Anna Porcellini': {
        m: [['Rosa antico', '#c48b8b'], ['Crema', '#efe3cf'], ['Bordeaux', '#6d1f2c'], ['Salvia', '#9cae95'], ['Tortora', '#8f8073']],
        s: [['Crema', '#efe3cf'], ['Rosa antico', '#c48b8b'], ['Bordeaux', '#6d1f2c'], ['Tortora', '#8f8073']],
        l: [['Rosa', '#d9a0a8'], ['Marrone', '#7a4b2a'], ['Verde salvia', '#7f957a'], FUME, TRASP],
        c: [ORO, ROSA, ARG],
        a: [['Cipria', [0, 1, 0, 1]], ['Vino', [2, 2, 1, 0]], ['Orto', [3, 0, 2, 2]], ['Sabbia', [4, 3, 3, 0]]]
    },
    'Camila Saravia Ruiz': {
        m: [['Terracotta', '#b5543a'], ['Senape', '#d1a03b'], ['Turchese', '#2f9c95'], ['Sabbia', '#d9c3a0'], ['Cacao', '#4b2e22']],
        s: [['Cacao', '#4b2e22'], ['Terracotta', '#b5543a'], ['Turchese', '#2f9c95'], ['Sabbia', '#d9c3a0']],
        l: [['Ambra', '#b8862b'], ['Turchese', '#3f8f8a'], ['Marrone', '#7a4b2a'], ['Rosso', '#b0413e'], TRASP],
        c: [OTTONE, RAME, ARG],
        a: [['Deserto', [0, 0, 0, 1]], ['Laguna', [2, 3, 1, 2]], ['Spezie', [1, 0, 2, 0]], ['Duna', [3, 1, 4, 0]]]
    },
    'Davide Sebastianelli': {
        m: [['Verde militare', '#4b5320'], ['Kaki', '#a89f72'], ['Nero opaco', '#1c1c1c'], ['Mimetico', '#6b6b47'], ['Grigio fumo', '#5c5c5c']],
        s: [['Nero opaco', '#1c1c1c'], ['Verde militare', '#4b5320'], ['Kaki', '#a89f72'], ['Arancio sicurezza', '#e66a1f']],
        l: [['Verde G15', '#3f5a3a'], ['Polarizzate', '#2f2f2f'], ['Giallo', '#e3c241'], ['Rame', '#a35a32'], TRASP],
        c: [NEROMET, CANNA, TITANIO],
        a: [['Bosco', [0, 1, 0, 0]], ['Tattico', [2, 0, 1, 1]], ['Savana', [1, 2, 3, 2]], ['Allerta', [4, 3, 2, 0]]]
    },
    'Edoardo Fabbri': {
        m: [['Rosso Ferrari', '#c1121f'], ['Nero lucido', '#0f0f0f'], ['Bianco', '#f5f5f5'], ['Giallo', '#f2c230'], ['Blu notte', '#14213d']],
        s: [['Nero lucido', '#0f0f0f'], ['Rosso Ferrari', '#c1121f'], ['Bianco', '#f5f5f5'], ['Blu notte', '#14213d']],
        l: [['Specchio argento', '#d5dade', 'specchio'], ['Specchio rosso', '#d0453a', 'specchio'], ['Specchio oro', '#d9b23a', 'specchio'], ['Specchio blu', '#4f86d9', 'specchio'], ['Specchio fumé', '#6b6e72', 'specchio']],
        c: [ARG, NEROMET, ORO],
        a: [['Corsa', [0, 1, 0, 1]], ['Paddock', [1, 0, 1, 0]], ['Podio', [3, 1, 2, 2]], ['Notturna', [4, 3, 3, 0]]]
    },
    'Eleonora Nobili': {
        m: [['Smeraldo', '#1e6b52'], ['Avorio', '#f1ead8'], ['Corallo', '#e3735e'], ['Ottanio', '#1f4e5f'], ['Nocciola', '#a67b5b']],
        s: [['Avorio', '#f1ead8'], ['Smeraldo', '#1e6b52'], ['Nocciola', '#a67b5b'], ['Ottanio', '#1f4e5f']],
        l: [['Verde G15', '#3f5a3a'], ['Acqua', '#7fb3b0'], ['Marrone', '#7a4b2a'], ['Rosa', '#d9a0a8'], TRASP],
        c: [ORO, ARG, BRONZO],
        a: [['Giardino', [0, 1, 0, 0]], ['Scogliera', [3, 3, 1, 1]], ['Tramonto', [2, 0, 3, 0]], ['Bosco', [4, 2, 2, 2]]]
    },
    'Federica Cancello': {
        m: [['Rosa confetto', '#f1b5c4'], ['Menta', '#a8dcc5'], ['Lilla', '#c8a2c8'], ['Burro', '#f3e3a3'], ['Azzurro polvere', '#a9c6de']],
        s: [['Menta', '#a8dcc5'], ['Rosa confetto', '#f1b5c4'], ['Azzurro polvere', '#a9c6de'], ['Bianco', '#f5f5f5']],
        l: [['Rosa', '#d9a0a8'], ['Azzurro', '#7fa7d9'], ['Lilla', '#a58ec7'], ['Giallo', '#e3c241'], TRASP],
        c: [ROSA, ARG, ORO],
        a: [['Gelato', [0, 0, 0, 0]], ['Primavera', [1, 1, 3, 2]], ['Nuvola', [4, 3, 1, 1]], ['Pastello', [2, 2, 2, 0]]]
    },
    'Francesca Galli': {
        m: [['Giallo limone', '#f2d43d'], ['Blu mare', '#1d5c8c'], ['Bianco', '#f5f5f5'], ['Arancio', '#f08a24'], ['Verde acqua', '#3fb8a5']],
        s: [['Blu mare', '#1d5c8c'], ['Bianco', '#f5f5f5'], ['Giallo limone', '#f2d43d'], ['Verde acqua', '#3fb8a5']],
        l: [['Azzurro', '#4a78c5'], ['Giallo', '#e3c241'], ['Verde acqua', '#3f8f8a'], FUME, TRASP],
        c: [ARG, ORO, TITANIO],
        a: [['Limonata', [0, 1, 0, 0]], ['Marina', [1, 2, 0, 0]], ['Agrumi', [3, 2, 1, 1]], ['Laguna', [4, 1, 2, 2]]]
    },
    'Giacomo Cerioni': {
        m: [['Grigio cemento', '#8a8a85'], ['Nero carbone', '#1b1b1b'], ['Blu acciaio', '#4682b4'], ['Bianco gesso', '#ecebe6'], ['Ruggine', '#8b4a2b']],
        s: [['Nero carbone', '#1b1b1b'], ['Grigio cemento', '#8a8a85'], ['Ruggine', '#8b4a2b'], ['Blu acciaio', '#4682b4']],
        l: [FUME, ['Grigio blu', '#56677a'], ['Marrone', '#7a4b2a'], ['Giallo', '#e3c241'], TRASP],
        c: [BRUNITO, ARG, RAME],
        a: [['Cantiere', [0, 1, 0, 0]], ['Officina', [4, 2, 2, 2]], ['Porto', [2, 0, 1, 1]], ['Gesso', [3, 1, 4, 1]]]
    },
    'Gianmarco Tito': {
        m: [['Blu elettrico', '#2541e0'], ['Verde lime', '#9ccc2a'], ['Nero', '#151515'], ['Fucsia', '#d62a8a'], ['Argento', '#bfc3c7']],
        s: [['Nero', '#151515'], ['Blu elettrico', '#2541e0'], ['Verde lime', '#9ccc2a'], ['Fucsia', '#d62a8a']],
        l: [['Specchio blu', '#3b6fb6'], ['Specchio verde', '#4f9a4a'], ['Viola', '#6a5a8c'], FUME, TRASP],
        c: [CANNA, ARG, TITANIO],
        a: [['Neon', [0, 2, 0, 1]], ['Volt', [1, 0, 1, 0]], ['Arcade', [3, 0, 2, 0]], ['Cromo', [4, 1, 3, 1]]]
    },
    'Giulia Camasso': {
        m: [['Pesca', '#f4a582'], ['Panna', '#f3ead8'], ['Cannella', '#a0522d'], ['Rosa cipria', '#e8c4c0'], ['Verde oliva', '#6b7a3a']],
        s: [['Panna', '#f3ead8'], ['Cannella', '#a0522d'], ['Pesca', '#f4a582'], ['Verde oliva', '#6b7a3a']],
        l: [['Marrone', '#7a4b2a'], ['Rosa', '#d9a0a8'], ['Ambra', '#b8862b'], ['Verde G15', '#3f5a3a'], TRASP],
        c: [ORO, ROSA, BRONZO],
        a: [['Albicocca', [0, 0, 0, 0]], ['Biscotto', [2, 1, 2, 2]], ['Petalo', [3, 0, 1, 1]], ['Uliveto', [4, 3, 3, 0]]]
    },
    'Jacopo Del Bianco': {
        m: [['Bianco latte', '#f7f5ef'], ['Nero inchiostro', '#111318'], ['Grigio nebbia', '#b7b9b8'], ['Blu navy', '#1f2a4d'], ['Rosso mattone', '#9c3b2e']],
        s: [['Nero inchiostro', '#111318'], ['Bianco latte', '#f7f5ef'], ['Blu navy', '#1f2a4d'], ['Rosso mattone', '#9c3b2e']],
        l: [FUME, ['Azzurro', '#4a78c5'], ['Marrone', '#7a4b2a'], ['Verde G15', '#3f5a3a'], TRASP],
        c: [PLATINO, CANNA, ORO],
        a: [['Domino', [0, 0, 0, 1]], ['Lavagna', [1, 1, 4, 0]], ['Marinaio', [3, 1, 1, 0]], ['Mattone', [4, 0, 2, 2]]]
    },
    'Linda Garnaroli': {
        m: [['Ciliegia', '#9e1b32'], ['Rosa fragola', '#e8577a'], ['Nero', '#151515'], ['Crema', '#efe3cf'], ['Melograno', '#c0392b']],
        s: [['Nero', '#151515'], ['Ciliegia', '#9e1b32'], ['Crema', '#efe3cf'], ['Rosa fragola', '#e8577a']],
        l: [['Rosso', '#b0413e'], ['Rosa', '#d9a0a8'], FUME, ['Marrone', '#7a4b2a'], TRASP],
        c: [ORO, ARG, ROSA],
        a: [['Amarena', [0, 1, 0, 0]], ['Fragola', [1, 2, 1, 2]], ['Diva', [2, 1, 2, 0]], ['Panna cotta', [3, 3, 4, 1]]]
    },
    'Luca Giorgetti': {
        m: [['Blu petrolio', '#1b4d5c'], ['Grigio ghiaccio', '#cfd8dc'], ['Arancio bruciato', '#c4561c'], ['Nero', '#151515'], ['Verde bottiglia', '#1f4d2b']],
        s: [['Grigio ghiaccio', '#cfd8dc'], ['Blu petrolio', '#1b4d5c'], ['Nero', '#151515'], ['Arancio bruciato', '#c4561c']],
        l: [['Grigio blu', '#56677a'], ['Arancio', '#d9772e'], ['Verde G15', '#3f5a3a'], FUME, TRASP],
        c: [TITANIO, BRUNITO, RAME],
        a: [['Fiordo', [0, 0, 0, 0]], ['Ghiacciaio', [1, 1, 4, 0]], ['Brace', [3, 3, 1, 2]], ['Foresta', [4, 2, 2, 1]]]
    },
    'Luigi Boccarossa': {
        m: [['Rosso corsa', '#b3121b'], ['Grafite', '#3a3a3a'], ['Bianco ghiaccio', '#eef2f3'], ['Blu reale', '#27408b'], ['Giallo ocra', '#d6a21e']],
        s: [['Grafite', '#3a3a3a'], ['Rosso corsa', '#b3121b'], ['Bianco ghiaccio', '#eef2f3'], ['Blu reale', '#27408b']],
        l: [['Specchio rosso', '#c0392b'], FUME, ['Specchio blu', '#3b6fb6'], ['Giallo', '#e3c241'], TRASP],
        c: [NEROMET, ARG, ORO],
        a: [['Fiamma', [0, 0, 0, 0]], ['Asfalto', [1, 0, 1, 1]], ['Stadio', [3, 2, 2, 1]], ['Miele', [4, 0, 3, 2]]]
    },
    'Martina Carnevali': {
        m: [['Tartaruga', '#5b3a29'], ['Miele', '#c98b2b'], ['Cristallo', '#e6e2da'], ['Verde muschio', '#4f5b33'], ['Rosso rubino', '#7b1e2b']],
        s: [['Tartaruga', '#5b3a29'], ['Miele', '#c98b2b'], ['Verde muschio', '#4f5b33'], ['Cristallo', '#e6e2da']],
        l: [['Marrone', '#7a4b2a'], ['Verde G15', '#3f5a3a'], ['Ambra', '#b8862b'], ['Rosa', '#d9a0a8'], TRASP],
        c: [ORO, BRONZO, CHAMPAGNE],
        a: [['Vintage', [0, 0, 0, 0]], ['Miele', [1, 1, 2, 2]], ['Sottobosco', [3, 2, 1, 1]], ['Rubino', [4, 3, 3, 0]]]
    },
    'Sofia Bezzicheri': {
        m: [['Blu cielo', '#6ca0dc'], ['Bianco', '#f5f5f5'], ['Corallo', '#f07167'], ['Blu notte', '#14213d'], ['Sabbia', '#e0cda9']],
        s: [['Bianco', '#f5f5f5'], ['Blu cielo', '#6ca0dc'], ['Blu notte', '#14213d'], ['Corallo', '#f07167']],
        l: [['Azzurro', '#4a78c5'], ['Rosa', '#d9a0a8'], FUME, ['Ambra', '#b8862b'], TRASP],
        c: [ARG, ORO, CHAMPAGNE],
        a: [['Cielo', [0, 0, 0, 0]], ['Spiaggia', [4, 0, 3, 2]], ['Mezzanotte', [3, 2, 2, 0]], ['Corallo', [2, 1, 1, 1]]]
    },
    'Takwa Guezguez': {
        m: [['Oro sahariano', '#c99a3b'], ['Blu indaco', '#2e3a8c'], ['Terra rossa', '#9b3d26'], ['Avorio', '#f1ead8'], ['Verde menta', '#6fb59a']],
        s: [['Blu indaco', '#2e3a8c'], ['Avorio', '#f1ead8'], ['Terra rossa', '#9b3d26'], ['Oro sahariano', '#c99a3b']],
        l: [['Ambra', '#b8862b'], ['Blu', '#36508f'], ['Marrone', '#7a4b2a'], ['Verde menta', '#5f9e86'], TRASP],
        c: [OTTONE, ORO, RAME],
        a: [['Medina', [0, 0, 0, 0]], ['Indaco', [1, 1, 1, 1]], ['Kasbah', [2, 3, 2, 2]], ['Oasi', [4, 1, 3, 0]]]
    },
    'Valentina Vicinanza': {
        m: [['Nero', '#1a1a1a'], ['Avana', '#6b3e26'], ['Rosso corallo', '#c0392b'], ['Panna', '#f3ead8'], ['Verde petrolio', '#2e6b5e']],
        s: [['Nero', '#1a1a1a'], ['Avana', '#6b3e26'], ['Blu ardesia', '#3d5a80'], ['Ocra', '#e0a526']],
        l: [FUME, ['Verde G15', '#3f5a3a'], ['Marrone', '#7a4b2a'], ['Azzurro', '#4a78c5'], TRASP, ['Specchio rosa', '#f4a6c8', 'specchio']],
        c: [ARG, ORO, CANNA],
        a: [['Classico', [0, 0, 1, 0]], ['Riviera', [1, 1, 2, 1]], ['Estate', [3, 3, 3, 1]], ['Notte', [4, 2, 0, 2]]]
    },
    'Viola Mongiusti': {
        m: [['Viola', '#6c3483'], ['Glicine', '#b19cd9'], ['Nero', '#151515'], ['Malva', '#a26f8f'], ['Grigio argento', '#c0c0c8']],
        s: [['Nero', '#151515'], ['Viola', '#6c3483'], ['Glicine', '#b19cd9'], ['Grigio argento', '#c0c0c8']],
        l: [['Viola', '#6a5a8c'], FUME, ['Rosa', '#d9a0a8'], ['Azzurro', '#4a78c5'], TRASP],
        c: [ARG, ROSA, CANNA],
        a: [['Violetta', [0, 0, 0, 0]], ['Lavanda', [1, 3, 2, 1]], ['Notte', [2, 1, 1, 2]], ['Malva', [3, 2, 0, 1]]]
    }
};


// prepara il modello appena caricato: toglie tavole, linee e testa, lo gira se serve,
// lo centra e lo porta sempre alla stessa grandezza (il lato più lungo = 2 unità).
// Restituisce il "perno", il gruppo che gira con dentro il modello.
export function preparaModello(gltf, dati) {
    const modello = gltf.scene;

    const daTogliere = [];
    modello.traverse(function (parte) {
        // la testa (in alcuni file c'è anche il viso su cui poggiano gli occhiali): non serve
        const testa = parte.isMesh && (/^testa/i.test(parte.name) ||
            [].concat(parte.material).some(function (m) { return m && m.name === 'testa'; }));
        if (testa || parte.name === 'tavole' || parte.isLine || parte.isLineSegments || parte.isPoints) {
            daTogliere.push(parte);
        }
    });
    daTogliere.forEach(function (p) { if (p.parent) p.parent.remove(p); });

    // i modelli esportati al contrario vengono girati per guardare la camera come gli altri
    if (dati.ruota) modello.rotation.y = THREE.MathUtils.degToRad(dati.ruota);
    if (dati.capovolgi) modello.rotation.z = Math.PI;
    modello.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(modello);
    const centro = box.getCenter(new THREE.Vector3());
    const misura = box.getSize(new THREE.Vector3());
    const lato = Math.max(misura.x, misura.y, misura.z) || 1;
    modello.position.sub(centro);

    // lenti a specchio: le riconosciamo come nella pagina dell'occhiale e le rendiamo riflettenti
    if (dati.lentiSpecchio) {
        const lenti = [];
        modello.traverse(function (m) {
            if (m.isMesh && parteDi(m, modello) === 'lenti') lenti.push(m);
        });
        const specchio = impostaLente(new THREE.MeshPhysicalMaterial(), lenteBase(dati), lenti);
        lenti.forEach(function (m) { m.material = specchio; });
    }

    const perno = new THREE.Group();
    perno.add(modello);
    perno.userData.scalaBase = 2 / lato;
    perno.scale.setScalar(perno.userData.scalaBase);
    return perno;
}

// --- le parti del modello: ogni compagno ha chiamato le parti a modo suo, le riconosciamo dai nomi ---
export const regoleParti = [
    ['cerniere', /cernier|ganci|ferrament|metal|\bvit[ei]\b|hinge/i],
    ['lenti', /lent|lens|glass/i],
    ['stanghette', /stangh|stanga|\bast[ea]\b|temple|elastic/i],
    ['montatura', /montatura|struttura|frontal|davanti|dietro|naso|gomma/i]
];

export function parteDaNome(nome) {
    if (!nome) return null;
    for (const [parte, regola] of regoleParti) {
        if (regola.test(nome)) return parte;
    }
    return null;
}

export function parteDi(mesh, radice) {
    // prima il nome della mesh e dei gruppi che la contengono (dal più vicino), poi il materiale
    for (let p = mesh; p && p !== radice; p = p.parent) {
        const parte = parteDaNome(p.name);
        if (parte) return parte;
    }
    for (const m of [].concat(mesh.material)) {
        const parte = parteDaNome(m && m.name);
        if (parte) return parte;
    }
    // senza nomi: una lente si riconosce perché è trasparente
    const m = [].concat(mesh.material)[0];
    if (m && ((m.transparent && m.opacity < 0.9) || m.transmission > 0.5)) return 'lenti';
    return 'montatura';
}

export function cloneMateriale(m) {
    return Array.isArray(m) ? m.map(function (x) { return x.clone(); }) : m.clone();
}

export function materialiDi(mesh) {
    return [].concat(mesh.material);
}

// divide il modello nelle 4 parti. Il perno deve essere senza scala e senza rotazione (le misure servono
// per riconoscere le stanghette quando non hanno un nome). Ogni mesh riceve una copia del suo materiale,
// così i colori cambiati qui non toccano altre copie dello stesso modello.
export function dividiInParti(perno) {
    const parti = { montatura: [], stanghette: [], lenti: [], cerniere: [] };
    perno.updateMatrixWorld(true);

    const mesh = [];
    perno.traverse(function (o) { if (o.isMesh) mesh.push(o); });
    mesh.forEach(function (m) {
        m.material = cloneMateriale(m.material);
        parti[parteDi(m, perno)].push(m);
    });

    // le cerniere sono di metallo
    parti.cerniere.forEach(function (m) {
        materialiDi(m).forEach(function (mat) { if ('metalness' in mat) mat.metalness = 1; });
    });

    // se nessuna parte si chiama "stanghette", prendiamo i pezzi che stanno dietro il frontale
    if (parti.stanghette.length === 0) {
        const tutto = new THREE.Box3().setFromObject(perno);
        const profondita = tutto.max.z - tutto.min.z;
        parti.montatura = parti.montatura.filter(function (m) {
            const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
            if (c.z < tutto.max.z - profondita * 0.35) {
                parti.stanghette.push(m);
                return false;
            }
            return true;
        });
    }
    return parti;
}

// ===== i tipi di lente =====
// 'normale'  = lente trasparente colorata
// 'specchio' = lente a specchio: riflette l'ambiente come un metallo lucidissimo, il colore è la tinta del riflesso
// 'sfumato'  = lente a specchio con una sfumatura dal blu al viola (il colore scelto non conta)

const BLU_SFUMATURA = new THREE.Color('#1e4dff');
const VIOLA_SFUMATURA = new THREE.Color('#9b2cff');

// il campione per scegliere la lente a specchio sfumata: c'è su ogni modello
export const LENTE_SFUMATA = ['Specchio sfumato', '#5b3cff', 'sfumato'];
// come si vede il campione: la stessa sfumatura della lente
export const SFONDO_SPECCHIO = 'linear-gradient(135deg, #1e4dff 0%, #5b3cff 50%, #9b2cff 100%)';

// il tipo di lente di partenza di un modello
export function lenteBase(dati) {
    return dati.lentiSpecchio ? 'sfumato' : 'normale';
}

// i colori delle lenti da mostrare: quelli della tavolozza più lo specchio sfumato
// (per i modelli con le lenti a specchio, come quelli di Edoardo, lo specchio sfumato è il primo)
export function coloriLenti(dati, lista) {
    return dati.lentiSpecchio ? [LENTE_SFUMATA].concat(lista) : lista.concat([LENTE_SFUMATA]);
}

// i limiti delle lenti (nelle coordinate del modello): servono a stendere la sfumatura da un bordo all'altro
function limitiLenti(mesh) {
    const box = new THREE.Box3();
    (mesh || []).forEach(function (m) {
        if (!m.geometry) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        box.union(m.geometry.boundingBox);
    });
    if (box.isEmpty()) box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    return box;
}

// la sfumatura dentro lo shader della lente: dal blu al viola lungo l'altezza della lente (un po' in diagonale),
// e verso il viola anche sui bordi, dove la lente si vede di taglio
function aggiungiSfumatura(mat, box) {
    mat.userData.sfumatura = {
        sfMin: { value: box.min.clone() },
        sfMax: { value: box.max.clone() },
        sfBlu: { value: BLU_SFUMATURA },
        sfViola: { value: VIOLA_SFUMATURA }
    };
    mat.onBeforeCompile = function (shader) {
        Object.assign(shader.uniforms, mat.userData.sfumatura);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vPosSfumatura;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosSfumatura = position;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', [
                '#include <common>',
                'varying vec3 vPosSfumatura;',
                'uniform vec3 sfMin; uniform vec3 sfMax; uniform vec3 sfBlu; uniform vec3 sfViola;'
            ].join('\n'))
            .replace('#include <normal_fragment_maps>', [
                '#include <normal_fragment_maps>',
                'vec3 sfT = (vPosSfumatura - sfMin) / max(sfMax - sfMin, vec3(1e-6));',
                'float sfQuanto = clamp(sfT.y * 0.8 + sfT.x * 0.2, 0.0, 1.0);',
                'float sfBordo = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);',
                'diffuseColor.rgb = mix(mix(sfBlu, sfViola, sfQuanto), sfViola, sfBordo * 0.6);'
            ].join('\n'));
    };
    mat.customProgramCacheKey = function () { return 'lente-sfumata'; };
}

function togliSfumatura(mat) {
    delete mat.onBeforeCompile;          // torna quello normale di Three.js
    delete mat.customProgramCacheKey;
    delete mat.userData.sfumatura;
}

// prepara il materiale di una lente per il tipo scelto (tutti i valori, così si può passare da un tipo all'altro).
// mesh: le lenti del modello, servono per la sfumatura
export function impostaLente(mat, tipo, mesh) {
    if (tipo === 'specchio' || tipo === 'sfumato') {
        mat.metalness = 1;
        mat.roughness = 0;                 // perfettamente liscia
        mat.clearcoat = 1;
        mat.clearcoatRoughness = 0;
        mat.envMapIntensity = 3.2;         // riflette molto più della lente normale
        mat.opacity = 0.98;
    } else {
        mat.metalness = 0;
        mat.roughness = 0.05;
        mat.clearcoat = 0;
        mat.envMapIntensity = 1.2;
        mat.opacity = 0.6;
    }
    mat.iridescence = 0;
    if (tipo === 'sfumato') aggiungiSfumatura(mat, limitiLenti(mesh));
    else togliSfumatura(mat);
    mat.transparent = true;
    mat.needsUpdate = true;
    return mat;
}

// colora le parti come nella pagina dell'occhiale (le lenti diventano trasparenti e colorate)
export function coloraParti(parti, colori, finitura, tipoLente) {
    const lenti = impostaLente(new THREE.MeshPhysicalMaterial({ color: colori.lenti }), tipoLente || 'normale', parti.lenti);
    parti.lenti.forEach(function (m) { m.material = lenti; });
    ['montatura', 'stanghette', 'cerniere'].forEach(function (parte) {
        parti[parte].forEach(function (m) {
            materialiDi(m).forEach(function (mat) {
                if (mat.color) mat.color.set(colori[parte]);
                mat.map = null;
                if ('roughness' in mat) {
                    mat.roughness = finitura === 'opaca' ? 0.85 : 0.15;
                    mat.envMapIntensity = finitura === 'opaca' ? 0.4 : 0.9;
                }
                mat.needsUpdate = true;
            });
        });
    });
}

// l'indirizzo della prova con la fotocamera, con i colori scelti
// (colori: { montatura, stanghette, lenti, cerniere } in esadecimale, finitura: 'lucida' o 'opaca',
//  tipoLente: 'normale', 'specchio' o 'sfumato')
export function linkProva(modello, colori, finitura, tipoLente) {
    const q = new URLSearchParams({ m: idDi(modello) });
    if (colori) {
        q.set('c', ['montatura', 'stanghette', 'lenti', 'cerniere']
            .map(function (k) { return colori[k].replace('#', ''); }).join('-'));
    }
    if (finitura) q.set('f', finitura);
    if (tipoLente) q.set('t', tipoLente);
    return 'prova.html?' + q.toString();
}
