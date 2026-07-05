<?php

namespace Database\Seeders\Aval;

use App\Models\Asset;
use App\Models\AssetModel;
use App\Models\Category;
use App\Models\CustomField;
use App\Models\CustomFieldset;
use App\Models\Location;
use App\Models\Maintenance;
use App\Models\MaintenanceType;
use App\Models\Manufacturer;
use App\Models\Statuslabel;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Peuple une instance de DÉMONSTRATION (avalparc.bsimr.com) avec un parc
 * réaliste de clinique cardiologique : lieux, fournisseurs, fabricants,
 * modèles d'actifs (avec images générées), actifs, personnel et affectations.
 *
 * JAMAIS appelé par `aval:install`. Usage strictement manuel, jamais sur une
 * base de production :
 *   php artisan db:seed --class="Database\Seeders\Aval\DemoSeeder" --force
 *
 * Idempotent : firstOrCreate sur clés naturelles (nom, asset_tag, username),
 * jamais de truncate.
 */
class DemoSeeder extends Seeder
{
    /** Couleurs GD par type de catégorie (RGB). */
    private const COLOR_BIOMEDICAL = [30, 80, 150];  // bleu médical

    private const COLOR_VEHICULE = [95, 115, 95];    // gris-vert

    public function run(): void
    {
        // Prérequis internes : catégories / statuts / champs personnalisés CNC.
        $this->call(CncSeeder::class);

        $admin = User::where('permissions->superuser', '1')->first();
        if (! $admin) {
            $this->command?->error('Aucun superadmin — exécuter aval:install ou créer un admin d\'abord.');

            return;
        }

        $locations = $this->seedLocations();
        $suppliers = $this->seedSuppliers();
        $manufacturers = $this->seedManufacturers();
        $models = $this->seedModels($admin, $manufacturers);
        $customFields = CustomField::whereIn('name', [
            'Immatriculation', 'Kilométrage', 'Échéance assurance', 'Échéance vignette', 'Chauffeur affecté',
            'Criticité clinique', 'Dernière calibration', 'Prochaine calibration', 'Contrat de maintenance',
        ])->get()->keyBy('name');

        $assets = $this->seedAssets($admin, $models, $locations, $customFields);
        $users = $this->seedUsers($admin);
        $this->seedCheckouts($assets, $users, $admin);
        $this->seedMaintenances($assets, $suppliers, $admin);
    }

    /**
     * @return array<string, Location>
     */
    private function seedLocations(): array
    {
        $locations = [];
        foreach (['CNC — Bâtiment principal', 'CNC — Annexe', 'CNC — Garage'] as $name) {
            $locations[$name] = Location::firstOrCreate(['name' => $name]);
        }

        return $locations;
    }

    /**
     * @return array<string, Supplier>
     */
    private function seedSuppliers(): array
    {
        $suppliers = [];
        foreach (['Médical Plus Nouakchott', 'Toyota Mauritanie'] as $name) {
            $suppliers[$name] = Supplier::firstOrCreate(['name' => $name]);
        }

        return $suppliers;
    }

    /**
     * @return array<string, Manufacturer>
     */
    private function seedManufacturers(): array
    {
        $manufacturers = [];
        foreach (['GE Healthcare', 'Philips', 'Mindray', 'Dräger', 'Toyota', 'Hyundai'] as $name) {
            $manufacturers[$name] = Manufacturer::firstOrCreate(['name' => $name]);
        }

        return $manufacturers;
    }

    /**
     * @param  array<string, Manufacturer>  $manufacturers
     * @return array<string, AssetModel>
     */
    private function seedModels(User $admin, array $manufacturers): array
    {
        $biomedicalCategory = Category::where('name', 'Équipement biomédical')->where('category_type', 'asset')->firstOrFail();
        $vehiculeCategory = Category::where('name', 'Véhicule')->where('category_type', 'asset')->firstOrFail();
        $biomedicalFieldset = CustomFieldset::where('name', 'Équipement biomédical')->firstOrFail();
        $vehiculeFieldset = CustomFieldset::where('name', 'Véhicule')->firstOrFail();

        $specs = [
            ['name' => 'Vivid E95', 'manufacturer' => 'GE Healthcare', 'type' => 'biomedical'],
            ['name' => 'MAC 2000', 'manufacturer' => 'GE Healthcare', 'type' => 'biomedical'],
            ['name' => 'IntelliVue MX450', 'manufacturer' => 'Philips', 'type' => 'biomedical'],
            ['name' => 'BeneHeart D3', 'manufacturer' => 'Mindray', 'type' => 'biomedical'],
            ['name' => 'Evita V300', 'manufacturer' => 'Dräger', 'type' => 'biomedical'],
            ['name' => 'Hilux', 'manufacturer' => 'Toyota', 'type' => 'vehicule'],
            ['name' => 'Land Cruiser 78', 'manufacturer' => 'Toyota', 'type' => 'vehicule'],
            ['name' => 'H-1', 'manufacturer' => 'Hyundai', 'type' => 'vehicule'],
        ];

        $models = [];
        foreach ($specs as $spec) {
            $isBiomedical = $spec['type'] === 'biomedical';

            $model = AssetModel::firstOrCreate(
                ['name' => $spec['name']],
                [
                    'category_id' => $isBiomedical ? $biomedicalCategory->id : $vehiculeCategory->id,
                    'manufacturer_id' => $manufacturers[$spec['manufacturer']]->id,
                    'fieldset_id' => $isBiomedical ? $biomedicalFieldset->id : $vehiculeFieldset->id,
                    'created_by' => $admin->id,
                    'notes' => 'Créé par DemoSeeder Aval Parc',
                ]
            );

            // Régénère l'image factice à chaque exécution (pas de doublon de modèle).
            $model->image = $this->generateModelImage($spec['name'], $isBiomedical);
            $model->save();

            $models[$spec['name']] = $model;
        }

        return $models;
    }

    /**
     * Génère une image PNG 800x600 factice (fond coloré par catégorie, nom du
     * modèle centré, petit cadre) et l'enregistre là où l'UI Snipe-IT
     * attend les images de modèles : disque `public`, sous `models_upload_path`.
     */
    private function generateModelImage(string $modelName, bool $isBiomedical): string
    {
        $width = 800;
        $height = 600;
        $image = imagecreatetruecolor($width, $height);

        [$r, $g, $b] = $isBiomedical ? self::COLOR_BIOMEDICAL : self::COLOR_VEHICULE;
        $background = imagecolorallocate($image, $r, $g, $b);
        imagefill($image, 0, 0, $background);

        $white = imagecolorallocate($image, 255, 255, 255);
        imagerectangle($image, 12, 12, $width - 13, $height - 13, $white);
        imagerectangle($image, 18, 18, $width - 19, $height - 19, $white);

        $font = 5; // police GD intégrée la plus grande
        $textWidth = imagefontwidth($font) * strlen($modelName);
        $textHeight = imagefontheight($font);
        $x = (int) (($width - $textWidth) / 2);
        $y = (int) (($height - $textHeight) / 2);
        imagestring($image, $font, max($x, 0), max($y, 0), $modelName, $white);

        ob_start();
        imagepng($image);
        $binary = ob_get_clean();
        imagedestroy($image);

        $filename = Str::slug($modelName).'.png';
        Storage::disk('public')->put(app('models_upload_path').$filename, $binary);

        return $filename;
    }

    /**
     * @param  array<string, AssetModel>  $models
     * @param  array<string, Location>  $locations
     * @param  \Illuminate\Support\Collection<string, CustomField>  $fields
     * @return array<string, Asset>
     */
    private function seedAssets(User $admin, array $models, array $locations, $fields): array
    {
        $statuses = [
            'En service' => Statuslabel::where('name', 'En service')->firstOrFail(),
            'En maintenance' => Statuslabel::where('name', 'En maintenance')->firstOrFail(),
            'En panne' => Statuslabel::where('name', 'En panne')->firstOrFail(),
        ];
        $locationList = array_values($locations);

        // 16 actifs déterministes : 2 par modèle, dans l'ordre des modèles ci-dessus.
        $modelOrder = [
            'Vivid E95', 'Vivid E95',
            'MAC 2000', 'MAC 2000',
            'IntelliVue MX450', 'IntelliVue MX450',
            'BeneHeart D3', 'BeneHeart D3',
            'Evita V300', 'Evita V300',
            'Hilux', 'Hilux',
            'Land Cruiser 78', 'Land Cruiser 78',
            'H-1', 'H-1',
        ];

        // Criticité cyclique pour les actifs biomédicaux (indices 1..10).
        $criticites = ['Critique', 'Élevée', 'Moyenne', 'Faible'];

        // Immatriculations factices mauritaniennes pour les véhicules (indices 11..16).
        $immatriculations = [
            11 => '0123 AB 01', 12 => '0456 AB 01',
            13 => '0789 CD 02', 14 => '0812 CD 02',
            15 => '0951 EF 03', 16 => '1024 EF 03',
        ];
        $chauffeurs = [
            11 => 'Sidi Ould Cheikh', 12 => 'Mohamed Vall Ould Sidi',
            13 => 'Sidi Ould Cheikh', 14 => 'Mohamed Vall Ould Sidi',
            15 => 'Sidi Ould Cheikh', 16 => 'Mohamed Vall Ould Sidi',
        ];

        $assets = [];
        foreach ($modelOrder as $index => $modelName) {
            $i = $index + 1; // 1..16
            $tag = sprintf('AVAL-DEMO-%04d', $i);
            $model = $models[$modelName];

            $status = $statuses['En service'];
            if ($i === 11) {
                $status = $statuses['En maintenance']; // Hilux — panne moteur, cf. maintenance en cours
            } elseif ($i === 4) {
                $status = $statuses['En panne']; // MAC 2000 — hors service
            }

            $asset = Asset::firstOrCreate(
                ['asset_tag' => $tag],
                [
                    'model_id' => $model->id,
                    'status_id' => $status->id,
                    'location_id' => $locationList[$index % count($locationList)]->id,
                    'rtd_location_id' => $locationList[$index % count($locationList)]->id,
                    'serial' => sprintf('SN-DEMO-%04d', $i),
                    'created_by' => $admin->id,
                    'notes' => 'Créé par DemoSeeder Aval Parc',
                ]
            );

            $isVehicule = $i >= 11;
            if ($isVehicule) {
                $asset->{$fields['Immatriculation']->db_column} = $immatriculations[$i];
                $asset->{$fields['Kilométrage']->db_column} = (string) (10000 + $i * 5230);
                // Une échéance échue pour la démo (le premier véhicule, assurance expirée).
                $asset->{$fields['Échéance assurance']->db_column} = $i === 11 ? '2026-04-15' : '2026-11-30';
                $asset->{$fields['Échéance vignette']->db_column} = '2026-12-31';
                $asset->{$fields['Chauffeur affecté']->db_column} = $chauffeurs[$i];
            } else {
                $asset->{$fields['Criticité clinique']->db_column} = $criticites[$index % count($criticites)];
                $asset->{$fields['Dernière calibration']->db_column} = '2026-01-15';
                // Une calibration en retard pour la démo (3e actif biomédical).
                $asset->{$fields['Prochaine calibration']->db_column} = $i === 3 ? '2026-06-01' : '2027-01-15';
                $asset->{$fields['Contrat de maintenance']->db_column} = $index % 2 === 0 ? 'Médical Plus Nouakchott' : '—';
            }
            $asset->save();

            $assets[$tag] = $asset;
        }

        return $assets;
    }

    /**
     * @return array<string, User>
     */
    private function seedUsers(User $admin): array
    {
        $specs = [
            ['username' => 'fmint.ahmed', 'first_name' => 'Dr Fatimetou', 'last_name' => 'Mint Ahmed'],
            ['username' => 'sould.cheikh', 'first_name' => 'Sidi', 'last_name' => 'Ould Cheikh'],
            ['username' => 'aabeidna', 'first_name' => 'Aïchetou', 'last_name' => 'Mint Abeidna'],
            ['username' => 'mvall', 'first_name' => 'Mohamed Vall', 'last_name' => 'Ould Sidi'],
        ];

        $users = [];
        foreach ($specs as $spec) {
            $users[$spec['username']] = User::firstOrCreate(
                ['username' => $spec['username']],
                [
                    'first_name' => $spec['first_name'],
                    'last_name' => $spec['last_name'],
                    'email' => $spec['username'].'@avalparc.mr',
                    'password' => Hash::make('DemoAval2026!'),
                    'activated' => 1,
                    'permissions' => '{}',
                    'created_by' => $admin->id,
                    'notes' => 'Créé par DemoSeeder Aval Parc',
                ]
            );
        }

        return $users;
    }

    /**
     * @param  array<string, Asset>  $assets
     * @param  array<string, User>  $users
     */
    private function seedCheckouts(array $assets, array $users, User $admin): void
    {
        $checkouts = [
            'AVAL-DEMO-0001' => 'fmint.ahmed',   // échographe utilisé par la cardiologue
            'AVAL-DEMO-0013' => 'sould.cheikh',  // ambulance affectée au chauffeur
            'AVAL-DEMO-0015' => 'mvall',         // minibus affecté au chauffeur
        ];

        foreach ($checkouts as $tag => $username) {
            $asset = $assets[$tag];
            if ($asset->assigned_to) {
                continue; // déjà affecté (idempotence)
            }
            $asset->checkOut($users[$username], $admin, now()->format('Y-m-d H:i:s'));
        }
    }

    /**
     * @param  array<string, Asset>  $assets
     * @param  array<string, Supplier>  $suppliers
     */
    private function seedMaintenances(array $assets, array $suppliers, User $admin): void
    {
        $etalonnage = MaintenanceType::firstOrCreate(['name' => 'Étalonnage']);
        $reparation = MaintenanceType::firstOrCreate(['name' => 'Réparation']);

        Maintenance::firstOrCreate(
            ['name' => 'Étalonnage annuel - Vivid E95 (AVAL-DEMO-0001)'],
            [
                'asset_id' => $assets['AVAL-DEMO-0001']->id,
                'supplier_id' => $suppliers['Médical Plus Nouakchott']->id,
                'maintenance_type_id' => $etalonnage->id,
                'asset_maintenance_type' => $etalonnage->name,
                'start_date' => '2026-05-01',
                'completion_date' => '2026-05-03',
                'is_warranty' => 0,
                'notes' => 'Contrôle qualité image et calibration sonde',
                'cost' => 350000,
                'created_by' => $admin->id,
            ]
        );

        Maintenance::firstOrCreate(
            ['name' => 'Réparation moteur - Hilux (AVAL-DEMO-0011)'],
            [
                'asset_id' => $assets['AVAL-DEMO-0011']->id,
                'supplier_id' => $suppliers['Toyota Mauritanie']->id,
                'maintenance_type_id' => $reparation->id,
                'asset_maintenance_type' => $reparation->name,
                'start_date' => '2026-06-20',
                'completion_date' => null,
                'is_warranty' => 0,
                'notes' => 'Panne moteur — en attente de pièces détachées',
                'cost' => 0,
                'created_by' => $admin->id,
            ]
        );
    }
}
