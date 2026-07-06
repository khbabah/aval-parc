# Registre des patchs upstream

Fichiers Snipe-IT modifiés par Aval Parc. **À re-vérifier à chaque merge d'une release upstream.**

| Fichier | Raison | Comment vérifier après merge |
|---|---|---|
| `config/app.php` (ligne dans `providers` : `App\Providers\AvalServiceProvider::class`) | v1.1 — francisation : enregistre le provider qui applique `app/Aval/lang/overrides-fr.php` par-dessus le pack fr-FR upstream via `Lang::addLines()`, sans jamais toucher `resources/lang/**`. | Après un merge upstream, vérifier que la clé `providers` existe toujours au même endroit dans `config/app.php` et que la ligne `App\Providers\AvalServiceProvider::class,` est toujours présente (elle ne doit être perdue par aucun merge/rebase). Puis lancer `php artisan test tests/Feature/Aval/AvalLangOverridesTest.php` : si la fr-FR upstream a corrigé une clé que nous surchargeons, retirer l'entrée correspondante de `overrides-fr.php` (ne plus surcharger une clé déjà correctement traduite en amont). |

Règle : ne modifier un fichier upstream qu'en dernier recours (niveau 3 de la spec).
Toute entrée ajoutée ici doit expliquer la raison et le test de non-régression associé.
