<?php

namespace Tests\Feature\Aval;

use App\Providers\AvalServiceProvider;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

/**
 * Vérifie que App\Providers\AvalServiceProvider applique correctement les
 * surcharges de app/Aval/lang/overrides-fr.php par-dessus le pack fr-FR
 * upstream, sans jamais toucher resources/lang/**.
 */
class AvalLangOverridesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        App::setLocale('fr-FR');
    }

    public function test_no_value_is_overridden_in_french()
    {
        $this->assertEquals('Non renseigné', trans('general.no_value'));
    }

    public function test_footer_credit_is_debranded()
    {
        $footer = trans('general.footer_credit');

        $this->assertStringContainsString('Aval Parc', $footer);
        $this->assertStringNotContainsString('Grokability', $footer);
        $this->assertStringNotContainsString('Snipe-IT', $footer);
    }

    public function test_namespaced_key_is_overridden()
    {
        $this->assertEquals('Retour groupé', trans('admin/hardware/general.bulk_checkin'));
    }

    public function test_overriding_one_key_does_not_wipe_the_rest_of_the_group()
    {
        // 'audits' n'est PAS surchargé : si le groupe entier était écrasé par
        // Translator::load() après addLines(), cette clé disparaîtrait et
        // trans() renverrait la clé brute au lieu de la traduction upstream.
        $this->assertNotEquals('general.audits', trans('general.audits'));
        $this->assertNotEmpty(trans('general.audits'));

        // Idem pour le groupe namespacé admin/hardware/general : seule
        // 'bulk_checkin' est surchargée, 'deployable' doit rester la
        // traduction fr-FR upstream ("Déployable").
        $this->assertEquals('Déployable', trans('admin/hardware/general.deployable'));
    }

    public function test_missing_overrides_file_is_a_silent_noop()
    {
        $provider = new AvalServiceProvider($this->app);

        $reflection = new \ReflectionProperty($provider, 'overridesPath');
        $reflection->setAccessible(true);
        $reflection->setValue($provider, 'Aval/lang/does-not-exist.php');

        // Ne doit lancer aucune exception, même si le fichier est absent.
        $provider->boot();

        $this->assertTrue(true);
    }
}
