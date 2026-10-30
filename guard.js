/* ==========================================================================
   guard.js — garde-fous du formulaire (autonome, aucune dépendance au site)
   - Guard.findBannedWord(fields)      → filtre de mots interdits
   - Guard.createRateLimiter(...)      → limite d'envoi côté client
   - Guard.showToast(message, titre)   → toast d'erreur (#ToastContainer)
========================================================================== */
const Guard = (() => {

    /* ► Mots interdits (un mot ou une expression par entrée, sans accents ni majuscules).
         Liste de départ : remplace-la par celle de ton form-guard.js du site. */
    const BANNED_WORDS = [
        'merde', 'putain', 'pute', 'salope', 'connard', 'connasse', 'encule',
        'enculee', 'fdp', 'ntm', 'nique ta mere', 'batard', 'pd',
    ];

    const TOAST_DURATION_MS = 6000;

    /* Minuscules, sans accents, ponctuation → espaces. */
    const normalize = (text) => String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const BANNED_NORMALIZED = BANNED_WORDS.map(w => ({raw: w, norm: normalize(w)})).filter(w => w.norm);

    /**
     * @param {{value: string, label: string, step: number}[]} fields
     * @returns {{word: string, label: string, step: number} | null}
     */
    function findBannedWord(fields) {
        for (const field of fields) {
            const haystack = ` ${normalize(field.value)} `;
            for (const banned of BANNED_NORMALIZED) {
                if (haystack.includes(` ${banned.norm} `)) {
                    return {word: banned.raw, label: field.label, step: field.step};
                }
            }
        }
        return null;
    }

    /**
     * Limite le nombre d'envois dans une fenêtre glissante (stockage local).
     * @returns {{isLimited: () => (number|null), record: () => void}}
     *   isLimited() renvoie le nombre de minutes à attendre, ou null si l'envoi est autorisé.
     */
    function createRateLimiter(key, max, windowMs) {
        const read = () => {
            try {
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                const now = Date.now();
                return Array.isArray(list) ? list.filter(t => typeof t === 'number' && now - t < windowMs) : [];
            } catch {
                return [];
            }
        };
        const write = (list) => {
            try {localStorage.setItem(key, JSON.stringify(list));} catch { /* stockage indisponible */ }
        };

        return {
            isLimited() {
                const list = read();
                if (list.length < max) return null;
                const oldest = Math.min(...list);
                return Math.max(1, Math.ceil((oldest + windowMs - Date.now()) / 60000));
            },
            record() {
                const list = read();
                list.push(Date.now());
                write(list);
            },
        };
    }

    function showToast(message, title = 'Erreur') {
        const container = document.getElementById('ToastContainer');
        if (!container) {
            console.warn(`${title} — ${message}`);
            return;
        }

        const toast = document.createElement('div');
        toast.className = 'Toast';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <svg class="ToastIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            <div class="ToastBody">
                <div class="ToastTitle"></div>
                <div class="ToastMessage"></div>
            </div>
            <button type="button" class="ToastClose" aria-label="Fermer">×</button>`;
        toast.querySelector('.ToastTitle').textContent = title;
        toast.querySelector('.ToastMessage').textContent = message;

        let timer;
        const dismiss = () => {
            clearTimeout(timer);
            toast.classList.add('ToastOut');
            toast.addEventListener('animationend', () => toast.remove(), {once: true});
            setTimeout(() => toast.remove(), 400);
        };
        toast.querySelector('.ToastClose').addEventListener('click', dismiss);
        timer = setTimeout(dismiss, TOAST_DURATION_MS);

        container.appendChild(toast);
    }

    return {findBannedWord, createRateLimiter, showToast};
})();
