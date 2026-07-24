const { createCanvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");
const path = require("path");

const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "ArchivoBlack-Regular.ttf"), "Archivo Black");
GlobalFonts.registerFromPath(path.join(FONTS_DIR, "PTSans-Regular.ttf"), "Atlas Sans");

const CANVAS_WIDTH = 2048;
const CANVAS_HEIGHT = 807;

// Zone dédiée à l'avatar + pseudo (mesurée sur les visuels fournis)
const AVATAR_CENTER_X = 460;
const AVATAR_CENTER_Y = 345;
const AVATAR_RADIUS = 150;
const NAME_MAX_WIDTH = 800;

// Position mesurée du texte "MERCI D'AVOIR REJOINT, VOUS ETES LE" déjà
// présent dans l'image de fond (identique sur les 4 visuels d'arrivée) :
// bande x 154-1126, y 684-713. Le compteur est placé À LA SUITE.
const ORDINAL_START_X = 1146;
const ORDINAL_BASELINE_Y = 712;
const ORDINAL_FONT_SIZE = 32.9; // valeur demandée explicitement
const ORDINAL_MAX_WIDTH = CANVAS_WIDTH - 60 - ORDINAL_START_X;

function fitFontSize(ctx, text, startSize, maxWidth, fontFamily, minSize = 14) {
  let size = startSize;
  ctx.font = `${size}px '${fontFamily}'`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = `${size}px '${fontFamily}'`;
  }
  return size;
}

/**
 * Texte blanc avec un léger contour noir, dans le style Archivo Black déjà
 * utilisé pour "MERCI D'AVOIR REJOINT..." dans les visuels fournis.
 */
function drawOrdinalText(ctx, text, x, y, options = {}) {
  const { fontSize = ORDINAL_FONT_SIZE, maxWidth = null, align = "left", strokeWidth = 3 } = options;

  const finalSize = maxWidth
    ? fitFontSize(ctx, text, fontSize, maxWidth, "Archivo Black")
    : fontSize;

  ctx.save();
  ctx.font = `${finalSize}px 'Archivo Black'`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = "#000000";
  ctx.strokeText(text, x, y);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
  ctx.restore();

  return finalSize;
}

/**
 * Pseudo d'affichage sous l'avatar, en police normale (pas Archivo Black),
 * sans contour — un simple texte blanc lisible.
 */
function drawDisplayName(ctx, text, x, y, options = {}) {
  const { fontSize = 42, maxWidth = null, align = "center" } = options;

  ctx.font = `${fontSize}px 'Atlas Sans'`;
  const finalSize = maxWidth ? fitFontSize(ctx, text, fontSize, maxWidth, "Atlas Sans") : fontSize;

  ctx.save();
  ctx.font = `${finalSize}px 'Atlas Sans'`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  // Légère ombre pour la lisibilité sur fond photo, sans contour marqué
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
  ctx.restore();
}

async function drawAvatar(ctx, avatarUrl) {
  ctx.save();

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(AVATAR_CENTER_X, AVATAR_CENTER_Y, AVATAR_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.001)";
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(AVATAR_CENTER_X, AVATAR_CENTER_Y, AVATAR_RADIUS + 10, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(AVATAR_CENTER_X, AVATAR_CENTER_Y, AVATAR_RADIUS + 4, 0, Math.PI * 2);
  ctx.fillStyle = "#f2c14e";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(AVATAR_CENTER_X, AVATAR_CENTER_Y, AVATAR_RADIUS, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const avatarImage = await loadImage(avatarUrl);
    const size = AVATAR_RADIUS * 2;
    const scale = Math.max(size / avatarImage.width, size / avatarImage.height);
    const dw = avatarImage.width * scale;
    const dh = avatarImage.height * scale;
    const dx = AVATAR_CENTER_X - dw / 2;
    const dy = AVATAR_CENTER_Y - dh / 2;
    ctx.drawImage(avatarImage, dx, dy, dw, dh);
  } catch (error) {
    console.error("[ATLAS EVENTS] Impossible de charger l'avatar Discord:", error);
    ctx.fillStyle = "#2c2568";
    ctx.fillRect(
      AVATAR_CENTER_X - AVATAR_RADIUS,
      AVATAR_CENTER_Y - AVATAR_RADIUS,
      AVATAR_RADIUS * 2,
      AVATAR_RADIUS * 2
    );
  }
  ctx.restore();
  ctx.restore();
}

/**
 * Compose l'image finale d'arrivée ou de départ.
 *
 * @param {Object} params
 * @param {string} params.backgroundPath - chemin local vers l'image de fond choisie
 * @param {string} params.avatarUrl - URL de la photo de profil Discord
 * @param {string} params.displayName - pseudo d'affichage à afficher sous l'avatar
 * @param {string|null} params.ordinalText - texte du compteur (arrivées uniquement),
 *   affiché à la suite de "MERCI D'AVOIR REJOINT, VOUS ETES LE" déjà présent dans l'image
 * @returns {Promise<Buffer>}
 */
async function renderEventImage({ backgroundPath, avatarUrl, displayName, ordinalText = null }) {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");

  const background = await loadImage(backgroundPath);
  ctx.drawImage(background, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  await drawAvatar(ctx, avatarUrl);

  drawDisplayName(ctx, displayName, AVATAR_CENTER_X, AVATAR_CENTER_Y + AVATAR_RADIUS + 60, {
    fontSize: 42,
    maxWidth: NAME_MAX_WIDTH,
    align: "center",
  });

  if (ordinalText) {
    drawOrdinalText(ctx, ordinalText, ORDINAL_START_X, ORDINAL_BASELINE_Y, {
      fontSize: ORDINAL_FONT_SIZE,
      maxWidth: ORDINAL_MAX_WIDTH,
      align: "left",
      strokeWidth: 3,
    });
  }

  return canvas.toBuffer("image/png");
}

/**
 * Formate un nombre en ordinal français : 1 -> "1er", 2 -> "2e", etc.
 */
function formatOrdinal(n) {
  const formatted = n.toLocaleString("fr-FR");
  return n === 1 ? `${formatted}er` : `${formatted}e`;
}

module.exports = { renderEventImage, formatOrdinal };
