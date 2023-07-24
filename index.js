/* eslint-disable max-len */
const fs = require('node:fs');
const path = require('node:path');
const {Client, Collection, Events,
  GatewayIntentBits, ActivityType} = require('discord.js');
const {token} = require('./config.json');

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.MessageContent],
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file
      .endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
    else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  }
  catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({content: 'Something tripped me up and I cannot build a report. Please contact Mr. <@148331191555063808> if you feel this is a mistake.', ephemeral: true});
    }
    else {
      await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
    }
  }
});

// let guild;

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  guild = client.guilds.cache.first();
  client.user.setActivity('over camps 🏕️', {type: ActivityType.Watching} );
  // guild.channels.cache.find(chan => chan.id === '1099469368506724413')
  // .send("What's up fuckers... I live!");
});

/*
client.on(Events.MessageCreate, (m) => {
  if (m.channelId === '1098844482155327588') {
    m.fetch().then((m) => {
      // console.log('booger');
    });
    console.log(`Message sent on charlie-logs: ${m.embeds[0].data.description}`);
  }
});
*/
// Log in to Discord with your client's token
client.login(token);
