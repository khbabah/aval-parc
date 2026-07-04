# Aval Parc — Design / Spécification

**Date :** 2026-07-04
**Statut :** Validé par Khaled
**Produit :** Aval Parc — gestion de parc (équipements médicaux, véhicules, mobilier, IT) pour cliniques et hôpitaux
**Base :** Fork suiveur de [Snipe-IT](https://github.com/grokability/snipe-it) (Laravel, AGPL-3.0)
**Premier client :** Centre National de Cardiologie (CNC), Nouakchott, Mauritanie — https://cnc.mr

## 1. Objectif

Créer et maintenir une version customisée de Snipe-IT, renommée **Aval Parc**, adaptée aux besoins des établissements de santé : gestion des équipements médicaux, des véhicules, du mobilier et du matériel informatique. Le produit est vendu en prestation (installation, configuration, maintenance, support), pas en licence propriétaire.

Le nom « Aval Parc » s'inscrit dans la gamme produit « Aval » (avec aval-sign) et parle immédiatement au marché francophone : « parc d'équipements », « parc automobile ».

## 2. Stratégie Git : fork suiveur

Décision : **fork suiveur** (et non fork dur) pour continuer à bénéficier des correctifs de sécurité et évolutions de Snipe-IT sans les porter soi-même.

- Repo `aval-parc`, deux remotes : `origin` (GitHub Khbabah) et `upstream` (grokability/snipe-it).
- Branche `upstream-master` : miroir pur de Snipe-IT, jamais modifiée directement.
- Branche `main` : dernière release stable **taguée** de Snipe-IT + commits de customisation Aval par-dessus.
- Procédure de mise à jour : `git fetch upstream` → merge du tag de release dans `main` → suite de tests → checklist de non-régression → déploiement.
- On ne part jamais de `master` upstream, uniquement des releases taguées.

## 3. Architecture des customisations : couche fine + config

Trois niveaux, du moins intrusif au plus intrusif. Règle : toujours utiliser le niveau le plus bas qui suffit.

### Niveau 1 — Configuration native (zéro code)

Snipe-IT fournit nativement le rebranding (nom du site, logo, couleurs, favicon dans les paramètres), les champs personnalisés (custom fields + fieldsets), les catégories, statuts, lieux, fournisseurs, et la maintenance des actifs.

- Branding « Aval Parc » entièrement via les paramètres intégrés.
- Modèle de données métier via custom fields :
  - **Véhicules :** kilométrage, n° immatriculation, échéance assurance, échéance vignette, chauffeur affecté, carnet d'entretien.
  - **Biomédical :** n° de série constructeur, criticité clinique, date de dernière calibration, prochaine calibration, contrat de maintenance.
- Toute cette configuration est capturée dans des **seeders Laravel versionnés** (`database/seeders/Aval/`) : installation d'un nouveau client (catégories, champs, statuts, étiquettes) en une commande. Le seeder CNC est le premier.

### Niveau 2 — Code isolé dans le namespace Aval (aucun fichier upstream modifié)

- Services et logique métier : `app/Aval/`
- Vues : `resources/views/aval/`
- Routes : fichier de routes dédié Aval
- Traductions surchargées : `resources/lang/{fr,ar}/aval/`
- Tests dédiés aux modules Aval.

### Niveau 3 — Patchs upstream minimaux (dernier recours)

Uniquement quand il faut toucher un fichier Snipe-IT (ex. injecter un onglet dans une vue existante). Chaque patch est documenté dans `docs/UPSTREAM_PATCHES.md` (fichier touché, raison, comment re-vérifier après merge).

## 4. Phases de livraison

| Phase | Contenu | Livrable |
|---|---|---|
| **v1** | Fork + rebranding + seeders CNC (catégories, champs custom véhicules/biomédical simples) + Docker | Installation CNC opérationnelle |
| **v1.1** | Passe qualité traductions FR + AR (RTL) sur les écrans réellement utilisés | Interface propre pour le personnel |
| **v2** | Module véhicules enrichi : rapports (échéances assurance/vignette, coûts), alertes | Tableau de bord flotte |
| **v3** | Module biomédical : workflow calibration/métrologie, contrats de maintenance, alertes de conformité | Tableau de bord biomédical |

Chaque phase est utilisable seule. Le CNC démarre dès la v1 : Snipe-IT couvre déjà en natif les affectations (checkout/checkin), la maintenance, les audits et les rapports de base.

## 5. Déploiement

- **Cible :** Docker sur serveur local dans la clinique (connectivité internet variable en Mauritanie ; données sur site). Doit fonctionner entièrement hors ligne.
- Docker Compose dérivé des images officielles Snipe-IT : app + MariaDB + volumes de persistance.
- Script d'installation initiale : génération `.env`, clé d'application, migrations, seeders CNC.
- Sauvegardes automatiques locales (base + uploads) avec rotation.
- Mise à jour en une commande documentée.

## 6. Contraintes légales (AGPL-3.0)

- La licence AGPL-3.0 de Snipe-IT est conservée ; les mentions de copyright d'origine restent en place.
- Le code source d'Aval Parc (avec toutes les modifications) est rendu disponible aux utilisateurs du service — repo GitHub public ou lien « code source » dans le pied de page.
- La marque « Snipe-IT » n'est pas utilisée pour désigner le produit ; le renommage en « Aval Parc » couvre ce point.
- Le modèle commercial (prestation : installation, configuration, support, maintenance) est pleinement compatible AGPL.

## 7. Tests et vérification

- La suite PHPUnit de Snipe-IT doit passer après chaque merge upstream — filet de sécurité principal du fork suiveur.
- Les modules `app/Aval/` ont leurs propres tests.
- Checklist de non-régression manuelle avant chaque déploiement au CNC : login, création d'un actif, checkout/checkin, rapport, impression d'étiquette.

## 8. Hors périmètre (pour l'instant)

- SaaS multi-clients hébergé (le Docker reste portable si ce besoin arrive).
- Refonte UX profonde de Snipe-IT.
- Intégrations externes (GMAO hospitalière, HL7, etc.).
