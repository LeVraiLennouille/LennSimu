# LennSimu

Simulateur de devis UI/UX Design par Lennouille — 100 % statique, sans dépendance au site lennouille.fr.

## Structure

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page du simulateur (6 étapes, estimation en direct, modale de confirmation) |
| `style.css` | DA LennAudits / LennOutils, accent `#134C85`, thème clair/sombre automatique |
| `script.js` | Configuration (`CONFIG`), moteur de calcul, génération du PDF, envoi Formspree |
| `guard.js` | Filtre de mots interdits, limite d'envoi (3 / 15 min), toast d'erreur |
| `assets/icon.svg` | Logo / favicon |

## Publication (GitHub Pages)

1. Créer le dépôt `LennSimu` et y pousser le contenu de ce dossier.
2. *Settings → Pages* : déployer depuis la branche `main`, dossier `/ (root)`.
3. Le simulateur est alors servi sur `lennouille.fr/LennSimu/` (comme LennAudits et LennOutils).

Tous les chemins sont relatifs : le dossier peut aussi être ouvert en local ou hébergé ailleurs.

## Personnalisation

- Tarifs, TVA, codes de parrainage, coordonnées du devis, Formspree : bloc `CONFIG` en haut de `script.js`.
- Mots interdits : tableau `BANNED_WORDS` en haut de `guard.js`.
- Couleur d'accent : variables `--Primary`, `--PrimaryRGB`, `--DarkPrimary` en haut de `style.css`
  (la couleur du bandeau du PDF se règle dans `downloadPDF()` : `C.PRIMARY`).

## Dépendance externe

La génération du PDF charge jsPDF 2.5.1 depuis cdnjs, et la police Syne vient de Google Fonts (comme LennAudits).
