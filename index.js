// index.js
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionsBitField,
  REST,
  Routes,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
} from "discord.js";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,     // join/leave events
    GatewayIntentBits.GuildModeration,  // ban/unban events
    GatewayIntentBits.GuildMessages,    // needed for context menu
    GatewayIntentBits.MessageContent,   // needed to read target message content
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// -------------------- Register Context Menu Command --------------------
const commands = [
  new ContextMenuCommandBuilder()
    .setName("Verify")
    .setType(ApplicationCommandType.Message) // right-click message
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // only admins
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), // restrict to one guild
      { body: commands }
    );
    console.log("✅ Context menu command registered");
  } catch (error) {
    console.error(error);
  }
})();

// -------------------- Utility Functions --------------------
function getChannelByName(guild, name) {
  return guild.channels.cache.find(
    (ch) => ch.name === name && ch.isTextBased()
  );
}

function sendEmbed(channel, title, messages, color = 0x5865F2) {
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(randomMsg)
    .setTimestamp();
  channel.send({ embeds: [embed] });
}

// -------------------- Event Handlers --------------------
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// New member joins
client.on("guildMemberAdd", async (member) => {
  const channel = getChannelByName(member.guild, "👋｜joins-and-leaves");
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

// Member leaves or is kicked
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

// Member banned
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

// Member unbanned
client.on("guildBanRemove", async (ban) => {
  const channel = getChannelByName(ban.guild, "joins-and-leaves");
  if (!channel) return;

  sendEmbed(channel, "Member Unbanned", [
    `✅ **${ban.user.username}** has been unbanned.`,
  ], 0x57f287);
});

// -------------------- Context Menu Verify Logic --------------------
// -------------------- Context Menu Verify Logic --------------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isMessageContextMenuCommand()) return;
  if (interaction.commandName !== "Verify") return;

  // Restrict to #verification-here
  if (interaction.channel.name !== "🟢｜verification-here") {
    return interaction.reply({
      content: "❌ This command can only be used in #🟢｜verification-here.",
      ephemeral: true,
    });
  }

  const targetMessage = interaction.targetMessage;
  if (!targetMessage) {
    return interaction.reply({
      content: "❌ Could not fetch the target message.",
      ephemeral: true,
    });
  }

  const user = targetMessage.author;
  const target = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!target) {
    return interaction.reply({
      content: "❌ Could not find the target member in this guild.",
      ephemeral: true,
    });
  }

  // Validate format
  const lines = targetMessage.content.trim().split("\n");
  if (lines.length !== 2) {
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Verification Failed")
      .setDescription("Message must be in the format:\n`Full Name`\n`class/division`");
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const fullName = lines[0].trim();
  const [className, division] = lines[1].split("/").map((s) => s.trim());
  if (!fullName || !className || !division) {
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Verification Failed")
      .setDescription("Message must be in the format:\n`Full Name`\n`class/division`");
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Format nickname
  const formattedName = fullName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  const formattedDivision = division.charAt(0).toUpperCase() + division.slice(1).toLowerCase();
  const nickname = `${formattedName} - ${className}/${formattedDivision}`;

  try {
    await target.setNickname(nickname);

    const role = target.guild.roles.cache.find((r) => r.name === "verified");
    if (role) await target.roles.add(role);

    const role2 = target.guild.roles.cache.find((r) => r.name === `${className}th grader`);
    if (role2) await target.roles.add(role2);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Verification Successful")
      .setDescription(
        `✅ ${target} has been verified!\n**Nickname set to:** ${nickname}\n**Roles added:** ${role ? role.name : "N/A"}${role2 ? `, ${role2.name}` : "N/A"}`
      );

    // Send the success embed
    const replyMsg = await interaction.reply({ embeds: [embed], fetchReply: true });

    // After 1 second, delete both the target message and the bot's reply
    setTimeout(async () => {
      try {
        await targetMessage.delete();
        await replyMsg.delete();
      } catch (err) {
        console.error("Error deleting messages:", err);
      }
    }, 1000);

  } catch (err) {
    console.error(err);
    await interaction.reply({
      content: "❌ Error verifying user.",
      ephemeral: true,
    });
  }
});

client.login(process.env.BOT_TOKEN);
