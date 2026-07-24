const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
} = require("@discordjs/voice");
const { Readable } = require("stream");
const googleTTS = require("google-tts-api");
const { WELCOME_VOICE_LINE, VOICE_LANG } = require("../config/voiceMessages");

const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID || "";
const ANNOUNCE_DELAY_MS = parseInt(process.env.VOICE_ANNOUNCE_DELAY_MS || "1800", 10);

let connection = null;
let player = null;
let reconnecting = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPlayerBusy() {
  if (!player) return false;
  return (
    player.state.status === AudioPlayerStatus.Playing ||
    player.state.status === AudioPlayerStatus.Buffering
  );
}

/**
 * Rejoint (ou rejoint à nouveau) le salon vocal configuré et s'y maintient.
 * À appeler une fois au démarrage du bot.
 */
async function connectToVoiceChannel(client) {
  if (!VOICE_CHANNEL_ID) {
    console.log("[ATLAS VOICE] VOICE_CHANNEL_ID non défini, le bot ne rejoindra aucun salon vocal.");
    return;
  }

  try {
    const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
    if (!channel || !channel.isVoiceBased()) {
      console.error("[ATLAS VOICE] VOICE_CHANNEL_ID ne pointe pas vers un salon vocal valide.");
      return;
    }

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    if (!player) {
      player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Play },
      });
      player.on("error", (error) => {
        console.error("[ATLAS VOICE] Erreur du lecteur audio:", error.message);
      });
    }

    connection.subscribe(player);
    setupReconnectHandling(client);

    console.log(`[ATLAS VOICE] Connectée au salon vocal "${channel.name}" ✅`);
  } catch (error) {
    console.error("[ATLAS VOICE] Impossible de rejoindre le salon vocal:", error);
  }
}

function setupReconnectHandling(client) {
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      try {
        connection.destroy();
      } catch {
        // déjà détruite, on ignore
      }
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log("[ATLAS VOICE] Connexion vocale perdue, nouvelle tentative dans 5 secondes...");
    setTimeout(() => {
      reconnecting = false;
      connectToVoiceChannel(client);
    }, 5000);
  });
}

/**
 * Génère l'audio (MP3) du message vocal via l'API gratuite Google TTS et
 * retourne un Buffer prêt à être joué.
 */
async function generateSpeechBuffer(text) {
  const segments = await googleTTS.getAllAudioBase64(text, {
    lang: VOICE_LANG,
    slow: false,
    splitPunct: ",.!?",
  });

  const buffers = segments.map((seg) => Buffer.from(seg.base64, "base64"));
  return Buffer.concat(buffers);
}

/**
 * Joue le message d'accueil vocal, SEULEMENT si aucun message n'est déjà en
 * cours de lecture (pas de chevauchement).
 *
 * Un court délai (VOICE_ANNOUNCE_DELAY_MS) est appliqué avant de démarrer
 * la lecture : quand un membre rejoint un salon vocal, son propre client
 * Discord met un instant à finaliser sa connexion audio. Sans ce délai, le
 * début de la phrase est joué avant que son client ne soit prêt à recevoir
 * du son, et il entend la phrase déjà commencée.
 */
async function announceWelcomeIfIdle() {
  if (!connection || !player) return;
  if (isPlayerBusy()) return;

  if (ANNOUNCE_DELAY_MS > 0) {
    await delay(ANNOUNCE_DELAY_MS);
  }

  if (isPlayerBusy()) return;

  try {
    const audioBuffer = await generateSpeechBuffer(WELCOME_VOICE_LINE);
    const stream = Readable.from(audioBuffer);
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    player.play(resource);
  } catch (error) {
    console.error("[ATLAS VOICE] Erreur lors de la génération/lecture du message vocal:", error);
  }
}

module.exports = { connectToVoiceChannel, announceWelcomeIfIdle };
