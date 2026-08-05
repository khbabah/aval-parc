#!/usr/bin/env node
/**
 * Autopilote de démo vidéo — Aval Parc
 * ------------------------------------
 * Pilote l'application dans un vrai navigateur comme un humain (frappe lente,
 * pauses calibrées), s'enregistre en vidéo 1080p avec sous-titres intégrés.
 *
 * Serveur JETABLE : instance neuve (php artisan serve) sur un port dédié,
 * base SQLite dans /tmp recréée à chaque exécution — ne touche jamais aux
 * données ni au port de développement.
 *
 * Variables d'environnement :
 *   SPEED=0.1   test accéléré · 1 rythme vidéo · 1.5 confortable voix off
 *   HEADLESS=1  sans fenêtre
 *   SHOTS=1     un screenshot par acte dans shots/
 *   VIDEO=1     enregistre la vidéo (webm → mp4 via ffmpeg)
 *   PORT=8123   port du serveur jetable
 *   KEEP=1      conserve la base /tmp à la fin (debug)
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

const REPO_SQLITE = join(APP, 'database', 'database.sqlite');

async function bootServer() {
  killPort();
  log(`base jetable: ${DB}`);
  rmSync(DB, { force: true });
  execFileSync('touch', [DB]);
  // La connexion sqlite de Snipe-IT code en dur database/database.sqlite et
  // ignore DB_DATABASE : on pointe ce chemin vers la base /tmp par symlink.
  // Garde-fou : ne JAMAIS écraser un vrai fichier qu'on n'a pas créé.
  if (existsSync(REPO_SQLITE) && !lstatSync(REPO_SQLITE).isSymbolicLink()) {
    throw new Error(`${REPO_SQLITE} existe et n'est pas un symlink de l'autopilote — abandon par sécurité (supprimez-le manuellement s'il ne contient rien d'important).`);
  }
  rmSync(REPO_SQLITE, { force: true });
  symlinkSync(DB, REPO_SQLITE);
  log('installation (migrations + admin + config santé)…');
  php(['artisan', 'aval:install', `--admin-username=${ADMIN.user}`,
    `--admin-email=${ADMIN.email}`, `--admin-password=${ADMIN.pass}`], 'aval:install');
  log('données de démonstration…');
  php(['artisan', 'db:seed', '--class=Database\\Seeders\\Aval\\DemoSeeder', '--force'], 'DemoSeeder');

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
        max-width:72%;padding:14px 26px;border-radius:10px;z-index:2147483646;
        background:linear-gradient(135deg,${BLEU}ee,${BLEU}cc);color:#fff;
        font:600 22px/1.35 'Segoe UI',Roboto,Arial,sans-serif;text-align:center;
        letter-spacing:.2px;box-shadow:0 6px 24px rgba(0,0,0,.35);
        border-left:5px solid ${VERT};pointer-events:none;opacity:0;
        transition:opacity .25s ease}
      #ap-badge{position:fixed;top:14px;right:14px;z-index:2147483646;
        padding:6px 14px;border-radius:999px;background:${VERT};color:#fff;
        font:700 13px/1 'Segoe UI',Roboto,Arial,sans-serif;pointer-events:none;
        box-shadow:0 2px 10px rgba(0,0,0,.3);text-transform:uppercase;
        letter-spacing:.8px}`;
    document.head.appendChild(css);
    const cap = document.createElement('div'); cap.id = 'ap-caption';
    const badge = document.createElement('div'); badge.id = 'ap-badge';
    badge.textContent = window.__apAct || '';
    document.body.appendChild(cap); document.body.appendChild(badge);
  }, { BLEU, VERT });
}

async function setAct(page, label) {
  await page.addInitScript((l) => { window.__apAct = l; }, label);
  await ensureOverlay(page);
  await page.evaluate((l) => {
    window.__apAct = l;
    const b = document.getElementById('ap-badge');
    if (b) b.textContent = l;
  }, label);
}

async function say(page, texte, holdMs = 2600) {
  await ensureOverlay(page);
  await page.evaluate((t) => {
    const c = document.getElementById('ap-caption');
    c.textContent = t; c.style.opacity = '1';
  }, texte);
  await sleep(holdMs);
}

async function hush(page) {
  await page.evaluate(() => {
    const c = document.getElementById('ap-caption');
    if (c) c.style.opacity = '0';
  }).catch(() => {});
}

/** Diapositive pédagogique plein écran (étapes non filmables). */
async function slide(page, { titre, lignes = [], code = null, holdMs = 5200 }) {
  await page.evaluate(({ titre, lignes, code, BLEU, VERT }) => {
    const d = document.createElement('div'); d.id = 'ap-slide';
    d.style.cssText = `position:fixed;inset:0;z-index:2147483645;display:flex;
      flex-direction:column;align-items:center;justify-content:center;gap:26px;
      background:linear-gradient(135deg,${BLEU} 0%,#0e3157 55%,${VERT} 140%);
      color:#fff;font-family:'Segoe UI',Roboto,Arial,sans-serif;text-align:center`;
    d.innerHTML = `
      <div style="font-size:52px;font-weight:800;letter-spacing:.5px;max-width:80%">${titre}</div>
      ${lignes.map((l) => `<div style="font-size:27px;opacity:.92;max-width:72%">${l}</div>`).join('')}
      ${code ? `<pre style="background:rgba(0,0,0,.45);border-left:5px solid ${VERT};
        padding:22px 34px;border-radius:10px;font-size:22px;text-align:left;
        line-height:1.7;font-family:Menlo,Consolas,monospace">${code}</pre>` : ''}`;
    document.body.appendChild(d);
  }, { titre, lignes, code, BLEU, VERT });
  await sleep(holdMs);
  await page.evaluate(() => document.getElementById('ap-slide')?.remove());
}

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

/** Select2 AJAX de Snipe-IT : ouvre, tape, choisit la 1re option chargée. */
async function select2(page, containerSel, recherche) {
  await page.locator(`${containerSel} .select2-selection`).click();
  const search = page.locator('.select2-container--open input.select2-search__field').last();
  await search.pressSequentially(recherche, { delay: 85 * SPEED });
  const option = page
    .locator('.select2-container--open .select2-results__option:not(.loading-results):not(.select2-results__message)')
    .first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  await sleep(500);
  await option.click();
}

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

/* -------------------------------------------------------------- ACTES */
async function acte0_ouverture(page) {
  await setAct(page, 'Aval Parc');
  await gotoStable(page, `${BASE}/login`);
  await slide(page, {
    titre: 'Aval Parc',
    lignes: ['La gestion de patrimoine des établissements de santé',
      'Équipements biomédicaux · Véhicules · Mobilier · Informatique'],
    holdMs: 4200,
  });
}

async function acte1_connexion(page) {
  await setAct(page, 'Connexion');
  await say(page, 'Chaque agent se connecte avec son propre compte — tout est tracé.', 2800);
  await type(page, '#username', ADMIN.user);
  await type(page, '#password-field', ADMIN.pass);
  await sleep(600);
  await hush(page);
  await Promise.all([page.waitForURL('**/'), page.locator('#submit').click()]);
  await page.waitForLoadState('networkidle').catch(() => {});
  await shot(page, '01-connexion');
}

async function acte2_tableau_de_bord(page) {
  await setAct(page, 'Tableau de bord');
  await ensureOverlay(page);
  await say(page, 'Le tableau de bord : tout le patrimoine de la clinique, en un coup d’œil.', 3200);
  await say(page, 'Matériels par statut, activité récente — la Direction voit l’état du parc en temps réel.', 3400);
  await page.mouse.wheel(0, 300); await sleep(1200);
  await page.mouse.wheel(0, -300); await sleep(600);
  await hush(page);
  await shot(page, '02-dashboard');
}

async function acte3_retrouver(page) {
  await setAct(page, 'Retrouver un bien');
  await say(page, 'Retrouver un bien en cinq secondes : tapez son étiquette…', 2600);
  await type(page, '#tagSearch', 'AVAL-DEMO-0001');
  await sleep(500);
  await hush(page);
  await Promise.all([page.waitForLoadState('domcontentloaded'), page.locator('#topSearchButton').click()]);
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'La fiche complète : emplacement, état général, historique — et son QR code d’étiquette.', 3600);
  await page.mouse.wheel(0, 420); await sleep(1400);
  await page.mouse.wheel(0, -420); await sleep(600);
  await hush(page);
  await shot(page, '03-fiche');
}

async function acte4_panne(page) {
  await setAct(page, 'Panne & réparation');
  await say(page, 'Le pick-up de la clinique est en panne — sa fiche de réparation est déjà ouverte.', 3000);
  await gotoStable(page, `${BASE}/maintenances`);
  await say(page, 'Le carnet de maintenance : qui répare, depuis quand, à quel coût.', 3000);
  await hush(page);
  // Ouvrir la maintenance "Réparation moteur - Hilux" (ligne du tableau)
  const lien = page.locator('table a', { hasText: /R.paration moteur/i }).first();
  await lien.waitFor({ state: 'visible', timeout: 15000 });
  await lien.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'La réparation est terminée : on saisit la date de fin et le coût…', 3000);
  // Page d'édition de la maintenance
  await gotoStable(page, page.url().replace(/\/?$/, '').concat('/edit'));
  await retype(page, 'input[name="completion_date"]', new Date().toISOString().slice(0, 10));
  await page.keyboard.press('Escape'); // referme le datepicker
  await retype(page, 'input[name="cost"]', '45000');
  await sleep(700);
  await hush(page);
  await page.locator('button[type=submit]', { hasText: /Sauveg|Enregistrer|Save/i }).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'Réparé, tracé, chiffré : le coût s’ajoute au coût total de possession du véhicule.', 3400);
  await hush(page);
  await shot(page, '04-maintenance');
}

async function acte5_affectation(page) {
  await setAct(page, 'Affectation');
  await say(page, 'Affectons un moniteur de transport au médecin de garde — le “bon de mouvement” numérique.', 3200);
  await gotoStable(page, `${BASE}/hardware`);
  await sleep(1500); // laisser le tableau se peupler à l'écran
  // Tableau AJAX (bootstrap-table) : lire le href puis naviguer — un clic
  // pendant un re-rendu peut se perdre.
  const rowLink = page.locator('table a', { hasText: /AVAL-DEMO-0005/i }).first();
  await rowLink.waitFor({ state: 'visible', timeout: 15000 });
  const ficheUrl = await rowLink.getAttribute('href');
  await hush(page);
  await gotoStable(page, ficheUrl || `${BASE}/hardware/5`);
  await sleep(1200); // montrer la fiche
  // Le bouton d'affectation vit dans le panneau latéral (repliable, parfois
  // masqué en headless) : on navigue vers son URL — même écran, zéro aléa.
  await gotoStable(page, `${BASE}/hardware/5/checkout`);
  await say(page, 'On choisit l’agent…', 2000);
  await select2(page, '#assigned_user', 'Fatimetou');
  await sleep(700);
  await hush(page);
  await page.locator('button[type=submit]', { hasText: /Affecter|Associer|Valider|Checkout/i }).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'Affecté en dix secondes — daté, signé, réversible. Fini les “qui a pris l’appareil ?”', 3600);
  await hush(page);
  await shot(page, '05-affectation');
}

async function acte6_pointage(page) {
  await setAct(page, 'Pointage d’inventaire');
  await say(page, 'Le pointage d’inventaire : on scanne l’étiquette, on confirme la présence.', 3000);
  await gotoStable(page, `${BASE}/hardware/2/audit`);
  await type(page, 'textarea[name="note"]', 'Présence confirmée — état conforme.');
  await sleep(600);
  await hush(page);
  await page.locator('#submit_button, button[type=submit]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'Pointé, daté, signé. L’inventaire annuel devient une vérification, plus un recomptage.', 3400);
  await gotoStable(page, `${BASE}/hardware/bulkaudit`);
  await say(page, 'Et pour une salle entière : le mode rafale — on bipe chaque étiquette à la douchette.', 3400);
  await hush(page);
  await shot(page, '06-pointage');
}

async function acte7_etiquettes(page) {
  await setAct(page, 'Étiquettes');
  await say(page, 'Chaque bien reçoit son étiquette : QR code pour smartphone, code-barres pour douchette.', 3200);
  await gotoStable(page, `${BASE}/hardware/1`);
  await hush(page);
  // Formulaire POST target=_blank (nouvel onglet = invisible en vidéo) :
  // on retire le target pour un rendu dans le même onglet, puis retour.
  await page.evaluate(() => document.getElementById('bulkForm')?.removeAttribute('target'));
  await page.locator('#bulkForm button#bulkEdit').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await ensureOverlay(page);
  await say(page, 'La planche s’imprime sur autocollants — prête à coller.', 3200);
  await hush(page);
  await shot(page, '07-etiquettes');
  await page.goBack().catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function acte8_direction(page) {
  await setAct(page, 'Vue Direction');
  await say(page, 'Pour la Direction et le Ministère : le rapport personnalisé.', 2800);
  await gotoStable(page, `${BASE}/reports/custom`);
  for (const label of ['Étiquette', 'Marque', 'Emplacement']) {
    const cb = page.locator(`label:has-text("${label}") input[type=checkbox]`).first();
    if (await cb.count()) await cb.check().catch(() => {});
    await sleep(350);
  }
  await say(page, 'On coche les colonnes voulues… et l’état du patrimoine sort en Excel, à jour du jour même.', 3600);
  await hush(page);
  await shot(page, '08-rapport');
}

async function acte9_deploiement(page) {
  await setAct(page, 'Déploiement');
  await slide(page, {
    titre: 'Chez vous, dans vos murs',
    lignes: ['Fonctionne sans internet — serveur local à la clinique',
      'Sauvegardes automatiques chaque nuit · vos données restent chez vous'],
    code: `./install.sh admin admin@votre-hopital.mr
# import de votre inventaire Excel : une journée
# formation des agents : une matinée`,
    holdMs: 6000,
  });
}

async function acte10_conclusion(page) {
  await setAct(page, 'Aval Parc');
  await slide(page, {
    titre: 'Aval Parc',
    lignes: ['Votre patrimoine, en direct.',
      'Démonstration en ligne : avalparc.bsimr.com',
      'BSIMR — Nouakchott · khbabah@yahoo.fr'],
    holdMs: 5600,
  });
}

/* ------------------------------------------------------------- main */
const ACTES = [acte0_ouverture, acte1_connexion, acte2_tableau_de_bord,
  acte3_retrouver, acte4_panne, acte5_affectation, acte6_pointage,
  acte7_etiquettes, acte8_direction, acte9_deploiement, acte10_conclusion];

let server;
try {
  server = await bootServer();
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'fr-FR',
    ...(VIDEO ? { recordVideo: { dir: VIDEO_DIR, size: { width: 1920, height: 1080 } } } : {}),
  });
  // window.open → surimpression <embed> (un onglet séparé serait invisible en vidéo)
  if (VIDEO) {
    await context.addInitScript(() => {
      window.open = (url) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:4%;z-index:2147483644;background:#fff;'
          + 'border-radius:12px;box-shadow:0 10px 60px rgba(0,0,0,.5);overflow:hidden';
        wrap.innerHTML = `<embed src="${url}" style="width:100%;height:100%">`;
        document.body.appendChild(wrap);
        setTimeout(() => wrap.remove(), 6000 * (window.__apSpeed || 1));
        return null;
      };
    });
    await context.addInitScript((s) => { window.__apSpeed = s; }, SPEED);
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
