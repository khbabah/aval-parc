<?php

namespace Tests\Feature\Aval;

use App\Models\Setting;
use Database\Seeders\Aval\AvalBrandingSeeder;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvalBrandingSeederTest extends TestCase
{
    public function test_seeder_creates_settings_row_when_none_exists()
    {
        Storage::fake('local_public');
        Setting::query()->delete();

        $this->seed(AvalBrandingSeeder::class);

        $settings = Setting::first();
        $this->assertNotNull($settings);
        $this->assertEquals('Aval Parc', $settings->site_name);
        $this->assertEquals('fr-FR', $settings->locale);
        $this->assertEquals('MRU', $settings->default_currency);
        $this->assertStringContainsString('/source.tar.gz', $settings->footer_text);
        $this->assertStringContainsString('Aval Parc', $settings->footer_text);
        $this->assertStringNotContainsString('Grokability', $settings->footer_text);
        $this->assertStringNotContainsString('snipeitapp.com', $settings->footer_text);
        $this->assertEquals('d/m/Y', $settings->date_display_format);
        $this->assertEquals('H:i', $settings->time_display_format);
    }

    public function test_seeder_hides_upstream_footer_social_links_via_custom_css()
    {
        Storage::fake('local_public');
        Setting::query()->delete();

        $this->seed(AvalBrandingSeeder::class);

        $css = Setting::first()->custom_css;
        $this->assertStringContainsString('#login-logo{max-width:260px}', $css);
        $this->assertStringContainsString('snipeitapp', $css);
        $this->assertStringContainsString('grokability', $css);
        $this->assertStringContainsString('discord', $css);
        $this->assertStringContainsString('bsky.app', $css);
        $this->assertStringContainsString('github.com', $css);
        $this->assertStringContainsString('display:none', $css);
    }

    public function test_seeder_installs_official_logo_and_favicon()
    {
        Storage::fake('local_public');
        Setting::query()->delete();

        $this->seed(AvalBrandingSeeder::class);

        $settings = Setting::first();
        $this->assertEquals('aval-logo.png', $settings->logo);
        $this->assertEquals('aval-favicon.png', $settings->favicon);
        $this->assertEquals(3, $settings->brand);
        $this->assertTrue(Storage::disk('local_public')->exists('aval-logo.png'));
        $this->assertTrue(Storage::disk('local_public')->exists('aval-favicon.png'));
    }

    public function test_seeder_updates_existing_settings_without_duplicating()
    {
        Storage::fake('local_public');
        Setting::query()->delete();
        Setting::factory()->create(['site_name' => 'Snipe-IT Demo']);

        $this->seed(AvalBrandingSeeder::class);
        $this->seed(AvalBrandingSeeder::class); // idempotence

        $this->assertEquals(1, Setting::count());
        $this->assertEquals('Aval Parc', Setting::first()->site_name);
    }
}
