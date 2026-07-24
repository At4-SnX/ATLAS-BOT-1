/**
 * Fait tourner les 4 images d'arrivée et les 4 images de départ, chacune
 * dans son propre cycle indépendant (1, 2, 3, 4, 1, 2, 3, 4, ...), avec un
 * état persistant dans un fichier JSON local.
 *
 * ⚠️ Sur Railway, le système de fichiers est éphémère par défaut : ce
 * fichier est réinitialisé à chaque redéploiement (la rotation repart
 * simplement à la première image, rien de grave). Pour une persistance
 * garantie, monte un Volume Railway sur /app/data (voir README).
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STATE_FILE = path.join(DATA_DIR, "eventRotation.json");

const EVENTS_DIR = path.join(__dirname, "..", "assets", "events");
const IMAGE_COUNT = 4;

function ensureStateFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ arrivalIndex: 0, departureIndex: 0 }, null, 2),
      "utf8"
    );
  }
}

function loadState() {
  ensureStateFile();
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      arrivalIndex: Number.isInteger(parsed.arrivalIndex) ? parsed.arrivalIndex : 0,
      departureIndex: Number.isInteger(parsed.departureIndex) ? parsed.departureIndex : 0,
    };
  } catch (error) {
    console.error("[ATLAS EVENTS] Erreur de lecture de eventRotation.json, réinitialisation:", error);
    return { arrivalIndex: 0, departureIndex: 0 };
  }
}

function saveState(state) {
  ensureStateFile();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Retourne le chemin de la prochaine image d'arrivée à utiliser, et avance
 * le cycle pour la prochaine fois.
 */
function nextArrivalImagePath() {
  const state = loadState();
  const imageNumber = (state.arrivalIndex % IMAGE_COUNT) + 1;
  state.arrivalIndex += 1;
  saveState(state);
  return path.join(EVENTS_DIR, `arrivee-${imageNumber}.png`);
}

/**
 * Retourne le chemin de la prochaine image de départ à utiliser, et avance
 * le cycle pour la prochaine fois.
 */
function nextDepartureImagePath() {
  const state = loadState();
  const imageNumber = (state.departureIndex % IMAGE_COUNT) + 1;
  state.departureIndex += 1;
  saveState(state);
  return path.join(EVENTS_DIR, `depart-${imageNumber}.png`);
}

module.exports = { nextArrivalImagePath, nextDepartureImagePath };
