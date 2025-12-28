// index.js
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // needed for join/leave events
    GatewayIntentBits.GuildBans,    // needed for ban events
  ],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Utility: get the channel by name
function getChannelByName(guild, name) {
  return guild.channels.cache.find(
    (ch) => ch.name === name && ch.isTextBased()
  );
}

// Helper: send an embed with random message
function sendEmbed(channel, title, messages, color = 0x5865F2) {
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(randomMsg)
    .setTimestamp();
  channel.send({ embeds: [embed] });
}

// When a new member joins
client.on("guildMemberAdd", async (member) => {
  const channel = getChannelByName(member.guild, "joins-and-leaves");
  if (!channel) return;

  const greetings = [
    `🎉 Welcome aboard, **${member.displayName}**!`,
    `👋 Hey **${member.displayName}**, glad you joined us!`,
    `🌟 **${member.displayName}** just landed — say hi!`,
    `🥳 **${member.displayName}** has entered the chat!`,
    `🚀 **${member.displayName}** joined — let’s go!`,
  ];

  sendEmbed(channel, "New Member Joined", greetings, 0x57f287);
});

// When a member leaves (could be voluntary or kicked)
client.on("guildMemberRemove", async (member) => {
  const channel = getChannelByName(member.guild, "joins-and-leaves");
  if (!channel) return;

  try {
    const auditLogs = await member.guild.fetchAuditLogs({
      type: 20, // MEMBER_KICK
      limit: 1,
    });
    const kickLog = auditLogs.entries.first();

    if (kickLog && kickLog.target.id === member.id) {
      sendEmbed(channel, "Member Kicked", [
        `👢 **${member.displayName}** was kicked out.`,
      ], 0xed4245);
      return;
    }

    const leaveMessages = [
      `😢 **${member.displayName}** has left us...`,
      `👋 Goodbye **${member.displayName}**, hope to see you again!`,
      `🚪 **${member.displayName}** walked out the door.`,
    ];
    sendEmbed(channel, "Member Left", leaveMessages, 0xed4245);
  } catch (err) {
    console.error("Error checking audit logs:", err);
  }
});

// When a member is banned
client.on("guildBanAdd", async (ban) => {
  const channel = getChannelByName(ban.guild, "joins-and-leaves");
  if (!channel) return;

  const banMessages = [
    `⛔ **${ban.user.username}** has been banned.`,
    `🔨 **${ban.user.username}** got the hammer.`,
    `🚫 **${ban.user.username}** is no longer welcome here.`,
  ];

  sendEmbed(channel, "Member Banned", banMessages, 0xed4245);
});

// Optional: when a member is unbanned
client.on("guildBanRemove", async (ban) => {
  const channel = getChannelByName(ban.guild, "joins-and-leaves");
  if (!channel) return;

  sendEmbed(channel, "Member Unbanned", [
    `✅ **${ban.user.username}** has been unbanned.`,
  ], 0x57f287);
});

client.login(process.env.BOT_TOKEN);