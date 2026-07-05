<?php

namespace Database\Seeders\Aval;

use App\Models\CustomField;
use App\Models\CustomFieldset;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Champs personnalisés et fieldsets « Véhicule » et « Équipement biomédical ».
 * La sauvegarde d'un CustomField crée la colonne _snipeit_* sur la table assets.
 * Idempotent — firstOrCreate sur le nom, syncWithoutDetaching sur les pivots.
 */
class CncCustomFieldSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('permissions->superuser', '1')->first();
        if (! $admin) {
            $this->command?->error('Aucun superadmin — exécuter aval:install ou créer un admin d\'abord.');

            return;
        }

        $fieldsets = [
            'Véhicule' => [
                ['name' => 'Immatriculation',      'element' => 'text', 'format' => ''],
                ['name' => 'Kilométrage',          'element' => 'text', 'format' => 'numeric'],
                ['name' => 'Échéance assurance',   'element' => 'text', 'format' => 'date'],
                ['name' => 'Échéance vignette',    'element' => 'text', 'format' => 'date'],
                ['name' => 'Chauffeur affecté',    'element' => 'text', 'format' => ''],
            ],
            'Équipement biomédical' => [
                ['name' => 'Criticité clinique',     'element' => 'listbox', 'format' => '', 'field_values' => "Critique\nÉlevée\nMoyenne\nFaible"],
                ['name' => 'Dernière calibration',   'element' => 'text', 'format' => 'date'],
                ['name' => 'Prochaine calibration',  'element' => 'text', 'format' => 'date'],
                ['name' => 'Contrat de maintenance', 'element' => 'text', 'format' => ''],
            ],
        ];

        foreach ($fieldsets as $fieldsetName => $fields) {
            $fieldset = CustomFieldset::firstOrCreate(
                ['name' => $fieldsetName],
                ['created_by' => $admin->id]
            );

            foreach ($fields as $order => $fieldAttrs) {
                $attrs = array_merge($fieldAttrs, ['created_by' => $admin->id]);
                $field = CustomField::firstOrCreate(
                    ['name' => $attrs['name']],
                    $attrs
                );
                $fieldset->fields()->syncWithoutDetaching([
                    $field->id => ['order' => $order + 1, 'required' => 0],
                ]);
            }
        }
    }
}
