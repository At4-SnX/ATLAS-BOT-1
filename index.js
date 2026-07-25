require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");

const { handleMemberAdd, handleMemberRemove } = require("./events/memberEvents");
const { connectToVoiceChannel, announceWelcomeIfIdle } = require("./utils/voice");
const { SERVER_NAME } = require("./config/messages");

const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID || "";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.GuildMember],
});

const { ActivityType } = require("discord.js");

client.once("clientReady", async () => {
  console.log(`[ATLAS EVENTS] Connectée en tant que ${client.user.tag} ✅`);
  console.log(`[ATLAS EVENTS] Protège/anime : ${SERVER_NAME}`);

  client.user.setActivity("discord.gg/atlasrpfr", {
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/atlasrp_officiel"
  });

  await connectToVoiceChannel(client);
});


client.on("guildMemberAdd", (member) => {
  handleMemberAdd(member).catch((error) =>
    console.error("[ATLAS EVENTS] Erreur non interceptée (arrivée):", error)
  );
});

client.on("guildMemberRemove", (member) => {
  handleMemberRemove(member).catch((error) =>
    console.error("[ATLAS EVENTS] Erreur non interceptée (départ):", error)
  );
});

// Le bot parle uniquement quand quelqu'un rejoint LE salon vocal configuré
// (VOICE_CHANNEL_ID) — sans rapport avec les arrivées/départs du serveur.
client.on("voiceStateUpdate", (oldState, newState) => {
  if (!VOICE_CHANNEL_ID) return;
  if (newState.channelId !== VOICE_CHANNEL_ID) return;
  if (oldState.channelId === VOICE_CHANNEL_ID) return; // déjà dans le salon, pas une arrivée
  if (newState.member?.user?.bot) return; // ignore les bots (dont lui-même)

  announceWelcomeIfIdle().catch((error) =>
    console.error("[ATLAS VOICE] Erreur non interceptée lors de l'annonce:", error)
  );
});

client.login(process.env.DISCORD_TOKEN);
