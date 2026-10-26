const CONFIG = {
// ► Taux Journalier Moyen (HT)
    TJM: 100,
// ► TVA applicable
    TVA: 0.00,
// ► Validité du devis
    VALIDITE_DEVIS_JOURS: 30,
// ► My Information
    FREELANCE: {
        nom: 'Lenny Gadroy',
        titre: 'Lennouille — UI/UX Designer',
        email: 'contact@levrailennouille.fr',
        tel: '+33 6 52 51 49 19',
        siret: '000 000 000 00000',
        adresse: '51100 Reims, France',
        site: 'levrailennouille.fr',
        tva_intra: 'FR00000000000',
    },
// ► Estimated days
    JOURS_NATURE: {
        'creation': {min: 15, max: 21, label: 'Product Design'},
        'refonte': {min: 10, max: 14, label: 'Refonte UI / UX complète'},
        'design-system': {min: 15, max: 30, label: 'Design System'},
        'features': {min: 5, max: 10, label: 'Nouvelles fetures'},
        'audit': {min: 2, max: 5, label: 'Audit UX'},
    },
// ► Multipliers
    MULTI_PLATEFORME: {
        'vitrine': {valeur: 1.00, label: 'Site Vitrine / Landing page'},
        'ecommerce': {valeur: 1.20, label: 'Plateforme e-commerce'},
        'mobile': {valeur: 1.10, label: 'App Mobile'},
    },
// ► Extra days
    JOURS_PERIMETRE: {
        'small': {min: 0, max: 0, label: '1–5 vues'},
        'medium': {min: 1, max: 4, label: '5–15 vues'},
        'large': {min: 5, max: 10, label: '+15 vues'},
    },
// ► Deliverables
    JOURS_LIVRABLES: {
        'wireframes': {min: 1, max: 2, label: 'Wireframes'},
        'maquettes': {min: 0, max: 0, label: 'Maquettes UI (HF)'},
        'prototype': {min: 2, max: 4, label: 'Prototype Interactif'},
        'recherche': {min: 1, max: 3, label: 'UX Research'},
        'userflows': {min: 1, max: 2, label: 'User Flows'},
        'handoff': {min: 1, max: 2, label: 'Developer Handoff'},
    },
    NATURES_MAQUETTE_INCLUSE: ['creation', 'refonte', 'design-system'],
// ► Partial | Effect : TJM ÷ 2 —— durée estimée × 2
    TRAVAIL_PARTIEL: false,
// ► Referral codes
    CODES_PARRAINAGE: [
        'STUDIOPAPOU',
        'MUETRE',
        'PRIMAIRE',
        'SCORCONE',
        'LAREPOUSSE',
    ],
    REMISE_PARRAINAGE: 0.10,
// ► Emergency
    MAJORATION_URGENCE: 0.20,
    REDUCTION_DUREE_URGENCE: 0.40,
// ► Send
    WEBHOOK_URL: '',
    FORMSPREE_URL: 'https://formspree.io/f/xppzlpvg',
// ► Rate limiting
    RATE_LIMIT_MAX: 3,
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
};

let STATE = {
    currentStep: 1,
    totalSteps: 6,
// ► Données collectées depuis le formulaire
    data: {
        prenom: '',
        nom: '',
        email: '',
        entreprise: '',
        role: '',
        nature: '',
        plateformes: [],
        perimetre: '',
        livrables: [],
        urgence: false,
        // budget: '',
        type_demande: 'estimation',
        code_parrainage: '',
    },
// ► Résultat du moteur de calcul
    estimation: {
        joursMin: 0,
        joursMax: 0,
        prixHtMin: 0,
        prixHtMax: 0,
        prixTtcMin: 0,
        prixTtcMax: 0,
        sousTotalHtMin: 0,
        sousTotalHtMax: 0,
        remiseMin: 0,
        remiseMax: 0,
        codeValide: false,
        codeUtilise: '',
        details: [],
    },
};

function syncMaquetteInclusion() {
    const card = document.getElementById('card-l-ui');
    const checkbox = document.getElementById('l-ui');
    if (!card || !checkbox) return;

    const inclus = CONFIG.NATURES_MAQUETTE_INCLUSE.includes(STATE.data.nature);
    card.classList.toggle('Hidden', !inclus);

    if (inclus) {
        checkbox.checked = true;
        if (!STATE.data.livrables.includes('maquettes')) {
            STATE.data.livrables.push('maquettes');
        }
    } else {
        checkbox.checked = false;
        STATE.data.livrables = STATE.data.livrables.filter(l => l !== 'maquettes');
    }
}

function recalculate() {
    const d = STATE.data;
    let joursMin = 0;
    let joursMax = 0;
    const details = [];
// ► Base
    if (d.nature && CONFIG.JOURS_NATURE[d.nature]) {
        const cfg = CONFIG.JOURS_NATURE[d.nature];
        joursMin += cfg.min;
        joursMax += cfg.max;
        details.push({label: cfg.label, valeur: `${cfg.min}–${cfg.max} j`, type: 'base'});
    }
// ► Estimated days
    if (d.perimetre && CONFIG.JOURS_PERIMETRE[d.perimetre]) {
        const cfg = CONFIG.JOURS_PERIMETRE[d.perimetre];
        const multPartiel = CONFIG.TRAVAIL_PARTIEL ? 2 : 1;
        const pMin = cfg.min * multPartiel;
        const pMax = cfg.max * multPartiel;
        joursMin += pMin;
        joursMax += pMax;

        if (cfg.max > 0) {details.push({label: `Périmètre (${cfg.label})`, valeur: `+${cfg.min}–${cfg.max} j`, type: 'additive'});}
    }
// ► Extra days
    d.livrables.forEach(liv => {
        const cfg = CONFIG.JOURS_LIVRABLES[liv];
        if (cfg) {
            const multPartiel = CONFIG.TRAVAIL_PARTIEL ? 2 : 1;
            const lMin = cfg.min * multPartiel;
            const lMax = cfg.max * multPartiel;
            joursMin += lMin;
            joursMax += lMax;

            if (liv === 'maquettes') {details.push({label: cfg.label, valeur: 'inclus', type: 'livrable'});}
            else {details.push({label: cfg.label, valeur: `+${lMin}–${lMax} j`, type: 'livrable'});}
        }
    });
// ► Multipliers
    let multiPlat = 1.0;
    let platLabels = [];

    d.plateformes.forEach(p => {
    const cfg = CONFIG.MULTI_PLATEFORME[p];
        if (cfg) {
            multiPlat += (cfg.valeur - 1.0);
            platLabels.push(cfg.label);
        }
    });

    if (multiPlat > 1.0) {
        details.push({
            label: `Complexité (${platLabels.join(', ')})`,
            valeur: `×${multiPlat.toFixed(2)}`,
            type: 'multiplicateur',
        });
    }
// ► Emergency
    let multiUrgence = 1.0;
    const joursMinBase = Math.ceil(joursMin * multiPlat);
    const joursMaxBase = Math.ceil(joursMax * multiPlat);
    let multiUrgencePrix = 1.0;
    let multiUrgenceDuree = 1.0;
    if (d.urgence) {
        multiUrgencePrix = 1 + CONFIG.MAJORATION_URGENCE;
        multiUrgenceDuree = 1 - CONFIG.REDUCTION_DUREE_URGENCE;
        details.push({
            label: `Majoration urgence`,
            valeur: `+${(CONFIG.MAJORATION_URGENCE * 100).toFixed(0)}% prix / −${(CONFIG.REDUCTION_DUREE_URGENCE * 100).toFixed(0)}% délai`,
            type: 'urgence',
        });
    }
// ► Final calculation
    const multiTotal = multiPlat * multiUrgence;
    const joursMinFin = Math.ceil(joursMinBase * multiUrgenceDuree);
    const joursMaxFin = Math.ceil(joursMaxBase * multiUrgenceDuree);
// ► Travail partiel
    const effectiveTJM = CONFIG.TRAVAIL_PARTIEL ? CONFIG.TJM / 2 : CONFIG.TJM;
    const sousTotalHtMin = joursMinBase * effectiveTJM * multiUrgencePrix;
    const sousTotalHtMax = joursMaxBase * effectiveTJM * multiUrgencePrix;
// ► Referral codes
    const code = checkCodeParrainage(d.code_parrainage);
    let remiseMin = 0;
    let remiseMax = 0;

    if (code.valide) {
        remiseMin = sousTotalHtMin * CONFIG.REMISE_PARRAINAGE;
        remiseMax = sousTotalHtMax * CONFIG.REMISE_PARRAINAGE;
        details.push({
            label: `Code parrainage (${code.code})`,
            valeur: `−${(CONFIG.REMISE_PARRAINAGE * 100).toFixed(0)}%`,
            type: 'remise',
        });
    }

    const htMin = sousTotalHtMin - remiseMin;
    const htMax = sousTotalHtMax - remiseMax;

    const ttcMin = htMin * (1 + CONFIG.TVA);
    const ttcMax = htMax * (1 + CONFIG.TVA);

    STATE.estimation = {
        joursMin: joursMinFin,
        joursMax: joursMaxFin,
        prixHtMin: htMin,
        prixHtMax: htMax,
        prixTtcMin: ttcMin,
        prixTtcMax: ttcMax,
        sousTotalHtMin,
        sousTotalHtMax,
        remiseMin,
        remiseMax,
        codeValide: code.valide,
        codeUtilise: code.code,
        details,
        multiPlat,
        multiUrgencePrix,
        multiUrgenceDuree,
    };
updatePriceUI();
updateCodeFeedback();
}

/**
* @param {string} input
* @returns {{valide: boolean, code: string}}
*/

function checkCodeParrainage(input) {
    const code = (input || '').trim().toUpperCase();
    if (!code) return {valide: false, code: ''};
    return {valide: CONFIG.CODES_PARRAINAGE.includes(code), code};
}

function updateCodeFeedback() {
    const el = document.getElementById('code-feedback');
    const input = document.getElementById('code_parrainage');
    if (!el || !input) return;

    const raw = input.value.trim();
    if (!raw) {
        el.textContent = '';
        el.className = 'CodeFeedback';
        return;
    }

    if (STATE.estimation.codeValide) {
        el.textContent = `✓ Code valide — ${(CONFIG.REMISE_PARRAINAGE * 100).toFixed(0)}% de remise appliquée`;
        el.className = 'CodeFeedback Show Valid';
    } else {
        el.textContent = '✕ Code de parrainage invalide';
        el.className = 'CodeFeedback Show Invalid';
    }
}

function navigate(direction) {
    const navError = document.getElementById('nav-error');
    if (direction > 0) {
        if (!validateStep(STATE.currentStep)) {
            if (navError) navError.classList.add('Show');
            return;
        }
        collectStep(STATE.currentStep);
        recalculate();
    }
    if (navError) navError.classList.remove('Show');

    const next = STATE.currentStep + direction;
    if (next >= 1 && next <= STATE.totalSteps) {showStep(next);}
}

function showStep(n) {
    document.querySelectorAll('.Panel').forEach(el => {
        el.classList.remove('Active');
        if (parseInt(el.dataset.step) === n) el.classList.add('Active');
    });
    STATE.currentStep = n;

    const btnPrev = document.getElementById('btn-prev');
    btnPrev.style.visibility = n === 1 ? 'Hidden' : 'visible';

    const btnNext = document.getElementById('btn-next');
        if (n === STATE.totalSteps) {
            btnNext.innerHTML = '<span class="Arrow">✓</span> Générer mon devis';
            btnNext.onclick = submitForm;
        } else {
            btnNext.innerHTML = 'Continuer <span class="Arrow">→</span>';
            btnNext.onclick = () => navigate(1);
        }
    updateProgressBar(n);
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function buildProgressBar() {
    STATE.maxStep = 1;
    const nav = document.getElementById('rail-nav');
    if (nav && !nav.dataset.bound) {
        nav.dataset.bound = '1';
        nav.addEventListener('click', (e) => {
            const btn = e.target.closest('.rail-btn');
            if (btn && !btn.disabled) goToStep(parseInt(btn.dataset.step, 10));
        });
    }
}

function goToStep(n) {
    const cur = STATE.currentStep;
    if (n === cur) return;
    const navError = document.getElementById('nav-error');
    if (n > cur) {
        for (let s = cur; s < n; s++) {
            if (!validateStep(s)) {
                if (s !== cur) showStep(s);
                if (navError) navError.classList.add('Show');
                return;
            }
            collectStep(s);
        }
    } else {
        collectStep(cur);
    }
    recalculate();
    if (navError) navError.classList.remove('Show');
    showStep(n);
}

function updateProgressBar(current) {
    STATE.maxStep = Math.max(STATE.maxStep || 1, current);
    const total = STATE.totalSteps;

    document.querySelectorAll('#rail-nav .rail-btn').forEach(btn => {
        const i = parseInt(btn.dataset.step, 10);
        const sn = btn.querySelector('.sn');
        btn.classList.toggle('Done', i < current);
        btn.disabled = i > STATE.maxStep;
        if (i === current) btn.setAttribute('aria-current', 'step');
        else btn.removeAttribute('aria-current');
        sn.textContent = i < current ? '✓' : i;
    });

    const bar = document.getElementById('ProgressBar');
    if (bar) {
        bar.style.width = `${(current / total) * 100}%`;
        bar.setAttribute('aria-valuenow', current);
    }
    setText('rail-st', `Étape ${current} / ${total}`);

    const rail = document.querySelector('.rail');
    const active = document.querySelector('#rail-nav .rail-btn[aria-current="step"]');
    if (rail && active && getComputedStyle(rail).flexDirection === 'row') {
        rail.scrollTo({left: active.offsetLeft - 64, behavior: 'smooth'});
    }
}

function updatePriceUI() {
    const est = STATE.estimation;
    if (est.prixHtMin === 0 && est.prixHtMax === 0) return;

    const effectiveTJM = CONFIG.TRAVAIL_PARTIEL ? CONFIG.TJM / 2 : CONFIG.TJM;
    const rangeHT = `${euros(est.prixHtMin)} – ${euros(est.prixHtMax)}`;
    const rangeTTC = CONFIG.TVA > 0 ? `${euros(est.prixTtcMin)} – ${euros(est.prixTtcMax)}` : rangeHT;

    setText('s-price-main', rangeHT);
    setText('s-ht-min', euros(est.prixHtMin));
    setText('s-ht-max', euros(est.prixHtMax));
    setText('s-ttc', rangeTTC);
    setText('s-jours', `${est.joursMin}–${est.joursMax}`);
    setText('s-tjm-val', effectiveTJM);

    const sRemiseRow = document.getElementById('s-remise-row');
    if (sRemiseRow) {
        sRemiseRow.classList.toggle('Hidden', !est.codeValide);
        if (est.codeValide) {
            setText('s-remise-val', `−${euros(est.remiseMin)} – −${euros(est.remiseMax)}`);
        }
    }

    if (CONFIG.TVA > 0) {
        setText('s-tva-label', `TVA (${(CONFIG.TVA * 100).toFixed(0)}%)`);
        setText('s-tva-val', `+${(CONFIG.TVA * 100).toFixed(0)}%`);
    } else {
        setText('s-tva-label', 'TVA');
        setText('s-tva-val', 'Non assujetti');
    }

    const bd = document.getElementById('s-breakdown');
    if (est.details.length > 0) {
        bd.innerHTML = est.details.map(d => `<div class="Details">
            <span class="DetailsLabel">${d.label}</span>
            <span class="DetailsValue DetailsValue--${d.type || 'base'}">${d.valeur}</span>
        </div>`).join('');
    }
    setText('m-price-main', rangeHT);
    setText('m-ttc', `${rangeTTC} TTC`);
    setText('md-price-main', rangeHT);
    setText('md-ht-min', euros(est.prixHtMin));
    setText('md-ht-max', euros(est.prixHtMax));
    setText('md-ttc', rangeTTC);
    setText('md-jours', `${est.joursMin}–${est.joursMax}`);
    setText('md-tjm-val', effectiveTJM);

    const mdRemiseRow = document.getElementById('md-remise-row');
    if (mdRemiseRow) {
        mdRemiseRow.classList.toggle('Hidden', !est.codeValide);
        if (est.codeValide) {
            setText('md-remise-val', `−${euros(est.remiseMin)} – −${euros(est.remiseMax)}`);
        }
    }

    if (CONFIG.TVA > 0) {
        setText('md-tva-label', `TVA (${(CONFIG.TVA * 100).toFixed(0)}%)`);
        setText('md-tva-val', `+${(CONFIG.TVA * 100).toFixed(0)}%`);
    } else {
        setText('md-tva-label', 'TVA');
        setText('md-tva-val', 'Non assujetti');
    }

    const mdBd = document.getElementById('md-breakdown');
    if (mdBd && est.details.length > 0) {
        mdBd.innerHTML = est.details.map(d => `<div class="Details">
            <span class="DetailsLabel">${d.label}</span>
            <span class="DetailsValue DetailsValue--${d.type || 'base'}">${d.valeur}</span>
        </div>`).join('');
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function euros(n) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(n);
}

function validateStep(step) {
    clearErrors();
    switch (step) {
        case 1: {
            let ok = true;
            const p = v('prenom'), n = v('nom'), e = v('email');
            if (!p) {showErr('err-prenom'); ok = false;}
            if (!n) {showErr('err-nom'); ok = false;}
            if (!e || !isEmail(e)) {showErr('err-email'); ok = false;}
            return ok;
        }

        case 2:
            if (!document.querySelector('input[name="nature"]:checked')) {showErr('err-nature'); return false;}
            return true;

        case 3:
            if (!document.querySelectorAll('input[name="plateformes"]:checked').length) {showErr('err-plateformes'); return false;}
            return true;

        case 4:
            if (!document.querySelector('input[name="perimetre"]:checked')) {showErr('err-perimetre'); return false;}
            return true;

        case 5:
            if (!document.querySelectorAll('input[name="livrables"]:checked').length) {showErr('err-livrables'); return false;}
            return true;

        default:
            return true;
        }
}

function showErr(id) {const el = document.getElementById(id); if (el) el.classList.add('Show');}
function clearErrors() {document.querySelectorAll('.Error').forEach(el => el.classList.remove('Show'));}
function v(id) {return document.getElementById(id)?.value.trim() || '';}
function isEmail(s) {return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);}

const BANNED_FIELDS = [
    {key: 'prenom', label: 'Prénom', step: 1},
    {key: 'nom', label: 'Nom', step: 1},
    {key: 'entreprise', label: 'Entreprise', step: 1},
    {key: 'role', label: 'Rôle', step: 1},
    {key: 'description_projet', label: 'Description du projet', step: 6},
    {key: 'code_parrainage', label: 'Code de parrainage', step: 6},
];

function findBannedWordInForm() {
    const fields = BANNED_FIELDS.map(({ key, label, step }) => ({
        value: STATE.data[key],
        label,
        step,
    }));
    return Guard.findBannedWord(fields);
}

const RATE_LIMIT_KEY = 'lennsimuDevisEnvois';
const devisRateLimiter = Guard.createRateLimiter(RATE_LIMIT_KEY, CONFIG.RATE_LIMIT_MAX, CONFIG.RATE_LIMIT_WINDOW_MS);

function collectStep(step) {
    const d = STATE.data;
    switch (step) {
        case 1:
            d.prenom = v('prenom');
            d.nom = v('nom');
            d.email = v('email');
            d.entreprise = v('entreprise');
            d.role = v('role');
        break;

        case 2: d.nature = document.querySelector('input[name="nature"]:checked')?.value || ''; break;

        case 3: d.plateformes = [...document.querySelectorAll('input[name="plateformes"]:checked')].map(el => el.value);break;

        case 4: d.perimetre = document.querySelector('input[name="perimetre"]:checked')?.value || ''; break;

        case 5: d.livrables = [...document.querySelectorAll('input[name="livrables"]:checked')].map(el => el.value); break;

        case 6:
            d.urgence = document.getElementById('urgence').checked;
            // d.budget = document.getElementById('budget').value;
            d.type_demande = document.querySelector('input[name="type_demande"]:checked')?.value || 'estimation';
            d.code_parrainage = v('code_parrainage');
            d.description_projet = v('description_projet');
        break;
    }
}

function downloadPDF() {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});

    const d = STATE.data;
    const est = STATE.estimation;
    const fl = CONFIG.FREELANCE;
    const now  = new Date();
    const W = 210;

    const numDevis = `DEV-${Date.now()}`;
    const dateEmission = now.toLocaleDateString('fr-FR');
    const dateValidite = new Date(now.getTime() + CONFIG.VALIDITE_DEVIS_JOURS * 86400000).toLocaleDateString('fr-FR');

    const C = {
        NOIR: [0, 0, 0],
        CHARCOAL: [28, 28, 30],
        BLANC: [255, 255, 255],
        PRIMARY: [19, 76, 133],
        MUTED: [108, 130, 147],
        BG: [232, 226, 216],
    };

    const fill = (c) => doc.setFillColor(...c);
    const stroke = (c) => doc.setDrawColor(...c);
    const color = (c) => doc.setTextColor(...c);
    const font = (s, sz) => {doc.setFont('helvetica', s); doc.setFontSize(sz);};
    const sanitize = (text) => String(text).replace(/\u202F|\u00A0/g, ' ').replace(/−|–/g, '-');

    fill(C.PRIMARY);
    doc.rect(0, 0, W, 48, 'F');

    color(C.BLANC);
    font('bold', 18);
    doc.text(fl.nom, 14, 18);

    color(C.BLANC);
    font('normal', 9);
    doc.text(fl.titre.toUpperCase(), 14, 25);

    color(C.BLANC);
    font('normal', 8);
    doc.text(fl.email, 14, 32);
    doc.text(fl.tel, 14, 38);

    color(C.BLANC);
    font('bold', 22);
    doc.text('DEVIS', W - 14, 18, {align: 'right'});

    color(C.BLANC);
    font('bold', 9);
    doc.text(numDevis, W - 14, 26, {align: 'right'});

    color(C.BLANC);
    font('normal', 8);
    doc.text(`Émis le ${dateEmission}`, W - 14, 33, {align: 'right'});
    doc.text(`Valable jusqu'au ${dateValidite}`, W - 14, 39, {align: 'right'});

    let y = 58;
    color(C.MUTED);
    font('bold', 8);
    doc.text('CLIENT', 14, y);
    stroke(C.BG);
    doc.line(14, y + 2, W - 14, y + 2);

    y += 9;
    color(C.CHARCOAL);
    font('bold', 12);
    doc.text(`${d.prenom} ${d.nom}`, 14, y);

    y += 5;
    font('normal', 9);
    color(C.MUTED);
    if (d.entreprise) {doc.text(d.entreprise, 14, y); y += 5;}
    if (d.role) {doc.text(d.role, 14, y); y += 5;}
    doc.text(d.email, 14, y);

    y += 14;
    color(C.MUTED);
    font('bold', 8);
    doc.text('DÉTAIL DE LA MISSION', 14, y);
    stroke(C.BG);
    doc.line(14, y + 2, W - 14, y + 2);

    y += 9;

    const rowsProjet = [
        ['Nature du projet', CONFIG.JOURS_NATURE[d.nature]?.label || d.nature],
        ['Plateformes', d.plateformes.map(p => CONFIG.MULTI_PLATEFORME[p]?.label || p).join(', ')],
        ['Périmètre', CONFIG.JOURS_PERIMETRE[d.perimetre]?.label || d.perimetre],
        ['Livrables inclus', d.livrables.map(l => CONFIG.JOURS_LIVRABLES[l]?.label || l).join(', ')],
        ['Délai', d.urgence ? 'Urgent (+20% prix / −40% délai)' : 'Standard'],
        // ['Budget client', d.budget || 'Non précisé'],
    ];

    rowsProjet.forEach(([label, valeur], i) => {
        const ry = y + i * 9;
        if (i % 2 === 0) {fill(C.BG); doc.rect(14, ry - 4.5, W - 28, 8, 'F');}
        color(C.MUTED);
        font('bold', 8);
        doc.text(label, 17, ry);
        color(C.CHARCOAL);
        font('normal', 9);

        const wrapped = doc.splitTextToSize(String(valeur), 105);
        doc.text(wrapped, 85, ry);
    });

    y += rowsProjet.length * 9 + 12;
    color(C.MUTED);
    font('bold', 8);
    doc.text('ESTIMATION FINANCIÈRE', 14, y);
    stroke(C.BG);
    doc.line(14, y + 2, W - 14, y + 2);

    y += 9;

    const rowsPrix = [
        ['Taux Journalier Moyen (TJM)', sanitize(`${CONFIG.TRAVAIL_PARTIEL ? CONFIG.TJM / 2 : CONFIG.TJM} €/jour`)],
        ['Durée estimée', sanitize(`${est.joursMin} à ${est.joursMax} jours`)],
    ];

    if (est.codeValide) {
        rowsPrix.push(['Sous-total HT — fourchette', sanitize(`${euros(est.sousTotalHtMin)} - ${euros(est.sousTotalHtMax)}`)]);
        rowsPrix.push([`Remise parrainage (${est.codeUtilise})`, sanitize(`-${euros(est.remiseMin)} - -${euros(est.remiseMax)}`)]);
    }

    rowsPrix.push(['Montant HT — fourchette basse', sanitize(euros(est.prixHtMin))]);
    rowsPrix.push(['Montant HT — fourchette haute', sanitize(euros(est.prixHtMax))]);

    if (CONFIG.TVA > 0) {rowsPrix.push(['TVA applicable', sanitize(`${(CONFIG.TVA * 100).toFixed(0)}%`)]);}

    rowsPrix.forEach(([label, valeur], i) => {
        const ry = y + i * 9;
        if (i % 2 === 0) {fill(C.BG); doc.rect(14, ry - 4.5, W - 28, 8, 'F');}
        color(C.MUTED);
        font('bold', 8);
        doc.text(label, 17, ry);
        color(C.CHARCOAL);
        font('normal', 9);
        doc.text(String(valeur), W - 17, ry, {align: 'right'});
    });

    y += rowsPrix.length * 9 + 5;

    fill(C.PRIMARY);
    doc.rect(14, y, W - 28, 15, 'F');

    color(C.BLANC);
    font('bold', 10);
    doc.text('ESTIMATION TOTALE TTC', 19, y + 7);

    color(C.BLANC);
    font('bold', 12);
    const ttcStr = sanitize(CONFIG.TVA > 0
        ? `${euros(est.prixTtcMin)} - ${euros(est.prixTtcMax)}`
        : `${euros(est.prixHtMin)} - ${euros(est.prixHtMax)} HT`);
    doc.text(ttcStr, W - 19, y + 8, {align: 'right'});

    const fyBase = 270;
    stroke(C.BG);
    doc.line(14, fyBase, W - 14, fyBase);

    color(C.MUTED);
    font('normal', 7);
    doc.text(
        `SIRET : ${fl.siret} · ${fl.adresse} · ${fl.site}`,
        W / 2, fyBase + 5, {align: 'center'}
    );

    const tvaNote = CONFIG.TVA === 0
        ? 'TVA non applicable — Art. 293B du CGI'
        : `TVA ${(CONFIG.TVA * 100).toFixed(0)}% incluse dans le montant TTC`;
    doc.text(
        `Ce devis est valable ${CONFIG.VALIDITE_DEVIS_JOURS} jours. ${tvaNote}.`,
        W / 2, fyBase + 10, {align: 'center'}
    );

    const fname = `Devis_${d.prenom}_${d.nom}_${numDevis}.pdf`;
    doc.save(fname);
}

async function submitForm() {
    collectStep(6);

    const banned = findBannedWordInForm();
    if (banned) {
        Guard.showToast(`Le mot « ${banned.word} » n'est pas autorisé dans le champ « ${banned.label} ». Corrige-le avant d'envoyer ta demande.`, 'Devis non envoyé');
        showStep(banned.step);
        return;
    }

    const waitMinutes = devisRateLimiter.isLimited();
    if (waitMinutes !== null) {
        Guard.showToast(`Tu as atteint la limite de ${CONFIG.RATE_LIMIT_MAX} demandes. Merci de réessayer dans ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`, 'Trop de demandes');
        return;
    }
    devisRateLimiter.record();

    recalculate();

    const payload = buildPayload();

    console.group('📦 Payload devis');
    console.log(JSON.stringify(payload, null, 2));
    console.groupEnd();

    Promise.all([
        sendToWebhook(payload).then(r => { if (!r.success) console.warn('⚠ Webhook non envoyé :', r.reason || r.status); }),
        sendToFormspree(payload).then(r => { if (!r.success) console.warn('⚠ Formspree non envoyé :', r.reason || r.error); }),
    ]);

    const modal = document.getElementById('ModalSuccess');
    const msg  = document.getElementById('modal-msg');
    const d = STATE.data;

    if (d.type_demande === 'devis_officiel') {msg.textContent = `Ta demande de devis officiel a été enregistrée. Tu recevra un document à signer via Yousign à l'adresse ${d.email}.`;}
    else {msg.textContent = `Ton estimation personnalisée a été enregistrée. Tu vas recevoir ton devis à l'adresse ${d.email}.`;}

    modal.classList.remove('Hidden');
}

async function sendToFormspree(payload) {
    if (!CONFIG.FORMSPREE_URL) {
        console.info('ℹ FORMSPREE_URL vide — données non envoyées');
        return {success: false, reason: 'no_url'};
    }

    const d = payload.contact;
    const p = payload.projet;
    const e = payload.estimation;
    const m = payload.meta;

    const flat = {
        numero_devis:   m.numero_devis,
        date:           m.date_lisible,
        type_demande:   m.type_demande === 'devis_officiel' ? 'Devis officiel' : 'Estimation',
        prenom:         d.prenom,
        nom:            d.nom,
        email:          d.email,
        entreprise:     d.entreprise || '—',
        role:           d.role || '—',
        projet:         p.nature_label,
        plateformes:    p.plateformes_labels.join(', '),
        perimetre:      p.perimetre_label,
        livrables:      p.livrables_labels.join(', '),
        urgent:         p.urgent ? 'Oui (+20%)' : 'Non',
        // budget_client:  p.budget_client || 'Non renseigné',
        description_projet: p.description || 'Non renseigné',
        code_parrainage: e.code_parrainage_valide ? `${e.code_parrainage} (−${(e.remise_taux * 100).toFixed(0)}%)` : '—',
        estimation_ht:  e.fourchette_ht,
        estimation_ttc: e.fourchette_ttc,
        jours_estimes:  `${e.jours_min} – ${e.jours_max} jours`,
        tjm:            `${e.tjm} €/j`,
    };

    try {
        const res = await fetch(CONFIG.FORMSPREE_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: JSON.stringify(flat),
        });
        const data = await res.json();
        if (res.ok) {
            console.log('✅ Formspree envoyé avec succès');
            return {success: true};
        } else {
            console.error('❌ Erreur Formspree :', data);
            return {success: false, error: data};
        }
    } catch (err) {
        console.error('❌ Erreur réseau Formspree :', err.message);
        return {success: false, error: err.message};
    }
}

function buildPayload() {
    const d = STATE.data;
    const est = STATE.estimation;
    const now = new Date();

    return {

        meta: {
            numero_devis: `DEV-${Date.now()}`,
            date_soumission: now.toISOString(),
            date_lisible: now.toLocaleDateString('fr-FR'),
            type_demande: d.type_demande,
        },

        contact: {
            prenom: d.prenom,
            nom: d.nom,
            nom_complet: `${d.prenom} ${d.nom}`,
            email: d.email,
            entreprise: d.entreprise,
            role: d.role,
        },

        projet: {
            nature: d.nature,
            nature_label: CONFIG.JOURS_NATURE[d.nature]?.label || '',
            plateformes: d.plateformes,
            plateformes_labels: d.plateformes.map(p => CONFIG.MULTI_PLATEFORME[p]?.label || p),
            perimetre: d.perimetre,
            perimetre_label: CONFIG.JOURS_PERIMETRE[d.perimetre]?.label || '',
            livrables: d.livrables,
            livrables_labels: d.livrables.map(l => CONFIG.JOURS_LIVRABLES[l]?.label || l),
            urgent: d.urgence,
            // budget_client: d.budget,
            description: d.description_projet || '',
        },

        estimation: {
            tjm: CONFIG.TRAVAIL_PARTIEL ? CONFIG.TJM / 2 : CONFIG.TJM,
            jours_min: est.joursMin,
            jours_max: est.joursMax,
            sous_total_ht_min: est.sousTotalHtMin,
            sous_total_ht_max: est.sousTotalHtMax,
            code_parrainage: est.codeUtilise || '',
            code_parrainage_valide: est.codeValide,
            remise_taux: est.codeValide ? CONFIG.REMISE_PARRAINAGE : 0,
            remise_ht_min: est.remiseMin,
            remise_ht_max: est.remiseMax,
            prix_ht_min: est.prixHtMin,
            prix_ht_max: est.prixHtMax,
            tva_taux: CONFIG.TVA,
            prix_ttc_min: est.prixTtcMin,
            prix_ttc_max: est.prixTtcMax,

            fourchette_ht: `${euros(est.prixHtMin)} – ${euros(est.prixHtMax)} HT`,
            fourchette_ttc: CONFIG.TVA > 0
                ? `${euros(est.prixTtcMin)} – ${euros(est.prixTtcMax)} TTC`
                : `${euros(est.prixHtMin)} – ${euros(est.prixHtMax)} HT`,
            details_calcul: est.details,
        },

        freelance: CONFIG.FREELANCE,
    };
}

/**
* @param {Object} payload
* @returns {Promise<{success: boolean}>}
*/

async function sendToWebhook(payload) {
    if (!CONFIG.WEBHOOK_URL) {
        console.info('ℹ WEBHOOK_URL vide — données non envoyées (mode dev)');
        return {success: false, reason: 'no_url'};
    }

    try {
        const res = await fetch(CONFIG.WEBHOOK_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            console.log('✅ Webhook envoyé avec succès');
            return {success: true};
        } else {
            console.error('❌ Erreur webhook :', res.status, res.statusText);
            return {success: false, status: res.status};
        }
    } catch (err) {
        console.error('❌ Erreur réseau :', err.message);
        return {success: false, error: err.message};
    }
}

function resetForm() {
    document.getElementById('ModalSuccess').classList.add('Hidden');

    STATE.currentStep = 1;
    STATE.data = {
        prenom: '',
        nom: '',
        email: '',
        entreprise: '',
        role: '',
        nature: '',
        plateformes: [],
        perimetre: '',
        livrables: [],
        urgence: false,
        // budget: '',
        type_demande: 'estimation',
        code_parrainage: '',
    };

    STATE.estimation = {
        joursMin: 0, joursMax: 0,
        prixHtMin: 0, prixHtMax: 0,
        prixTtcMin: 0, prixTtcMax: 0,
        sousTotalHtMin: 0, sousTotalHtMax: 0,
        remiseMin: 0, remiseMax: 0,
        codeValide: false, codeUtilise: '',
        details: [],
    };

    document.querySelectorAll('.Input').forEach(el => {
        if (el.tagName === 'SELECT') el.value = '';
        else el.value = '';
        el.classList.remove('HasValue');
    });

    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => {el.checked = false;});

    STATE.data.livrables = [];
    syncMaquetteInclusion();

    const defRadio = document.querySelector('input[name="type_demande"][value="estimation"]');
    if (defRadio) defRadio.checked = true;

    document.getElementById('Standard').classList.remove('Hidden');
    document.getElementById('Urgent').classList.add('Hidden');

    setText('s-price-main', '— €');
    setText('m-price-main', '— €');
    setText('m-ttc', '—');
    setText('s-ht-min', '—');
    setText('s-ht-max', '—');
    setText('s-tva-val', '—');
    setText('s-ttc', '—');
    setText('s-jours', '—');
    setText('md-price-main', '— €');
    setText('md-ttc', '—');
    setText('md-ht-min', '—');
    setText('md-ht-max', '—');
    setText('md-tva-val', '—');
    setText('md-jours', '—');
    const mdBdReset = document.getElementById('md-breakdown');
    if (mdBdReset) mdBdReset.innerHTML = '<div class="BreakdownPlaceholder">Complète le formulaire...</div>';

    document.getElementById('s-breakdown').innerHTML = '<div class="BreakdownPlaceholder">Complète le formulaire...</div>';

    const sRemiseRowReset = document.getElementById('s-remise-row');
    if (sRemiseRowReset) sRemiseRowReset.classList.add('Hidden');
    const mdRemiseRowReset = document.getElementById('md-remise-row');
    if (mdRemiseRowReset) mdRemiseRowReset.classList.add('Hidden');

    const codeFeedbackReset = document.getElementById('code-feedback');
    if (codeFeedbackReset) {
        codeFeedbackReset.textContent = '';
        codeFeedbackReset.className = 'CodeFeedback';
    }

    buildProgressBar();
    showStep(1);
}

document.addEventListener('DOMContentLoaded', () => {buildProgressBar();
showStep(1);

function syncHasValue(el) {
    el.classList.toggle('HasValue', el.value.trim() !== '');
}

document.querySelectorAll('.InputGroup .Input').forEach(el => {
    syncHasValue(el);
    el.addEventListener('input', () => syncHasValue(el));
    el.addEventListener('blur', () => syncHasValue(el));
});

const initTJM = CONFIG.TRAVAIL_PARTIEL ? CONFIG.TJM / 2 : CONFIG.TJM;
setText('s-tjm-val', initTJM);
setText('md-tjm-val', initTJM);

STATE.data.livrables = [...document.querySelectorAll('input[name="livrables"]:checked')].map(e => e.value);
syncMaquetteInclusion();

document.querySelectorAll('input[name="nature"]').forEach(el =>
    el.addEventListener('change', () => {
        STATE.data.nature = el.value;
        syncMaquetteInclusion();
        recalculate();
    })
);

document.querySelectorAll('input[name="plateformes"]').forEach(el =>
    el.addEventListener('change', () => {
        STATE.data.plateformes = [...document.querySelectorAll('input[name="plateformes"]:checked')].map(e => e.value);
        recalculate();
    })
);

document.querySelectorAll('input[name="perimetre"]').forEach(el =>
    el.addEventListener('change', () => {
        STATE.data.perimetre = el.value;
        recalculate();
    })
);

document.querySelectorAll('input[name="livrables"]').forEach(el =>
    el.addEventListener('change', () => {
        STATE.data.livrables = [...document.querySelectorAll('input[name="livrables"]:checked')].map(e => e.value);
        recalculate();
    })
);

document.getElementById('urgence').addEventListener('change', function() {
    STATE.data.urgence = this.checked;
    document.getElementById('Standard').classList.toggle('Hidden', this.checked);
    document.getElementById('Urgent').classList.toggle('Hidden', !this.checked);
    recalculate();
});

const codeInput = document.getElementById('code_parrainage');
if (codeInput) {
    codeInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
        STATE.data.code_parrainage = this.value;
        recalculate();
    });
}

const maquettesCheckbox = document.getElementById('l-ui');
if (maquettesCheckbox) {
    maquettesCheckbox.addEventListener('change', function() {
        if (!this.checked) {
            this.checked = true;
        }
    });
}

const mobileBar = document.getElementById('MobileBar');
let touchStartY = 0;
let touchStartTime = 0;

if (mobileBar) {
    mobileBar.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, {passive: true});
    mobileBar.addEventListener('touchend', (e) => {
        const dy = touchStartY - e.changedTouches[0].clientY;
        const dt = Date.now() - touchStartTime;
        if (dy > 20 || (dy > 8 && dt < 200)) openMobileDrawer();
    }, {passive: true});
}

const drawer = document.getElementById('MobileDrawer');
let drawerTouchStartY = 0;
if (drawer) {
    drawer.addEventListener('touchstart', (e) => {
        drawerTouchStartY = e.touches[0].clientY;
    }, {passive: true});
    drawer.addEventListener('touchend', (e) => {
        const dy = e.changedTouches[0].clientY - drawerTouchStartY;
        if (dy > 55) closeMobileDrawer();
    }, {passive: true});
}
    });

function openMobileDrawer() {
    const drawer  = document.getElementById('MobileDrawer');
    const overlay = document.getElementById('MobileDrawerOverlay');
    if (!drawer || !overlay) return;
    drawer.classList.add('Open');
    overlay.classList.add('Open');
    document.body.style.overflow = 'Hidden';
}

function closeMobileDrawer() {
    const drawer  = document.getElementById('MobileDrawer');
    const overlay = document.getElementById('MobileDrawerOverlay');
    if (!drawer || !overlay) return;
    drawer.classList.remove('Open');
    overlay.classList.remove('Open');
    document.body.style.overflow = '';
}

function toggleMobileDrawer() {
    const drawer = document.getElementById('MobileDrawer');
    if (!drawer) return;
    drawer.classList.contains('Open') ? closeMobileDrawer() : openMobileDrawer();
}
