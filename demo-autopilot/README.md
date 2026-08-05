# Autopilote de démo vidéo — Aval Parc

Pilote l'application dans un vrai navigateur **comme un humain** (frappe lente,
pauses calibrées) et **s'enregistre en vidéo 1080p** avec sous-titres intégrés
et diapositives de marque. Résultat : une vidéo de démonstration commerciale
rejouable à l'infini, sans OBS ni montage.

## Prérequis

- Node ≥ 20, `npm install` dans ce dossier (Playwright + Chromium)
- PHP ≥ 8.2 avec `pdo_sqlite` et `gd` (les prérequis d'Aval Parc)
- `ffmpeg` pour la conversion mp4 (sinon la vidéo reste en .webm)

## Utilisation

```bash
npm install

# Itération rapide (accéléré ×10, captures par acte dans shots/)
SPEED=0.1 HEADLESS=1 SHOTS=1 node autopilot.mjs      # ou: npm test

# Vidéo finale (1080p, mp4)
VIDEO=1 HEADLESS=1 node autopilot.mjs                # ou: npm run video
# → demo-autopilot/aval-parc-demo.mp4
```

| Variable | Effet |
|---|---|
| `SPEED` | 0.1 = test accéléré · 1 = rythme vidéo · 1.5 = confortable pour voix off |
| `HEADLESS=1` | sans fenêtre de navigateur |
| `SHOTS=1` | un screenshot par acte dans `shots/` (et capture automatique en cas d'échec) |
| `VIDEO=1` | enregistre la vidéo (webm → mp4 via ffmpeg) |
| `PORT` | port du serveur jetable (défaut 8123) |
| `KEEP=1` | conserve la base SQLite `/tmp` à la fin (debug) |

## Comment ça marche

1. **Serveur jetable** : le script installe une instance NEUVE d'Aval Parc
   (`php artisan serve`, base SQLite dans `/tmp`, recréée à chaque run) via
   `aval:install` + `DemoSeeder` — il ne touche jamais aux données ni au port
   de développement. Compte de démo : `demo` / `Autopilot-2026`.
2. **Sous-titres** : bandeau injecté au DOM (position fixe, couleurs de la
   marque) + badge d'acte en coin — incrustés dans la vidéo, aucun montage.
3. **Étapes non filmables** (installation serveur…) : rendues en diapositives
   plein écran injectées au DOM (dégradé de marque, blocs de code).
4. **Onglets `_blank`** (planche d'étiquettes…) : neutralisés pour rester dans
   l'onglet filmé ; en mode vidéo, `window.open` est intercepté vers une
   surimpression `<embed>`.

## Scénario (11 actes, ≈ 3 min 45 à SPEED=1)

Ouverture → Connexion → Tableau de bord → Retrouver un bien (recherche par
étiquette) → Panne & réparation (clôture d'une maintenance) → Affectation
(select2 agent) → Pointage d'inventaire (+ mode scanner) → Étiquettes →
Rapport Direction → Diapositive déploiement → Conclusion/contact.

Le scénario vit dans `autopilot.mjs` : une fonction par acte (`acte0_…` à
`acte10_…`) — ajouter/retirer un acte = ajouter/retirer une fonction dans la
liste `ACTES`.

## Dépannage

- Un acte échoue → regarder `shots/ERREUR-<acte>.png` : c'est l'état réel de
  l'UI au moment de l'échec.
- Les données de démo ont changé (DemoSeeder) → vérifier les étiquettes
  utilisées par les actes (AVAL-DEMO-0001, 0005, la maintenance « Réparation
  moteur - Hilux ») : elles doivent rester libres/cohérentes.
- `ffprobe -i aval-parc-demo.mp4` pour vérifier la durée de la vidéo produite.
