const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { renderEventImage, formatOrdinal } = require("../utils/eventCard");
const { nextArrivalImagePath, nextDepartureImagePath } = require("../utils/eventCounters");
const { ARRIVAL_MESSAGE, DEPARTURE_MESSAGE, EMBED_COLOR } = require("../config/messages");

const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID || "";
const LEAVE_CHANNEL_ID = process.env.LEAVE_CHANNEL_ID || WELCOME_CHANNEL_ID;

async function handleMemberAdd(member) {
  if (!WELCOME_CHANNEL_ID) {
    console.log("[ATLAS EVENTS] WELCOME_CHANNEL_ID non défini, aucune image d'arrivée envoyée.");
    return;
  }

  try {
    const channel = await member.client.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error("[ATLAS EVENTS] WELCOME_CHANNEL_ID ne pointe pas vers un salon textuel valide.");
      return;
    }

    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const displayName = member.displayName;
    const ordinalText = `${formatOrdinal(member.guild.memberCount)} MEMBRES`;
    const backgroundPath = nextArrivalImagePath();

    const buffer = await renderEventImage({
      backgroundPath,
      avatarUrl,
      displayName,
      ordinalText,
    });

    const filename = "arrivee-atlas.png";
    const attachment = new AttachmentBuilder(buffer, { name: filename });
    const embed = new EmbedBuilder().setColor(EMBED_COLOR).setImage(`attachment://${filename}`);

    const content = ARRIVAL_MESSAGE.replace("{user}", `<@${member.id}>`);

    await channel.send({ content, embeds: [embed], files: [attachment] });
  } catch (error) {
    console.error("[ATLAS EVENTS] Erreur lors du traitement d'une arrivée:", error);
  }
}

async function handleMemberRemove(member) {
  if (!LEAVE_CHANNEL_ID) {
    console.log("[ATLAS EVENTS] LEAVE_CHANNEL_ID non défini, aucune image de départ envoyée.");
    return;
  }

  try {
    const channel = await member.client.channels.fetch(LEAVE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error("[ATLAS EVENTS] LEAVE_CHANNEL_ID ne pointe pas vers un salon textuel valide.");
      return;
    }

    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const displayName = member.displayName ?? member.user.username;
    const backgroundPath = nextDepartureImagePath();

    const buffer = await renderEventImage({
      backgroundPath,
      avatarUrl,
      displayName,
      ordinalText: null,
    });

    const filename = "depart-atlas.png";
    const attachment = new AttachmentBuilder(buffer, { name: filename });
    const embed = new EmbedBuilder().setColor(EMBED_COLOR).setImage(`attachment://${filename}`);

    const content = DEPARTURE_MESSAGE.replace("{user}", `<@${member.id}>`);

    await channel.send({ content, embeds: [embed], files: [attachment] });
  } catch (error) {
    console.error("[ATLAS EVENTS] Erreur lors du traitement d'un départ:", error);
  }
}

module.exports = { handleMemberAdd, handleMemberRemove };
