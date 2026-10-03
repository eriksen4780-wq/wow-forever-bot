import "dotenv/config";
import {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} from "discord.js";
import fs from "node:fs";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID");
  process.exit(1);
}

const DATA_FILE = "./data.json";
let data = { challenges: {} };
if (fs.existsSync(DATA_FILE)) {
  try { data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch {}
}
function save(){ fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2)); }

const commands = [
  new SlashCommandBuilder()
    .setName("challenge")
    .setDescription("Administrer Ugens Udfordring")
    .addSubcommand(s=>s.setName("create").setDescription("Opret en udfordring")
      .addStringOption(o=>o.setName("navn").setDescription("Navn på udfordringen").setRequired(true))
      .addStringOption(o=>o.setName("beskrivelse").setDescription("Hvad skal spillerne gøre?").setRequired(true))
      .addIntegerOption(o=>o.setName("timer").setDescription("Hvor mange timer varer den?").setRequired(true).setMinValue(1).setMaxValue(720)))
    .addSubcommand(s=>s.setName("finish").setDescription("Afslut den aktive udfordring"))
    .addSubcommand(s=>s.setName("status").setDescription("Se den aktive udfordring"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("submit")
    .setDescription("Indsend dit resultat til den aktive udfordring")
    .addIntegerOption(o=>o.setName("score").setDescription("Dit resultat/score").setRequired(true).setMinValue(0))
    .addStringOption(o=>o.setName("bevis").setDescription("Kort beskrivelse eller screenshot-link").setRequired(false)),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Vis stillingen i den aktive udfordring")
].map(c=>c.toJSON());

const rest = new REST({version:"10"}).setToken(TOKEN);
await rest.put(Routes.applicationCommands(CLIENT_ID), {body:commands});

const client = new Client({intents:[GatewayIntentBits.Guilds]});

function active(guildId){
  return Object.values(data.challenges).find(c=>c.guildId===guildId && c.active);
}
function embed(c){
  const end = Math.floor(new Date(c.endsAt).getTime()/1000);
  return new EmbedBuilder()
    .setTitle(`⚔️ ${c.name}`)
    .setDescription(c.description)
    .addFields(
      {name:"⏰ Slutter",value:`<t:${end}:F> (<t:${end}:R>)`,inline:false},
      {name:"🏆 Deltagere",value:String(Object.keys(c.entries).length),inline:true}
    )
    .setFooter({text:"WoW Forever • 4780 Stege"});
}
function winnerText(c){
  const entries=Object.values(c.entries).sort((a,b)=>b.score-a.score);
  if(!entries.length) return "Ingen resultater blev indsendt.";
  const top=entries[0];
  return `🏆 **${top.username}** vinder med **${top.score}** point!`;
}

client.once("ready",()=>console.log(`Logged in as ${client.user.tag}`));

client.on("interactionCreate", async i=>{
  if(!i.isChatInputCommand()) return;
  const guildId=i.guildId;
  if(!guildId) return i.reply({content:"Denne bot virker kun på en server.",ephemeral:true});

  if(i.commandName==="challenge"){
    const sub=i.options.getSubcommand();

    if(sub==="create"){
      const existing=active(guildId);
      if(existing) return i.reply({content:"Der er allerede en aktiv udfordring. Afslut den først.",ephemeral:true});
      const id=Date.now().toString();
      const hours=i.options.getInteger("timer");
      const c={
        id,guildId,active:true,
        name:i.options.getString("navn"),
        description:i.options.getString("beskrivelse"),
        endsAt:new Date(Date.now()+hours*3600000).toISOString(),
        entries:{}
      };
      data.challenges[id]=c; save();

      const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`join:${id}`).setLabel("🏆 Deltag").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`scores:${id}`).setLabel("📊 Se stilling").setStyle(ButtonStyle.Secondary)
      );
      return i.reply({content:"",embeds:[embed(c)],components:[row]});
    }

    if(sub==="status"){
      const c=active(guildId);
      return i.reply(c ? {embeds:[embed(c)]} : {content:"Der er ingen aktiv udfordring."});
    }

    if(sub==="finish"){
      const c=active(guildId);
      if(!c) return i.reply({content:"Der er ingen aktiv udfordring.",ephemeral:true});
      c.active=false; c.finishedAt=new Date().toISOString(); save();
      return i.reply({embeds:[
        new EmbedBuilder().setTitle("🏆 UGENS UDFORDRING ER AFSLUTTET")
          .setDescription(winnerText(c))
          .setFooter({text:"WoW Forever • 4780 Stege"})
      ]});
    }
  }

  if(i.commandName==="submit"){
    const c=active(guildId);
    if(!c) return i.reply({content:"Der er ingen aktiv udfordring.",ephemeral:true});
    if(new Date(c.endsAt)<=new Date()) return i.reply({content:"Tiden er udløbet. Vent på, at botten kårer vinderen.",ephemeral:true});
    const score=i.options.getInteger("score");
    const proof=i.options.getString("bevis")||"";
    c.entries[i.user.id]={userId:i.user.id,username:i.user.displayName,score,proof,updatedAt:new Date().toISOString()};
    save();
    return i.reply({content:`✅ Dit resultat er registreret: **${score}** point.`,ephemeral:true});
  }

  if(i.commandName==="leaderboard"){
    const c=active(guildId);
    if(!c) return i.reply({content:"Der er ingen aktiv udfordring.",ephemeral:true});
    const entries=Object.values(c.entries).sort((a,b)=>b.score-a.score).slice(0,10);
    const text=entries.length ? entries.map((e,n)=>`${n+1}. **${e.username}** — ${e.score} point`).join("\n") : "Ingen resultater endnu.";
    return i.reply({embeds:[new EmbedBuilder().setTitle(`🏆 ${c.name} – stilling`).setDescription(text)]});
  }
});

client.on("interactionCreate", async i=>{
  if(!i.isButton()) return;
  const [action,id]=i.customId.split(":");
  const c=data.challenges[id];
  if(!c || !c.active) return i.reply({content:"Denne udfordring er ikke længere aktiv.",ephemeral:true});
  if(action==="join"){
    c.entries[i.user.id] ||= {userId:i.user.id,username:i.user.displayName,score:0,proof:"",updatedAt:new Date().toISOString()};
    save();
    return i.reply({content:"⚔️ Du er med! Brug `/submit` for at indsende dit resultat.",ephemeral:true});
  }
  if(action==="scores"){
    const entries=Object.values(c.entries).sort((a,b)=>b.score-a.score).slice(0,10);
    const text=entries.length ? entries.map((e,n)=>`${n+1}. **${e.username}** — ${e.score}`).join("\n") : "Ingen resultater endnu.";
    return i.reply({content:text,ephemeral:true});
  }
});

// Check deadlines every minute. After a restart, the saved end time is still used.
setInterval(async ()=>{
  for(const c of Object.values(data.challenges)){
    if(!c.active || new Date(c.endsAt)>new Date()) continue;
    c.active=false; c.finishedAt=new Date().toISOString(); save();
    try{
      const guild=await client.guilds.fetch(c.guildId);
      const channel=guild.channels.cache.find(ch=>ch.isTextBased() && ch.name.includes("ugens-udfordring"));
      if(channel){
        await channel.send({embeds:[new EmbedBuilder().setTitle("🏆 UGENS UDFORDRING ER AFSLUTTET").setDescription(winnerText(c)).setFooter({text:"WoW Forever • 4780 Stege"})]});
      }
    }catch(e){ console.error(e); }
  }
},60000);

client.login(TOKEN);
