/**
 * Reçoit les résultats du site de test Cadence et les range dans ce tableur.
 * - onglet « Testeurs » : une ligne par testeur (profil, score SUS, commentaires)
 * - onglet « Missions » : une ligne par mission (statut, temps, facilité, parcours)
 * Installation : voir README.md, étape 1.
 */

const TESTEURS = ['Reçu le', 'ID', 'Code', 'Âge', 'Niveau golf', 'Applis de suivi', 'Appareil', 'Navigateur', 'Version',
  'Durée missions (min)', 'Missions réussies', 'Sur', 'Score SUS',
  'SUS 1', 'SUS 2', 'SUS 3', 'SUS 4', 'SUS 5', 'SUS 6', 'SUS 7', 'SUS 8', 'SUS 9', 'SUS 10',
  'A aimé', 'A gêné'];
const MISSIONS = ['Reçu le', 'ID', 'Code', 'Mission', 'Intitulé', 'Statut', 'Temps (s)', 'Écrans visités', 'Clics', 'Facilité (1-7)', 'Commentaire', 'Parcours dans l’appli'];

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    const t = sheet_('Testeurs', TESTEURS);

    // Évite les doublons si le testeur a appuyé deux fois sur « Envoyer »
    const ids = t.getLastRow() > 1 ? t.getRange(2, 2, t.getLastRow() - 1, 1).getValues().map((r) => r[0]) : [];
    if (ids.indexOf(d.id) >= 0) return out_({ ok: true, duplicate: true });

    const now = new Date();
    const sus = Array.isArray(d.sus) ? d.sus : [];
    t.appendRow([now, d.id, d.code, d.age, d.level, d.apps, d.device, d.browser, d.version,
      d.totalMin, d.success, d.missionCount, d.susScore].concat(sus.slice(0, 10)).concat([d.likes || '', d.dislikes || '']));

    const m = sheet_('Missions', MISSIONS);
    const rows = (d.missions || []).map((x) => [now, d.id, d.code, x.id, x.title,
      x.status === 'reussie' ? 'Réussie' : 'Abandon', x.secs, x.navs, x.clicks, x.seq || '', x.comment || '', x.path || '']);
    if (rows.length) m.getRange(m.getLastRow() + 1, 1, rows.length, MISSIONS.length).setValues(rows);

    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return out_({ ok: true, message: 'Le récepteur des tests Cadence fonctionne.' });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
