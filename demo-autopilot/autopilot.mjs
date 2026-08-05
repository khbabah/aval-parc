#!/usr/bin/env node
/**
 * Autopilote de démo vidéo — Aval Parc (version FORMATION)
 * --------------------------------------------------------
 * Vidéo pédagogique pour l'utilisateur final : concepts expliqués à l'écran
 * (surligneur, cartes-concept), gestes complets du quotidien, pilotage.
 *
 * Serveur JETABLE : instance neuve (php artisan serve) sur un port dédié,
 * base SQLite dans /tmp (la connexion sqlite de Snipe-IT code en dur
 * database/database.sqlite → symlink, avec garde-fou). Ne touche jamais aux
 * données ni au port de développement.
 *
 * Variables d'environnement :
 *   SPEED=0.1   test accéléré · 1 rythme vidéo · 1.3 confortable voix off
 *   HEADLESS=1  sans fenêtre · SHOTS=1 captures par acte · VIDEO=1 mp4
 *   PORT=8123 · KEEP=1 conserve la base (debug)
 */
import { chromium } from 'playwright';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const SPEED = parseFloat(process.env.SPEED || '1');
const HEADLESS = process.env.HEADLESS === '1';
const SHOTS = process.env.SHOTS === '1';
const VIDEO = process.env.VIDEO === '1';
const PORT = parseInt(process.env.PORT || '8123', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const DB = `/tmp/aval-autopilot-${PORT}.sqlite`;
const VIDEO_DIR = join(HERE, 'video-raw');
const SHOTS_DIR = join(HERE, 'shots');
const REPO_SQLITE = join(APP, 'database', 'database.sqlite');

const ADMIN = { user: 'demo', email: 'demo@avalparc.local', pass: 'Autopilot-2026' };
const ENV = {
  ...process.env,
  DB_CONNECTION: 'sqlite', DB_DATABASE: DB,
  APP_KEY: 'base64:glJpcM7BYwWiBggp3SQ/+NlRkqsBQMaGEOjemXqJzOU=',
  APP_ENV: 'local', APP_DEBUG: 'false', APP_URL: BASE,
  CACHE_STORE: 'file', SESSION_DRIVER: 'file', MAIL_MAILER: 'log',
};

// Couleurs de la marque (logo Aval : bleu profond + vert ECG)
const BLEU = '#1b4f80', VERT = '#2e9e5b';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));
const log = (...a) => console.log('[autopilot]', ...a);

/* ---------------------------------------------------------------- serveur */
function php(args, label) {
  const r = spawnSync('php', args, { cwd: APP, env: ENV, stdio: 'pipe' });
  if (r.status !== 0) {
    console.error(r.stdout?.toString(), r.stderr?.toString());
    throw new Error(`échec: ${label}`);
  }
}

/** `artisan serve` délègue à un enfant `php -S` que .kill() ne tue pas :
 *  on purge tout processus écoutant sur le port (avant ET après). */
function killPort() {
  try {
    const pids = execFileSync('lsof', ['-ti', `:${PORT}`]).toString().trim();
    if (pids) { spawnSync('kill', pids.split('\n')); log(`port ${PORT} purgé`); }
  } catch { /* personne sur le port */ }
}

async function bootServer() {
  killPort();
  log(`base jetable: ${DB}`);
  rmSync(DB, { force: true });
  execFileSync('touch', [DB]);
  // La connexion sqlite de Snipe-IT code en dur database/database.sqlite et
  // ignore DB_DATABASE : on pointe ce chemin vers /tmp par symlink.
  // Garde-fou : ne JAMAIS écraser un vrai fichier qu'on n'a pas créé.
  if (existsSync(REPO_SQLITE) && !lstatSync(REPO_SQLITE).isSymbolicLink()) {
    throw new Error(`${REPO_SQLITE} existe et n'est pas un symlink de l'autopilote — abandon par sécurité.`);
  }
  rmSync(REPO_SQLITE, { force: true });
  symlinkSync(DB, REPO_SQLITE);
  log('installation (migrations + admin + config santé)…');
  php(['artisan', 'aval:install', `--admin-username=${ADMIN.user}`,
    `--admin-email=${ADMIN.email}`, `--admin-password=${ADMIN.pass}`], 'aval:install');
  log('données de démonstration…');
  php(['artisan', 'db:seed', '--class=Database\\Seeders\\Aval\\DemoSeeder', '--force'], 'DemoSeeder');
  // Expérience « instance hôpital » : modules IT masqués comme chez les clients
  php(['artisan', 'tinker', '--execute',
    '$s = \\App\\Models\\Setting::first();'
    + '$s->custom_css = \'li:has(> a[href*="/licenses"]),div[class*=col-]:has(> a[href*="/licenses"]),'
    + 'li:has(> a[href*="/companies"]),li:has(> a[href*="/depreciations"]){display:none!important}\';'
    + '$s->save(); echo "css instance ok";'], 'custom_css démo');

  const server = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', `--port=${PORT}`],
    { cwd: APP, env: ENV, stdio: 'ignore' });
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${BASE}/login`);
      if (res.ok) { log(`serveur prêt sur ${BASE}`); return server; }
    } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error('le serveur jetable ne répond pas');
}

/* ------------------------------------------------- sous-titres & diapos */
async function ensureOverlay(page) {
  await page.evaluate(({ BLEU, VERT }) => {
    if (document.getElementById('ap-caption')) return;
    const css = document.createElement('style');
    css.id = 'ap-style';
    css.textContent = `
      #ap-caption{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);
        max-width:76%;padding:14px 26px;border-radius:10px;z-index:2147483646;
        background:linear-gradient(135deg,${BLEU}ee,${BLEU}cc);color:#fff;
        font:600 22px/1.4 'Segoe UI',Roboto,Arial,sans-serif;text-align:center;
        letter-spacing:.2px;box-shadow:0 6px 24px rgba(0,0,0,.35);
        border-left:5px solid ${VERT};pointer-events:none;opacity:0;
        transition:opacity .25s ease}
      #ap-badge{position:fixed;top:14px;right:14px;z-index:2147483646;
        padding:6px 14px;border-radius:999px;background:${VERT};color:#fff;
        font:700 13px/1 'Segoe UI',Roboto,Arial,sans-serif;pointer-events:none;
        box-shadow:0 2px 10px rgba(0,0,0,.3);text-transform:uppercase;
        letter-spacing:.8px}
      .ap-focus{outline:4px solid ${VERT}!important;outline-offset:3px;
        border-radius:6px;box-shadow:0 0 0 6px ${VERT}33!important}`;
    document.head.appendChild(css);
    const cap = document.createElement('div'); cap.id = 'ap-caption';
    const badge = document.createElement('div'); badge.id = 'ap-badge';
    badge.textContent = window.__apAct || '';
    document.body.appendChild(cap); document.body.appendChild(badge);
  }, { BLEU, VERT });
}

async function setAct(page, label) {
  await ensureOverlay(page);
  await page.evaluate((l) => {
    window.__apAct = l;
    const b = document.getElementById('ap-badge');
    if (b) b.textContent = l;
  }, label);
}

/** Sous-titre : durée par défaut proportionnelle à la longueur du texte. */
async function say(page, texte, holdMs = null) {
  await ensureOverlay(page);
  await page.evaluate((t) => {
    const c = document.getElementById('ap-caption');
    c.textContent = t; c.style.opacity = '1';
  }, texte);
  await sleep(holdMs ?? Math.max(2400, texte.length * 52));
}

async function hush(page) {
  await page.evaluate(() => {
    const c = document.getElementById('ap-caption');
    if (c) c.style.opacity = '0';
  }).catch(() => {});
}

/** Surligne l'élément dont on parle (halo vert), le temps du sous-titre. */
async function focus(page, selector, texte = null, holdMs = null) {
  const el = page.locator(selector).first();
  let marked = false;
  try {
    await el.scrollIntoViewIfNeeded({ timeout: 4000 });
    await el.evaluate((n) => n.classList.add('ap-focus'));
    marked = true;
  } catch { /* introuvable : le sous-titre reste utile seul */ }
  if (texte) await say(page, texte, holdMs);
  else await sleep(holdMs ?? 1600);
  if (marked) await el.evaluate((n) => n.classList.remove('ap-focus')).catch(() => {});
}

/** Carte-concept : l'écran reste visible derrière, la notion s'affiche par-dessus. */
async function concept(page, titre, lignes, holdMs = null) {
  await page.evaluate(({ titre, lignes, BLEU, VERT }) => {
    const d = document.createElement('div'); d.id = 'ap-concept';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483645;display:flex;'
      + 'align-items:center;justify-content:center;background:rgba(10,25,45,.72)';
    d.innerHTML = `<div style="max-width:900px;background:#fff;border-radius:16px;
        padding:42px 54px;box-shadow:0 20px 80px rgba(0,0,0,.5);
        border-top:8px solid ${VERT};font-family:'Segoe UI',Roboto,Arial,sans-serif">
      <div style="font-size:34px;font-weight:800;color:${BLEU};margin-bottom:18px">${titre}</div>
      ${lignes.map((l) => `<div style="font-size:23px;line-height:1.55;color:#223;
        margin:10px 0">${l}</div>`).join('')}</div>`;
    document.body.appendChild(d);
  }, { titre, lignes, BLEU, VERT });
  await sleep(holdMs ?? Math.max(4200, lignes.join('').length * 46));
  await page.evaluate(() => document.getElementById('ap-concept')?.remove());
}

/** Diapositive plein écran (chapitres, étapes non filmables, conclusion). */
async function slide(page, { titre, lignes = [], code = null, holdMs = 4200 }) {
  await page.evaluate(({ titre, lignes, code, BLEU, VERT }) => {
    const d = document.createElement('div'); d.id = 'ap-slide';
    d.style.cssText = `position:fixed;inset:0;z-index:2147483645;display:flex;
      flex-direction:column;align-items:center;justify-content:center;gap:26px;
      background:linear-gradient(135deg,${BLEU} 0%,#0e3157 55%,${VERT} 140%);
      color:#fff;font-family:'Segoe UI',Roboto,Arial,sans-serif;text-align:center`;
    d.innerHTML = `
      <div style="font-size:50px;font-weight:800;letter-spacing:.5px;max-width:82%">${titre}</div>
      ${lignes.map((l) => `<div style="font-size:27px;opacity:.92;max-width:74%">${l}</div>`).join('')}
      ${code ? `<pre style="background:rgba(0,0,0,.45);border-left:5px solid ${VERT};
        padding:22px 34px;border-radius:10px;font-size:22px;text-align:left;
        line-height:1.7;font-family:Menlo,Consolas,monospace">${code}</pre>` : ''}`;
    document.body.appendChild(d);
  }, { titre, lignes, code, BLEU, VERT });
  await sleep(holdMs);
  await page.evaluate(() => document.getElementById('ap-slide')?.remove());
}

const chapitre = (page, n, titre) =>
  slide(page, { titre: `Partie ${n}`, lignes: [titre], holdMs: 3000 });

/* ------------------------------------------------------ gestes humains */
async function type(page, selector, texte) {
  const el = page.locator(selector);
  await el.click();
  await el.pressSequentially(texte, { delay: 85 * SPEED });
}

/** Champ à réécrire : clic + tout sélectionner + retape. */
async function retype(page, selector, texte) {
  const el = page.locator(selector);
  await el.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
  await el.pressSequentially(texte, { delay: 70 * SPEED });
}

/** Select2 (AJAX ou statique) : ouvre, tape, choisit la 1re option chargée. */
async function select2(page, opener, recherche) {
  await page.locator(opener).first().click();
  const search = page.locator('.select2-container--open input.select2-search__field').last();
  await search.pressSequentially(recherche, { delay: 85 * SPEED });
  const option = page
    .locator('.select2-container--open .select2-results__option:not(.loading-results):not(.select2-results__message)')
    .first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  await sleep(500);
  await option.click();
}

/** Le conteneur select2 d'un <select id=…> est rendu juste après lui. */
const s2 = (selectId) => `select#${selectId} + .select2 .select2-selection`;

async function shot(page, nom) {
  if (!SHOTS) return;
  mkdirSync(SHOTS_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOTS_DIR, `${nom}.png`) });
}

async function gotoStable(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
}

/* ================================================================ ACTES */
/* ---------- PARTIE 1 — COMPRENDRE ---------- */

async function acte01_ouverture(page) {
  await setAct(page, 'Aval Parc');
  await gotoStable(page, `${BASE}/login`);
  await slide(page, {
    titre: 'Aval Parc — prise en main',
    lignes: ['La gestion du patrimoine de votre établissement de santé',
      'Cette vidéo vous apprend les concepts et les gestes du quotidien, pas à pas.'],
    holdMs: 5000,
  });
}

async function acte02_connexion(page) {
  await setAct(page, 'Connexion');
  await say(page, 'Chaque agent a son propre compte : tout ce que vous ferez sera daté et signé à votre nom.');
  await type(page, '#username', ADMIN.user);
  await type(page, '#password-field', ADMIN.pass);
  await sleep(500);
  await hush(page);
  await Promise.all([page.waitForURL('**/'), page.locator('#submit').click()]);
  await page.waitForLoadState('networkidle').catch(() => {});
  await shot(page, '02-connexion');
}

async function acte03_tableau_de_bord(page) {
  await setAct(page, 'Tableau de bord');
  await ensureOverlay(page);
  await say(page, 'Le tableau de bord : l’état de tout le patrimoine, en un coup d’œil.');
  await focus(page, '.small-box',
    'Chaque tuile compte une famille : le patrimoine, les accessoires, les consommables, les pièces détachées, le personnel.');
  await focus(page, 'canvas',
    'Le graphique « Matériels par statut » : ce qui est en service, en panne, en maintenance — la vue de la Direction.');
  await page.mouse.wheel(0, 350); await sleep(1100);
  await say(page, 'Et l’activité récente : qui a fait quoi, quand. Rien ne se perd.');
  await page.mouse.wheel(0, -350); await sleep(500);
  await hush(page);
  await shot(page, '03-dashboard');
}

async function acte04_fiche_expliquee(page) {
  await setAct(page, 'La fiche d’un bien');
  await say(page, 'Le cœur du système : la fiche du bien. Cherchons un électrocardiographe par son étiquette.');
  await type(page, '#tagSearch', 'AVAL-DEMO-0002');
  await hush(page);
  await Promise.all([page.waitForLoadState('domcontentloaded'), page.locator('#topSearchButton').click()]);
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await concept(page, 'Modèle ≠ Bien', [
    '<b>Le modèle</b> est la fiche technique commune — « ECG MAC 2000 ».',
    '<b>Le bien</b> est l’exemplaire physique, avec sa propre étiquette AVAL-DEMO-0002.',
    'Dix ECG identiques = un seul modèle, dix biens étiquetés.',
  ]);
  await concept(page, 'Statut ≠ État général', [
    '<b>Le statut</b> dit où en est le bien dans sa vie : En service, En panne, En maintenance, Réformé.',
    '<b>L’état général</b> dit dans quel état physique il est : Neuf, Bon, Moyen, Mauvais.',
    'Un bien peut être En service ET en état Moyen — ce sont deux axes différents.',
  ]);
  await focus(page, 'dt:has-text("Emplacement")',
    'L’emplacement de rattachement : le « domicile » du bien. Même prêté ailleurs, on sait où il doit revenir.');
  await say(page, 'Les onglets racontent toute la vie du bien :');
  await focus(page, 'a[href="#maintenances"]', 'Maintenances — son carnet de santé.');
  await focus(page, 'a[href="#audits"]', 'Audits — ses pointages d’inventaire.');
  await focus(page, 'a[href="#history"]', 'Historique — chaque action, datée et signée.');
  await page.mouse.wheel(0, 550); await sleep(1000);
  await say(page, 'Et en bas de fiche, son QR code : scanné au smartphone, il ouvre directement cette page.');
  await page.mouse.wheel(0, -550); await sleep(400);
  await hush(page);
  await shot(page, '04-fiche');
}

async function acte05_affectation_concepts(page) {
  await setAct(page, 'À qui ? Où ?');
  await concept(page, 'Un bien est affecté à UNE cible — ou à personne', [
    '<b>À un agent</b> : responsabilité nominative — le véhicule du chauffeur.',
    '<b>À un emplacement</b> : le bien appartient à la salle — le scialytique du bloc.',
    '<b>À un autre bien</b> : le moniteur embarqué dans l’ambulance.',
    'Non affecté = <b>Disponible</b>, rangé à son emplacement de rattachement.',
  ]);
  await gotoStable(page, `${BASE}/hardware/13`);
  await say(page, 'Exemple réel : l’ambulance de la clinique. Ouvrons la liste de ses biens embarqués.');
  const tabAssets = page.locator('a[href="#assets"]').first();
  if (await tabAssets.count()) {
    await tabAssets.click(); await sleep(1800);
    await say(page, 'Le moniteur de transport est rattaché à l’ambulance : si elle change de chauffeur, il la suit.');
  }
  await hush(page);
  await shot(page, '05-concepts');
}

/* ---------- PARTIE 2 — LES GESTES DU QUOTIDIEN ---------- */

async function acte06_chapitre2(page) {
  await chapitre(page, 2, 'Les gestes du quotidien');
}

async function acte07_creer_un_bien(page) {
  await setAct(page, 'Créer un bien');
  await say(page, 'Un nouvel équipement arrive : créons sa fiche. Menu Patrimoine → Créer.');
  await gotoStable(page, `${BASE}/hardware/create`);
  await focus(page, 'select#model_select_id + .select2',
    'D’abord son modèle : s’il existe déjà au catalogue, tout se remplit — marque, catégorie, champs métier.');
  await select2(page, s2('model_select_id'), 'MAC 2000');
  await sleep(900);
  await focus(page, '#asset_tag',
    'L’étiquette est proposée automatiquement — chaque bien reçoit la sienne, unique.');
  const tag = page.locator('#asset_tag');
  if (!(await tag.inputValue().catch(() => ''))) await type(page, '#asset_tag', 'AVAL-DEMO-0017');
  await select2(page, s2('status_select_id'), 'En service');
  await sleep(500);
  // Le n° de commande vit dans la section repliée « détails optionnels »
  await page.locator('#optional_info').click().catch(() => {});
  await sleep(800);
  const orderField = page.locator('input[name="order_number"]:visible');
  if (await orderField.count()) {
    await focus(page, 'input[name="order_number"]',
      'Le numéro de marché ou de bon de commande : le bien reste rattaché à son marché d’acquisition.');
    await retype(page, 'input[name="order_number"]', 'MP-2026-014');
  }
  await sleep(500);
  await hush(page);
  await page.locator('#submit, button[type=submit]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'La fiche est créée : le bien existe, étiquetable et traçable. Trente secondes.');
  await hush(page);
  await shot(page, '07-creation');
}

async function acte08_panne(page) {
  await setAct(page, 'Déclarer une panne');
  await say(page, 'Un appareil tombe en panne. Premier réflexe : changer son statut, tout de suite.');
  await gotoStable(page, `${BASE}/hardware/6/edit`);
  await focus(page, 'select#status_select_id + .select2',
    'Sur sa fiche, bouton Modifier → champ Statut.');
  await select2(page, s2('status_select_id'), 'En panne');
  await sleep(600);
  await hush(page);
  await page.locator('#submit, button[type=submit]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'Le bien est « En panne », donc Indisponible : le système refusera de l’affecter à qui que ce soit. C’est le garde-fou.');
  await hush(page);
  await shot(page, '08-panne');
}

async function acte09_maintenance(page) {
  await setAct(page, 'La réparation');
  await say(page, 'Deuxième réflexe : ouvrir sa fiche de réparation dans le carnet de maintenance.');
  await gotoStable(page, `${BASE}/maintenances`);
  await say(page, 'Ici, toutes les maintenances de l’établissement — en cours et terminées, avec leurs coûts.');
  const enCours = page.locator('table a', { hasText: /Réparation moteur/i }).first();
  await enCours.waitFor({ state: 'visible', timeout: 15000 });
  const mUrl = await enCours.getAttribute('href');
  await hush(page);
  await gotoStable(page, mUrl.replace(/\/?$/, '') + '/edit');
  await say(page, 'Celle du pick-up est ouverte depuis dix jours. La pièce est arrivée : clôturons-la.');
  await focus(page, 'input[name="completion_date"]', 'La date de fin…');
  await retype(page, 'input[name="completion_date"]', new Date().toISOString().slice(0, 10));
  await page.keyboard.press('Escape');
  await focus(page, 'input[name="cost"]', '…et le coût : pièce et main-d’œuvre.');
  await retype(page, 'input[name="cost"]', '45000');
  await sleep(500);
  await hush(page);
  await page.locator('button[type=submit]', { hasText: /Sauveg|Enregistrer|Save/i }).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'Le coût s’ajoute au coût total de possession du véhicule : « réparer ou remplacer ? » se chiffre tout seul.');
  await say(page, 'Dernier geste : repasser le bien « En service » sur sa fiche — il redevient affectable.');
  await hush(page);
  await shot(page, '09-maintenance');
}

async function acte10_affecter_rendre(page) {
  await setAct(page, 'Affecter / Rendre');
  await say(page, 'Le geste le plus fréquent : affecter un bien. C’est le bon de mouvement, en numérique.');
  await gotoStable(page, `${BASE}/hardware/5`);
  await sleep(900);
  await gotoStable(page, `${BASE}/hardware/5/checkout`);
  await focus(page, 'input[name="checkout_to_type"]',
    'Trois cibles possibles : un agent, un emplacement, ou un autre bien.');
  await say(page, 'Affectons ce moniteur au médecin de garde.');
  await select2(page, '#assigned_user .select2-selection', 'Fatimetou');
  await sleep(600);
  await hush(page);
  await page.locator('button[type=submit]', { hasText: /Affecter|Associer|Valider|Checkout/i }).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'Affecté : daté, signé, réversible. Fini les « qui a pris l’appareil ? »');
  await gotoStable(page, `${BASE}/hardware/5`);
  const histTab = page.locator('a[href="#history"]').first();
  if (await histTab.count()) {
    await focus(page, 'a[href="#history"]', 'La preuve, dans l’Historique :');
    await histTab.click(); await sleep(2000);
    await say(page, 'l’affectation y est déjà inscrite — avec l’auteur, la date et le destinataire.');
  }
  await say(page, 'Au retour, le bouton « Rendre » fait le chemin inverse : le bien redevient Disponible, à son emplacement de rattachement.');
  await hush(page);
  await shot(page, '10-affectation');
}

async function acte11_stocks(page) {
  await setAct(page, 'Consommables & accessoires');
  await say(page, 'Trois familles complètent le patrimoine. D’abord les consommables : ce qui s’épuise.');
  await gotoStable(page, `${BASE}/consumables`);
  await say(page, 'Gel d’échographie, électrodes, papier ECG : chaque sortie décrémente le stock, et un seuil d’alerte peut prévenir par email.');
  await gotoStable(page, `${BASE}/accessories`);
  await say(page, 'Les accessoires : sondes, capteurs, brassards — prêtables à un agent et restituables, contrairement aux consommables.');
  await gotoStable(page, `${BASE}/components`);
  await say(page, 'Et les pièces détachées : batteries, cellules d’oxygène — les pièces qui vivent à l’intérieur des équipements.');
  await hush(page);
  await shot(page, '11-stocks');
}

/* ---------- PARTIE 3 — INVENTAIRE & PILOTAGE ---------- */

async function acte12_chapitre3(page) {
  await chapitre(page, 3, 'L’inventaire et le pilotage');
}

async function acte13_etiquettes(page) {
  await setAct(page, 'Étiquettes');
  await say(page, 'Tout commence par l’étiquetage. Imprimons l’étiquette d’un bien.');
  await gotoStable(page, `${BASE}/hardware/2`);
  await page.evaluate(() => document.getElementById('bulkForm')?.removeAttribute('target'));
  await hush(page);
  await page.locator('#bulkForm button#bulkEdit').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'La planche s’imprime sur autocollants : nom, étiquette, QR pour smartphone, code-barres pour douchette.');
  await hush(page);
  await shot(page, '13-etiquettes');
  await page.goBack().catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function acte14_pointage(page) {
  await setAct(page, 'Pointage d’inventaire');
  await concept(page, 'L’inventaire annuel change de nature', [
    'Avant : des semaines de recomptage manuel, salle par salle.',
    'Maintenant : on <b>scanne</b> chaque étiquette — le pointage est daté et signé.',
    'Ce qui n’a pas été scanné = <b>l’écart</b>, listé automatiquement.',
  ]);
  await say(page, 'Pointons un bien : sur sa fiche, bouton Audit.');
  await gotoStable(page, `${BASE}/hardware/3/audit`);
  await focus(page, 'select#location_id + .select2, #location_id',
    'On confirme la salle où l’on se trouve — si le bien a déménagé, sa fiche sera corrigée.');
  await focus(page, 'textarea[name="note"]', 'Une remarque si besoin : « vitre fêlée », « à réformer »…');
  await type(page, 'textarea[name="note"]', 'Présence confirmée — état conforme.');
  await sleep(400);
  await hush(page);
  await page.locator('#submit_button, button[type=submit]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'Pointé. La prochaine échéance se calcule toute seule, selon l’intervalle réglé dans Paramètres → Alertes.');
  await gotoStable(page, `${BASE}/hardware/bulkaudit`);
  await say(page, 'Pour une salle entière : l’audit groupé au scanner — on bipe chaque étiquette à la douchette, quinze secondes par bien.');
  await gotoStable(page, `${BASE}/hardware/audit/due`);
  await say(page, 'Et « Dû pour l’audit » : tout ce qui n’a pas encore été pointé. Votre liste de travail — l’écart de fin de campagne.');
  await hush(page);
  await shot(page, '14-pointage');
}

async function acte15_rapports(page) {
  await setAct(page, 'Rapports');
  await say(page, 'Pour la Direction et le Ministère : les rapports.');
  await gotoStable(page, `${BASE}/reports/custom`);
  await say(page, 'Le rapport personnalisé : cochez les colonnes voulues — étiquette, marque, origine, emplacement, statut, état…');
  for (const label of ['Marque', 'Emplacement']) {
    const cb = page.locator(`label:has-text("${label}") input[type=checkbox]`).first();
    if (await cb.count()) await cb.check().catch(() => {});
    await sleep(400);
  }
  await say(page, '…et l’état du patrimoine sort en Excel, à jour du jour même. L’état annuel réglementaire, en deux minutes.');
  await gotoStable(page, `${BASE}/reports/activity`);
  await say(page, 'Le rapport d’activité : qui a fait quoi, quand — l’imputabilité complète de l’établissement.');
  await hush(page);
  await shot(page, '15-rapports');
}

async function acte16_profils_et_fin(page) {
  await setAct(page, 'Profils & conclusion');
  await concept(page, 'Chacun son périmètre', [
    '<b>Consultation</b> : tout voir, ne rien modifier — zéro risque d’erreur.',
    '<b>Gestionnaire cantonné</b> : un seul module — par exemple les consommables.',
    '<b>Gestionnaire du patrimoine</b> : les biens et leurs mouvements.',
    '<b>Superadmin</b> : le paramétrage de l’établissement.',
  ]);
  await slide(page, {
    titre: 'Chez vous, dans vos murs',
    lignes: ['Fonctionne sans internet — serveur local à l’établissement',
      'Sauvegardes automatiques chaque nuit · vos données restent chez vous',
      'Import de votre inventaire Excel : une journée · formation : une matinée'],
    code: './install.sh admin admin@votre-hopital.mr',
    holdMs: 6000,
  });
  await slide(page, {
    titre: 'Aval Parc',
    lignes: ['Votre patrimoine, en direct.',
      'Démonstration en ligne : avalparc.bsimr.com',
      'BSIMR — Nouakchott · khbabah@yahoo.fr'],
    holdMs: 5600,
  });
}

/* ------------------------------------------------------------- main */
const ACTES = [
  acte01_ouverture, acte02_connexion, acte03_tableau_de_bord,
  acte04_fiche_expliquee, acte05_affectation_concepts,
  acte06_chapitre2, acte07_creer_un_bien, acte08_panne, acte09_maintenance,
  acte10_affecter_rendre, acte11_stocks,
  acte12_chapitre3, acte13_etiquettes, acte14_pointage, acte15_rapports,
  acte16_profils_et_fin,
];

let server;
try {
  server = await bootServer();
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'fr-FR',
    ...(VIDEO ? { recordVideo: { dir: VIDEO_DIR, size: { width: 1920, height: 1080 } } } : {}),
  });
  if (VIDEO) {
    // window.open → surimpression <embed> (un onglet séparé serait invisible en vidéo)
    await context.addInitScript(() => {
      window.open = (url) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:4%;z-index:2147483644;background:#fff;'
          + 'border-radius:12px;box-shadow:0 10px 60px rgba(0,0,0,.5);overflow:hidden';
        wrap.innerHTML = `<embed src="${url}" style="width:100%;height:100%">`;
        document.body.appendChild(wrap);
        setTimeout(() => wrap.remove(), 6000);
        return null;
      };
    });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  for (const acte of ACTES) {
    log(`▶ ${acte.name}`);
    try {
      await acte(page);
    } catch (err) {
      mkdirSync(SHOTS_DIR, { recursive: true });
      const crash = join(SHOTS_DIR, `ERREUR-${acte.name}.png`);
      await page.screenshot({ path: crash }).catch(() => {});
      console.error(`✗ échec dans ${acte.name} — capture: ${crash}`);
      console.error('URL au moment de l’échec:', page.url());
      throw err;
    }
  }

  // Fermer le contexte AVANT de récupérer la vidéo
  const videoHandle = VIDEO ? page.video() : null;
  await context.close();
  await browser.close();

  if (videoHandle) {
    const webm = await videoHandle.path();
    const mp4 = join(HERE, 'aval-parc-demo.mp4');
    try {
      execFileSync('ffmpeg', ['-y', '-i', webm, '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p', '-r', '30', mp4], { stdio: 'pipe' });
      log(`vidéo : ${mp4}`);
    } catch {
      log(`ffmpeg indisponible — vidéo webm conservée : ${webm}`);
    }
  }
  log('démo terminée ✔');
} finally {
  server?.kill();
  killPort();
  try { if (lstatSync(REPO_SQLITE).isSymbolicLink()) rmSync(REPO_SQLITE, { force: true }); } catch { /* absent */ }
  if (process.env.KEEP !== '1') rmSync(DB, { force: true });
}
