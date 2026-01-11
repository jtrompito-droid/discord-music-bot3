import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from "@discordjs/voice";
import { exec } from "child_process";
import ffmpeg from "ffmpeg-static";

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play any song")
    .addStringOption(option =>
      option.setName("song")
        .setDescription("Song name or link")
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("Slash command registered");
})();

client.once("ready", () => {
  console.log("Bot is online!");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "play") {
    const song = interaction.options.getString("song");
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply("Join a voice channel first!");
    await interaction.reply(`🎵 Playing: **${song}**`);

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator
    });

    const stream = exec(`yt-dlp -o - "${song}" | ffmpeg -i pipe:0 -f s16le -ar 48000 -ac 2 pipe:1`);
    const resource = createAudioResource(stream.stdout);
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => connection.destroy());
  }
});

client.login(TOKEN);
