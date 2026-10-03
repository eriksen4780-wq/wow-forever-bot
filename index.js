import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import fs from "fs";
import http from "http";

// =========================
// RENDER HEALTH SERVER
// =========================

const PORT = process.env.PORT || 10000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WoW Forever Discord Bot is online.");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Health server listening on port ${PORT}`);
});

// =========================
// DISCORD CONFIG
// =========================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("DISCORD_TOKEN eller DISCORD_CLIENT_ID mangler.");
  process.exit(1);
}

// =========================
// DATA
// =========================

const DATA_FILE = "./data.json";

const CHAMPION_ROLE_NAME = "Champion of Stege";
const HALL_OF_FAME_CHANNEL_NAME = "hall-of-fame";

function loadData() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    return {
      challenges: d.challenges ?? {},
      hallOfFame: d.hallOfFame ?? [],
      currentChampionId: d.currentChampionId ?? null
    };
  } catch {
    return {
      challenges: {},
      hallOfFame: [],
      currentChampionId: null
    };
  }
}

let data = loadData();

const saveData = () => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// =========================
// DISCORD CLIENT
// =========================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =========================
// DANISH LEGENDS
// =========================

const DANISH_LEGENDS = [
  {
    person: "Villy Søvndal",
    legendName: "Villy Sleepvalley",
    title: "Frost Shaman of the Northern Realm",
    lore: "The Ice Is Melting at the Pøules",
    rarity: "Mythic",
    class: "Shaman",
    category: "Meme",
    reference: "The famous 'ice is melting at the pøules' quote."
  },

  {
    person: "Mette Frederiksen",
    legendName: "Mette Minkbane",
    title: "Eradicator of the Furlands",
    lore: "When the mink hordes rose, she called the final order.",
    rarity: "Legendary",
    class: "Warlock",
    category: "Politics",
    reference: "The Danish mink crisis."
  },

  {
    person: "Bjarne Riis",
    legendName: "Bjarne Tourblood",
    title: "The Eagle of Herning",
    lore: "He climbed mountains where lesser warriors could barely walk.",
    rarity: "Epic",
    class: "Warrior",
    category: "Sport",
    reference: "Tour de France and his nickname 'The Eagle'."
  },

  {
    person: "Peter Schmeichel",
    legendName: "Peter Stormglove",
    title: "Guardian of the Nine Realms",
    lore: "Nothing passed the giant between the posts.",
    rarity: "Legendary",
    class: "Paladin",
    category: "Sport",
    reference: "Legendary Danish goalkeeper."
  },

  {
    person: "Kim Larsen",
    legendName: "Kim Gasolineflame",
    title: "Bard of the Burning Streets",
    lore: "His songs could fill taverns from Copenhagen to Azeroth.",
    rarity: "Legendary",
    class: "Bard",
    category: "Music",
    reference: "Kim Larsen and Gasolin'."
  },

  {
    person: "Tom Kristensen",
    legendName: "Tom LeMans",
    title: "Racer of Nine Victories",
    lore: "Nine times he conquered the greatest endurance race.",
    rarity: "Epic",
    class: "Rogue",
    category: "Sport",
    reference: "Nine Le Mans victories."
  },

  {
    person: "Mads Mikkelsen",
    legendName: "Mads Darkblade",
    title: "The Silent Assassin",
    lore: "He enters the room without a sound. Nobody leaves unchanged.",
    rarity: "Epic",
    class: "Rogue",
    category: "Film",
    reference: "His many villain and assassin roles."
  },

  {
    person: "Mikkel Kessler",
    legendName: "Mikkel Fistfury",
    title: "The Nordic Warrior",
    lore: "The sound of the bell meant only one thing: fight.",
    rarity: "Epic",
    class: "Warrior",
    category: "Sport",
    reference: "Danish boxing legend."
  },

  {
    person: "Preben Elkjær",
    legendName: "Preben Elkhorn",
    title: "The Drunken Striker",
    lore: "He needed neither perfect boots nor perfect plans.",
    rarity: "Legendary",
    class: "Warrior",
    category: "Sport",
    reference: "Danish football legend and the famous drinking stories."
  },

  {
    person: "Michael Laudrup",
    legendName: "Michael Moonpass",
    title: "Master of the Impossible Pass",
    lore: "His enemies saw the ball only after it had already passed them.",
    rarity: "Mythic",
    class: "Mage",
    category: "Sport",
    reference: "Famous Danish football playmaker."
  },

  {
    person: "Nicklas Bendtner",
    legendName: "Nicklas Lordbane",
    title: "Lord of the Penalty Box",
    lore: "A lord needs no kingdom. Only a penalty box.",
    rarity: "Epic",
    class: "Paladin",
    category: "Sport",
    reference: "Bendtner's self-proclaimed 'Lord' nickname."
  },

  {
    person: "Lars Ulrich",
    legendName: "Lars Metalstorm",
    title: "Drummer of Doom",
    lore: "Every strike of his hammer shakes the mountains.",
    rarity: "Legendary",
    class: "Warrior",
    category: "Music",
    reference: "Metallica drummer."
  },

  {
    person: "H.C. Andersen",
    legendName: "H.C. Storybane",
    title: "Master of a Thousand Tales",
    lore: "His stories became legends long before Azeroth knew his name.",
    rarity: "Mythic",
    class: "Mage",
    category: "Literature",
    reference: "One of Denmark's most famous authors."
  },

  {
    person: "Søren Kierkegaard",
    legendName: "Søren Dreadkegaard",
    title: "Philosopher of Darkness",
    lore: "He questioned everything. Even the darkness questioned him.",
    rarity: "Mythic",
    class: "Warlock",
    category: "Philosophy",
    reference: "Danish philosopher."
  },

  {
    person: "Niels Bohr",
    legendName: "Niels Boar",
    title: "Master of the Atomic Arcane",
    lore: "He discovered that even the smallest particles contain great power.",
    rarity: "Mythic",
    class: "Mage",
    category: "Science",
    reference: "Niels Bohr and atomic physics."
  },

  {
    person: "Anders Matthesen",
    legendName: "Anders Checkeredblade",
    title: "The Voice of a Thousand Faces",
    lore: "Nobody knows which character will appear next.",
    rarity: "Epic",
    class: "Rogue",
    category: "Comedy",
    reference: "Anders Matthesen's many characters."
  },

  {
    person: "Ove Sprogøe",
    legendName: "Ove Egonbane",
    title: "Master of the Diamond Heist",
    lore: "The plan was perfect. Until Benny touched something.",
    rarity: "Legendary",
    class: "Rogue",
    category: "Film",
    reference: "Egon Olsen and Olsen-banden."
  },

  {
    person: "Dirch Passer",
    legendName: "Dirch Passerbane",
    title: "The Jester King",
    lore: "His laughter could stun an entire raid.",
    rarity: "Legendary",
    class: "Bard",
    category: "Comedy",
    reference: "Danish comedy legend."
  },

  {
    person: "Frank Hvam",
    legendName: "Frank Hammerslam",
    title: "The Reluctant Berserker",
    lore: "He never wanted the fight. Somehow he always ended up in it.",
    rarity: "Epic",
    class: "Warrior",
    category: "Comedy",
    reference: "Frank Hvam and Danish comedy."
  },

  {
    person: "Rune Klan",
    legendName: "Rune Klanlock",
    title: "Master of Forbidden Tricks",
    lore: "Nobody understands his magic. Not even Rune.",
    rarity: "Epic",
    class: "Warlock",
    category: "Comedy",
    reference: "Danish magician and comedian."
  },

  {
    person: "Ulf Pilgaard",
    legendName: "Ulf Killgaard",
    title: "King of the Roast",
    lore: "One sentence was enough to destroy an entire party.",
    rarity: "Legendary",
    class: "Warlock",
    category: "Comedy",
    reference: "Danish actor and comedian."
  },

  {
    person: "Jacob Haugaard",
    legendName: "Jacob Haugard",
    title: "The Mad Bard of Jylland",
    lore: "He promised sunshine, good weather and an army of confused warriors.",
    rarity: "Epic",
    class: "Bard",
    category: "Meme",
    reference: "Jacob Haugaard's famous political campaign."
  },

  {
    person: "Niels Hausgaard",
    legendName: "Niels Houseguard",
    title: "Bard of the Northern Realm",
    lore: "His songs travel farther than any messenger.",
    rarity: "Epic",
    class: "Bard",
    category: "Music",
    reference: "Danish singer and storyteller."
  },

  {
    person: "Anders Hemmingsen",
    legendName: "Anders Memehammer",
    title: "Lord of the Viral Horde",
    lore: "No meme survives his attention.",
    rarity: "Epic",
    class: "Rogue",
    category: "Meme",
    reference: "Known for Danish internet memes and viral content."
  },

  {
    person: "Bjørn Hajk",
    legendName: "Bjørn Shambashade",
    title: "Warlord of the Meme Jungle",
    lore: "The jungle remembers his name.",
    rarity: "Rare",
    class: "Hunter",
    category: "Meme",
    reference: "Danish internet meme reference."
  }
];

// =========================
// DANISH LEGEND FUNCTIONS
// =========================

function randomLegend() {
  return DANISH_LEGENDS[
    Math.floor(Math.random() * DANISH_LEGENDS.length)
  ];
}

function rarityEmoji(rarity) {
  const emojis = {
    Common: "⚪",
    Uncommon: "🟢",
    Rare: "🔵",
    Epic: "🟣",
    Legendary: "🟠",
    Mythic: "🔴"
  };

  return emojis[rarity] ?? "⚪";
}

function legendEmbed(legend) {
  return new EmbedBuilder()
    .setTitle("🇩🇰 ⚔️ DANISH LEGENDS ⚔️ 🇩🇰")
    .setDescription(
      `A new legend has been summoned...\n\n` +
      `# **${legend.legendName.toUpperCase()}**\n\n` +
      `*${legend.title}*\n\n` +
      `> "${legend.lore}"`
    )
    .addFields(
      {
        name: "⚔️ Class",
        value: `**${legend.class}**`,
        inline: true
      },
      {
        name: `${rarityEmoji(legend.rarity)} Rarity`,
        value: `**${legend.rarity}**`,
        inline: true
      },
      {
        name: "📜 Category",
        value: `**${legend.category}**`,
        inline: true
      },
      {
        name: "🇩🇰 Original Legend",
        value: legend.person,
        inline: true
      },
      {
        name: "🔎 Reference",
        value: legend.reference,
        inline: false
      }
    )
    .setFooter({
      text: "WoW Forever • Danish Legends"
    })
    .setTimestamp();
}

function legendButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("danishlegend:again")
      .setLabel("🎲 Generate Again")
      .setStyle(ButtonStyle.Primary)
  );
}

// =========================
// COMMANDS
// =========================

const commands = [
  new SlashCommandBuilder()
    .setName("challenge")
    .setDescription("Manage Ugens Udfordring")
    .addSubcommand(s =>
      s
        .setName("create")
        .setDescription("Opret en ny challenge")
        .addStringOption(o =>
          o
            .setName("name")
            .setDescription("Challenge-navn")
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName("description")
            .setDescription("Beskrivelse")
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o
            .setName("timer")
            .setDescription("Hvor mange timer")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(720)
        )
    )
    .addSubcommand(s =>
      s
        .setName("finish")
        .setDescription("Afslut den aktive challenge")
    )
    .addSubcommand(s =>
      s
        .setName("status")
        .setDescription("Se den aktive challenge")
    ),

  new SlashCommandBuilder()
    .setName("submit")
    .setDescription("Indsend eller opdater din score")
    .addIntegerOption(o =>
      o
        .setName("score")
        .setDescription("Din score")
        .setRequired(true)
        .setMinValue(0)
    )
    .addStringOption(o =>
      o
        .setName("proof")
        .setDescription("Valgfri dokumentation")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Se leaderboardet"),

  new SlashCommandBuilder()
    .setName("danishlegend")
    .setDescription("Summon en tilfældig dansk WoW-legende")
];

// =========================
// CHALLENGE FUNCTIONS
// =========================

function active(guildId) {
  return Object.values(data.challenges).find(
    c => c.guildId === guildId && c.active
  );
}

function embed(c) {
  const t = Math.floor(c.endsAt / 1000);

  return new EmbedBuilder()
    .setTitle(`⚔️ ${c.name}`)
    .setDescription(c.description)
    .addFields(
      {
        name: "⏰ Slutter",
        value: `<t:${t}:F> (<t:${t}:R>)`
      },
      {
        name: "🏆 Deltagere",
        value: String(Object.keys(c.entries).length),
        inline: true
      }
    )
    .setFooter({
      text: "WoW Forever • 4780 Stege"
    });
}

function buttons(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`join:${id}`)
      .setLabel("🏆 Deltag")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`scores:${id}`)
      .setLabel("📊 Se stilling")
      .setStyle(ButtonStyle.Secondary)
  );
}

function winner(c) {
  return (
    Object.values(c.entries ?? {})
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.updatedAt ?? 0) - (b.updatedAt ?? 0)
      )[0] ?? null
  );
}

// =========================
// CHAMPION
// =========================

async function awardChampion(guild, win) {
  let role = guild.roles.cache.find(
    r =>
      r.name.toLowerCase() ===
      CHAMPION_ROLE_NAME.toLowerCase()
  );

  if (!role) {
    role = await guild.roles.create({
      name: CHAMPION_ROLE_NAME,
      reason: "Ugens Udfordring champion role"
    });
  }

  for (const [, member] of guild.members.cache.filter(
    m => m.roles.cache.has(role.id)
  )) {
    if (member.id !== win.userId) {
      try {
        await member.roles.remove(
          role,
          "Ny Champion of Stege"
        );
      } catch (e) {
        console.error("Role remove:", e.message);
      }
    }
  }

  const member = await guild.members
    .fetch(win.userId)
    .catch(() => null);

  if (!member) return null;

  try {
    await member.roles.add(
      role,
      "Vinder af Ugens Udfordring"
    );

    data.currentChampionId = member.id;

    return member;
  } catch (e) {
    console.error("Role add:", e.message);
    return null;
  }
}

// =========================
// HALL OF FAME
// =========================

async function hallOfFame(guild, c, win, member) {
  const channel = guild.channels.cache.find(
    ch =>
      ch.isTextBased() &&
      ch.name.toLowerCase() ===
        HALL_OF_FAME_CHANNEL_NAME
  );

  if (!channel) return;

  const name = member?.displayName ?? win.username;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🏆 HALL OF FAME")
        .setDescription(`**${c.name}**`)
        .addFields(
          {
            name: "🥇 Mester",
            value: `**${name}**`,
            inline: true
          },
          {
            name: "⚔️ Score",
            value: `**${win.score}**`,
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({
          text: "WoW Forever • 4780 Stege"
        })
    ]
  });
}

// =========================
// FINISH CHALLENGE
// =========================

async function finish(c, guild, channel) {
  if (!c || !c.active) return;

  c.active = false;
  c.finishedAt = Date.now();

  const win = winner(c);

  if (!win) {
    if (channel) {
      await channel.send(
        "🏁 Challengen er afsluttet, men der var ingen deltagere."
      );
    }

    saveData();
    return;
  }

  const member = await awardChampion(guild, win);
  const name = member?.displayName ?? win.username;

  if (channel) {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏆 UGENS UDFORDRING ER AFSLUTTET!")
          .setDescription(
            `🥇 **${name}** vinder **${c.name}** med **${win.score}** point!`
          )
          .setFooter({
            text: "👑 Champion of Stege"
          })
          .setTimestamp()
      ]
    });
  }

  data.hallOfFame.push({
    challengeId: c.id,
    guildId: c.guildId,
    name: c.name,
    winnerId: win.userId,
    winnerName: win.username,
    score: win.score,
    finishedAt: c.finishedAt
  });

  saveData();

  try {
    await hallOfFame(guild, c, win, member);
  } catch (e) {
    console.error("Hall of Fame:", e.message);
  }
}

// =========================
// READY
// =========================

client.once("clientReady", c => {
  console.log(`Logged in as ${c.user.tag}`);
});

// =========================
// INTERACTIONS
// =========================

client.on("interactionCreate", async i => {
  try {

    // =======================
    // SLASH COMMANDS
    // =======================

    if (i.isChatInputCommand()) {

      if (!i.guildId) {
        return i.reply({
          content:
            "Denne bot kan kun bruges på en Discord-server.",
          ephemeral: true
        });
      }

      // =====================
      // DANISH LEGEND
      // =====================

      if (i.commandName === "danishlegend") {
        const legend = randomLegend();

        return i.reply({
          embeds: [legendEmbed(legend)],
          components: [legendButtons()]
        });
      }

      // =====================
      // CHALLENGE
      // =====================

      if (i.commandName === "challenge") {

        const sub = i.options.getSubcommand();

        if (sub === "create") {

          if (active(i.guildId)) {
            return i.reply({
              content:
                "Der er allerede en aktiv challenge.",
              ephemeral: true
            });
          }

          const name = i.options.getString(
            "name",
            true
          );

          const description = i.options.getString(
            "description",
            true
          );

          const hours = i.options.getInteger(
            "timer",
            true
          );

          const id =
            `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`;

          const c = {
            id,
            guildId: i.guildId,
            name,
            description,
            createdAt: Date.now(),
            endsAt:
              Date.now() + hours * 3600000,
            active: true,
            entries: {}
          };

          data.challenges[id] = c;

          saveData();

          return i.reply({
            embeds: [embed(c)],
            components: [buttons(id)]
          });
        }

        if (sub === "status") {

          const c = active(i.guildId);

          if (!c) {
            return i.reply({
              content:
                "Der er ingen aktiv challenge lige nu.",
              ephemeral: true
            });
          }

          return i.reply({
            embeds: [embed(c)],
            components: [buttons(c.id)]
          });
        }

        if (sub === "finish") {

          const c = active(i.guildId);

          if (!c) {
            return i.reply({
              content:
                "Der er ingen aktiv challenge.",
              ephemeral: true
            });
          }

          await i.deferReply();

          await finish(
            c,
            i.guild,
            i.channel
          );

          return i.editReply(
            "🏁 Challengen er afsluttet."
          );
        }
      }

      // =====================
      // SUBMIT
      // =====================

      if (i.commandName === "submit") {

        const c = active(i.guildId);

        if (!c) {
          return i.reply({
            content:
              "Der er ingen aktiv challenge lige nu.",
            ephemeral: true
          });
        }

        const score = i.options.getInteger(
          "score",
          true
        );

        const proof =
          i.options.getString("proof") ?? "";

        c.entries[i.user.id] = {
          userId: i.user.id,
          username: i.user.username,
          score,
          proof,
          updatedAt: Date.now()
        };

        saveData();

        return i.reply({
          content:
            `✅ Din score er registreret: **${score}** point.`,
          ephemeral: true
        });
      }

      // =====================
      // LEADERBOARD
      // =====================

      if (i.commandName === "leaderboard") {

        const c = active(i.guildId);

        if (!c) {
          return i.reply({
            content:
              "Der er ingen aktiv challenge lige nu.",
            ephemeral: true
          });
        }

        const list = Object.values(
          c.entries
        )
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        const text = list.length
          ? list
              .map(
                (e, n) =>
                  `**${n + 1}.** ${e.username} — **${e.score}**`
              )
              .join("\n")
          : "Ingen scores endnu.";

        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`📊 ${c.name}`)
              .setDescription(text)
              .setFooter({
                text: "WoW Forever • 4780 Stege"
              })
          ]
        });
      }
    }

    // =========================
    // BUTTONS
    // =========================

    if (i.isButton()) {

      // Danish Legend button
      if (i.customId === "danishlegend:again") {

        const legend = randomLegend();

        return i.update({
          embeds: [legendEmbed(legend)],
          components: [legendButtons()]
        });
      }

      // Challenge buttons
      const [action, id] =
        i.customId.split(":");

      const c = data.challenges[id];

      if (!c) {
        return i.reply({
          content:
            "Denne challenge findes ikke længere.",
          ephemeral: true
        });
      }

      if (!c.active) {
        return i.reply({
          content:
            "Denne challenge er allerede afsluttet.",
          ephemeral: true
        });
      }

      if (action === "join") {

        if (!c.entries[i.user.id]) {

          c.entries[i.user.id] = {
            userId: i.user.id,
            username: i.user.username,
            score: 0,
            proof: "",
            updatedAt: Date.now()
          };
        }

        saveData();

        return i.reply({
          content:
            "⚔️ Du er med! Brug `/submit` for at indsende din score.",
          ephemeral: true
        });
      }

      if (action === "scores") {

        const list = Object.values(
          c.entries
        )
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        const text = list.length
          ? list
              .map(
                (e, n) =>
                  `**${n + 1}.** ${e.username} — **${e.score}**`
              )
              .join("\n")
          : "Ingen scores endnu.";

        return i.reply({
          content:
            `📊 **${c.name}**\n\n${text}`,
          ephemeral: true
        });
      }
    }

  } catch (e) {

    console.error(
      "Interaction error:",
      e
    );

    if (
      i.isRepliable() &&
      !i.replied &&
      !i.deferred
    ) {
      await i.reply({
        content:
          "Der opstod en fejl. Tjek Render-loggen.",
        ephemeral: true
      });
    }
  }
});

// =========================
// AUTOMATIC CHALLENGE FINISH
// =========================

setInterval(async () => {

  for (const c of Object.values(
    data.challenges
  )) {

    if (
      !c.active ||
      c.endsAt > Date.now()
    ) {
      continue;
    }

    try {

      const guild =
        client.guilds.cache.get(
          c.guildId
        );

      if (!guild) {

        console.warn(
          `Skipping challenge ${c.id}: guild ${c.guildId} is no longer available to this bot.`
        );

        c.active = false;
        c.finishedAt = Date.now();

        saveData();

        continue;
      }

      const channel =
        guild.channels.cache.find(
          ch =>
            ch.isTextBased() &&
            ch.name
              .toLowerCase()
              .includes("ugens-udfordring")
        );

      await finish(
        c,
        guild,
        channel
      );

    } catch (e) {

      console.error(
        `Could not finish challenge ${c.id}:`,
        e.message
      );
    }
  }

}, 60000);

// =========================
// START BOT
// =========================

(async () => {

  try {

    await client.login(TOKEN);

    await client.application.commands.set(
      commands
    );

    console.log(
      "Slash commands registered successfully."
    );

  } catch (e) {

    console.error(
      "Bot startup failed:",
      e
    );

    process.exit(1);
  }

})();
