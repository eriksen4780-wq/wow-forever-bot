import "dotenv/config";
import { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import fs from "fs";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!TOKEN || !CLIENT_ID) process.exit(1);

const DATA_FILE = "./data.json";
const CHAMPION_ROLE_NAME = "Champion of Stege";
const HALL_OF_FAME_CHANNEL_NAME = "hall-of-fame";

function loadData() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return { challenges: d.challenges ?? {}, hallOfFame: d.hallOfFame ?? [], currentChampionId: d.currentChampionId ?? null };
  } catch {
    return { challenges: {}, hallOfFame: [], currentChampionId: null };
  }
}
let data = loadData();
const saveData = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder().setName("challenge").setDescription("Manage Ugens Udfordring")
    .addSubcommand(s => s.setName("create").setDescription("Opret en ny challenge")
      .addStringOption(o => o.setName("name").setDescription("Challenge-navn").setRequired(true))
      .addStringOption(o => o.setName("description").setDescription("Beskrivelse").setRequired(true))
      .addIntegerOption(o => o.setName("timer").setDescription("Hvor mange timer").setRequired(true).setMinValue(1).setMaxValue(720)))
    .addSubcommand(s => s.setName("finish").setDescription("Afslut den aktive challenge"))
    .addSubcommand(s => s.setName("status").setDescription("Se den aktive challenge")),
  new SlashCommandBuilder().setName("submit").setDescription("Indsend eller opdater din score")
    .addIntegerOption(o => o.setName("score").setDescription("Din score").setRequired(true).setMinValue(0))
    .addStringOption(o => o.setName("proof").setDescription("Valgfri dokumentation").setRequired(false)),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Se leaderboardet")
];

function active(guildId) {
  return Object.values(data.challenges).find(c => c.guildId === guildId && c.active);
}
function embed(c) {
  const t = Math.floor(c.endsAt / 1000);
  return new EmbedBuilder().setTitle(`⚔️ ${c.name}`).setDescription(c.description)
    .addFields({ name: "⏰ Slutter", value: `<t:${t}:F> (<t:${t}:R>)` }, { name: "🏆 Deltagere", value: String(Object.keys(c.entries).length), inline: true })
    .setFooter({ text: "WoW Forever • 4780 Stege" });
}
function buttons(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`join:${id}`).setLabel("🏆 Deltag").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`scores:${id}`).setLabel("📊 Se stilling").setStyle(ButtonStyle.Secondary)
  );
}
function winner(c) {
  return Object.values(c.entries ?? {}).sort((a,b) => b.score - a.score || (a.updatedAt ?? 0) - (b.updatedAt ?? 0))[0] ?? null;
}

async function awardChampion(guild, win) {
  let role = guild.roles.cache.find(r => r.name.toLowerCase() === CHAMPION_ROLE_NAME.toLowerCase());
  if (!role) role = await guild.roles.create({ name: CHAMPION_ROLE_NAME, reason: "Ugens Udfordring champion role" });

  for (const [, member] of guild.members.cache.filter(m => m.roles.cache.has(role.id))) {
    if (member.id !== win.userId) {
      try { await member.roles.remove(role, "Ny Champion of Stege"); } catch (e) { console.error("Role remove:", e.message); }
    }
  }

  const member = await guild.members.fetch(win.userId).catch(() => null);
  if (!member) return null;

  try {
    await member.roles.add(role, "Vinder af Ugens Udfordring");
    data.currentChampionId = member.id;
    return member;
  } catch (e) {
    console.error("Role add:", e.message);
    return null;
  }
}

async function hallOfFame(guild, c, win, member) {
  const channel = guild.channels.cache.find(ch => ch.isTextBased() && ch.name.toLowerCase() === HALL_OF_FAME_CHANNEL_NAME);
  if (!channel) return;

  const name = member?.displayName ?? win.username;
  await channel.send({ embeds: [
    new EmbedBuilder().setTitle("🏆 HALL OF FAME").setDescription(`**${c.name}**`)
      .addFields({ name: "🥇 Mester", value: `**${name}**`, inline: true }, { name: "⚔️ Score", value: `**${win.score}**`, inline: true })
      .setTimestamp().setFooter({ text: "WoW Forever • 4780 Stege" })
  ]});
}

async function finish(c, guild, channel) {
  if (!c || !c.active) return;
  c.active = false;
  c.finishedAt = Date.now();

  const win = winner(c);
  if (!win) {
    if (channel) await channel.send("🏁 Challengen er afsluttet, men der var ingen deltagere.");
    saveData();
    return;
  }

  const member = await awardChampion(guild, win);
  const name = member?.displayName ?? win.username;
  if (channel) await channel.send({ embeds: [
    new EmbedBuilder().setTitle("🏆 UGENS UDFORDRING ER AFSLUTTET!")
      .setDescription(`🥇 **${name}** vinder **${c.name}** med **${win.score}** point!`)
      .setFooter({ text: "👑 Champion of Stege" }).setTimestamp()
  ]});

  data.hallOfFame.push({ challengeId: c.id, guildId: c.guildId, name: c.name, winnerId: win.userId, winnerName: win.username, score: win.score, finishedAt: c.finishedAt });
  saveData();
  try { await hallOfFame(guild, c, win, member); } catch (e) { console.error("Hall of Fame:", e.message); }
}

client.once("clientReady", c => console.log(`Logged in as ${c.user.tag}`));

client.on("interactionCreate", async i => {
  try {
    if (i.isChatInputCommand()) {
      if (!i.guildId) return i.reply({ content: "Denne bot kan kun bruges på en Discord-server.", ephemeral: true });

      if (i.commandName === "challenge") {
        const sub = i.options.getSubcommand();
        if (sub === "create") {
          if (active(i.guildId)) return i.reply({ content: "Der er allerede en aktiv challenge.", ephemeral: true });
          const name = i.options.getString("name", true);
          const description = i.options.getString("description", true);
          const hours = i.options.getInteger("timer", true);
          const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
          const c = { id, guildId: i.guildId, name, description, createdAt: Date.now(), endsAt: Date.now()+hours*3600000, active: true, entries: {} };
          data.challenges[id] = c; saveData();
          return i.reply({ embeds: [embed(c)], components: [buttons(id)] });
        }
        if (sub === "status") {
          const c = active(i.guildId);
          if (!c) return i.reply({ content: "Der er ingen aktiv challenge lige nu.", ephemeral: true });
          return i.reply({ embeds: [embed(c)], components: [buttons(c.id)] });
        }
        if (sub === "finish") {
          const c = active(i.guildId);
          if (!c) return i.reply({ content: "Der er ingen aktiv challenge.", ephemeral: true });
          await i.deferReply();
          await finish(c, i.guild, i.channel);
          return i.editReply("🏁 Challengen er afsluttet.");
        }
      }

      if (i.commandName === "submit") {
        const c = active(i.guildId);
        if (!c) return i.reply({ content: "Der er ingen aktiv challenge lige nu.", ephemeral: true });
        const score = i.options.getInteger("score", true);
        const proof = i.options.getString("proof") ?? "";
        c.entries[i.user.id] = { userId: i.user.id, username: i.user.username, score, proof, updatedAt: Date.now() };
        saveData();
        return i.reply({ content: `✅ Din score er registreret: **${score}** point.`, ephemeral: true });
      }

      if (i.commandName === "leaderboard") {
        const c = active(i.guildId);
        if (!c) return i.reply({ content: "Der er ingen aktiv challenge lige nu.", ephemeral: true });
        const list = Object.values(c.entries).sort((a,b)=>b.score-a.score).slice(0,10);
        const text = list.length ? list.map((e,n)=>`**${n+1}.** ${e.username} — **${e.score}**`).join("\n") : "Ingen scores endnu.";
        return i.reply({ embeds: [new EmbedBuilder().setTitle(`📊 ${c.name}`).setDescription(text).setFooter({ text: "WoW Forever • 4780 Stege" })] });
      }
    }

    if (i.isButton()) {
      const [action,id] = i.customId.split(":");
      const c = data.challenges[id];
      if (!c) return i.reply({ content: "Denne challenge findes ikke længere.", ephemeral: true });
      if (!c.active) return i.reply({ content: "Denne challenge er allerede afsluttet.", ephemeral: true });

      if (action === "join") {
        if (!c.entries[i.user.id]) c.entries[i.user.id] = { userId:i.user.id, username:i.user.username, score:0, proof:"", updatedAt:Date.now() };
        saveData();
        return i.reply({ content: "⚔️ Du er med! Brug `/submit` for at indsende din score.", ephemeral: true });
      }
      if (action === "scores") {
        const list = Object.values(c.entries).sort((a,b)=>b.score-a.score).slice(0,10);
        const text = list.length ? list.map((e,n)=>`**${n+1}.** ${e.username} — **${e.score}**`).join("\n") : "Ingen scores endnu.";
        return i.reply({ content: `📊 **${c.name}**\n\n${text}`, ephemeral: true });
      }
    }
  } catch (e) {
    console.error("Interaction error:", e);
    if (i.isRepliable() && !i.replied && !i.deferred) await i.reply({ content:"Der opstod en fejl. Tjek Render-loggen.", ephemeral:true });
  }
});

setInterval(async () => {
  for (const c of Object.values(data.challenges)) {
    if (!c.active || c.endsAt > Date.now()) continue;
    try {
      const guild = client.guilds.cache.get(c.guildId);

      if (!guild) {
        console.warn(`Skipping challenge ${c.id}: guild ${c.guildId} is no longer available to this bot.`);
        c.active = false;
        c.finishedAt = Date.now();
        saveData();
        continue;
      }

      const channel = guild.channels.cache.find(ch => ch.isTextBased() && ch.name.toLowerCase().includes("ugens-udfordring"));
      await finish(c, guild, channel);
    } catch (e) {
      console.error(`Could not finish challenge ${c.id}:`, e.message);
    }
  }
}, 60000);

(async () => {
  try {
    await client.application?.commands.set(commands);
    await client.login(TOKEN);
  } catch (e) {
    console.error("Bot startup failed:", e);
    process.exit(1);
  }
})();
