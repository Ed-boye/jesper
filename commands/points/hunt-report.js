/* eslint-disable max-len */
const {SlashCommandBuilder} = require('discord.js');

const DEV_GUILD = '1098844083629342805';
const PROD_GUILD = '1045200295476592711';

const Camps = {
  alpha: {
    name: 'Alpha',
    cmd: '0',
    guildId: PROD_GUILD,
    webhookChannelId: '0'},
  bravo: {
    name: 'Bravo',
    cmd: '1',
    guildId: PROD_GUILD,
    webhookChannelId: '0'},
  charlie: {
    name: 'Charlie',
    cmd: '2',
    guildId: DEV_GUILD,
    webhookChannelId: '1098844482155327588'},
  delta: {
    name: 'Delta',
    cmd: '3',
    guildId: PROD_GUILD,
    webhookChannelId: '0'},
  echo: {
    name: 'Echo',
    cmd: '4',
    guildId: DEV_GUILD,
    webhookChannelId: '1099852489609723904'},
};

/*
const commandChoices = [
  {name: Camps.charlie.name, value: Camps.charlie.cmd},
  {name: Camps.echo.name, value: Camps.echo.cmd},
];
*/

const IS_EPHEMERAL = true;
const CAP_PAYMENT = true;
const CURRENT_WEEK_CMD = 'current-week';
const PAST_WEEK_CMD = 'past-week';
const CAMP_OPTION = 'camp';

module.exports = {
  cooldown: 120, // 2 minute cooldown
  data: new SlashCommandBuilder()
      .setName('report')
      .setDescription('Request hunting report for all hunters')
      .addSubcommand((subcommand) =>
        subcommand
            .setName(CURRENT_WEEK_CMD)
            .setDescription('Request a camp materials report for the current week')
            .addStringOption((option) =>
              option.setName(CAMP_OPTION)
                  .setDescription('The camp to generate a report for')
                  .setRequired(true)
                  .addChoices(
                      {name: Camps.charlie.name, value: Camps.charlie.cmd},
                      {name: Camps.echo.name, value: Camps.echo.cmd},
                  )))
      .addSubcommand((subcommand) =>
        subcommand
            .setName(PAST_WEEK_CMD)
            .setDescription('Request a full materials report for the previous week')
            .addStringOption((option) =>
              option.setName(CAMP_OPTION)
                  .setDescription('The camp to generate a report for')
                  .setRequired(true)
                  .addChoices(
                      {name: Camps.charlie.name, value: Camps.charlie.cmd},
                      {name: Camps.echo.name, value: Camps.echo.cmd},
                  ))),

  async execute(interaction) {
    // Reply to the command so avoid timeout and notify user the bot is working on the command
    await interaction.deferReply({ephemeral: IS_EPHEMERAL});

    // let guild = interaction.client.guilds.cache.first();
    // TODO: Implement  specific guild to fetch from
    const messageManagers = [];
    messageManagers.push(
        // interaction.guild.channels.cache.find((chan) => chan.id === Camps.alpha.webhookChannelId), // 0
        // interaction.guild.channels.cache.find((chan) => chan.id === Camps.bravo.webhookChannelId), // 1
        interaction.guild.channels.cache.find((chan) => chan.id === Camps.charlie.webhookChannelId), // 2
        // interaction.guild.channels.cache.find((chan) => chan.id === Camps.delta.webhookChannelId), // 3
        interaction.guild.channels.cache.find((chan) => chan.id === Camps.echo.webhookChannelId), // 4
        // TODO: Will this trailing comma fuck me up?
    );

    console.log(`Call from ${interaction.user.username}.`);

    const today = new Date();
    const currentCutoffDate = new Date(today);
    currentCutoffDate.setHours(0);
    currentCutoffDate.setMinutes(0);
    currentCutoffDate.setSeconds(0);

    /*
    const pastCutoffDate = new Date(currentCutoffDate);
    pastCutoffDate.setHours(0);
    pastCutoffDate.setMinutes(0);
    pastCutoffDate.setSeconds(0);
    */

    // #region Date offset calculations
    switch (today.getDate()) {
      case 0: // Sunday
        currentCutoffDate.setDate(today.getDate() - 2);
        break;
      case 1: // Monday
        currentCutoffDate.setDate(today.getDate() - 3);
        break;
      case 2: // Tuesday
        currentCutoffDate.setDate(today.getDate() - 4);
        break;
      case 3: // Wednesday
        currentCutoffDate.setDate(today.getDate() - 5);
        break;
      case 4: // Thursday
        currentCutoffDate.setDate(today.getDate() - 6);
        break;
      case 5: // Friday
        currentCutoffDate.setDate(today.getDate());
        break;
      case 6: // Saturday
        currentCutoffDate.setDate(today.getDate() - 1);
        break;
      default:
        console.log('Somehow today is not Monday - Sunday in date check logic...');
    }
    // Set the past cutoff to be 7 days before current cutoff
    const pastCutoffDate = new Date(currentCutoffDate);
    pastCutoffDate.setDate(pastCutoffDate.getDate() - 7);
    // #endregion

    // #region reportd range calculations
    let upperBound;
    let lowerBound;
    if (interaction.options.getSubcommand() == CURRENT_WEEK_CMD) {
      upperBound = new Date(today);
      lowerBound = new Date(currentCutoffDate);
    }
    else if (interaction.options.getSubcommand() == PAST_WEEK_CMD) {
      upperBound = new Date(currentCutoffDate);
      lowerBound = new Date(pastCutoffDate);
    }
    else {
      console.log('Something went wrong with setting upper and lower bounds');
      return;
    }
    // #endregion

    // const hitLowerBound = false;
    // let allMessages = new Collection();
    // const huntLog = [];
    const campForReport = parseInt(interaction.options.getString(CAMP_OPTION));
    const materialLog = new Map();
    const supplyLog = new Map();
    let totalMsgCount = 0;

    /* Old Date Code
    // Set date bounds for fetching messages
    let upperBound = new Date(); // TODO: change back to const
    let lowerBound = new Date(); // TODO: change back to const
    const day = lowerBound.getDay();
    // const diff = (day <= 5) ? (7 - 5 + day ) : (day - 5);
    const diff = 7 - 5 + day;

    lowerBound.setDate(lowerBound.getDate() - diff);
    lowerBound.setHours(0);
    lowerBound.setMinutes(0);
    lowerBound.setSeconds(0);

    upperBound.setDate(lowerBound.getDate() + 7);
    upperBound.setHours(0);
    upperBound.setMinutes(0);
    upperBound.setSeconds(0);

    // lowerBound = new Date('2023-04-21, 00:00:00');
    // upperBound = new Date('2023-04-28, 00:00:00');

    lowerBound = new Date('2023-04-28, 00:00:00');
    upperBound = new Date();
    */

    const DONATION_KEY = 'Donated';
    let foundStart = false;
    let foundEnd = false;
    let batch;
    let lastMessageId;
    let filteredBatch;
    // let miloMessages = 0;

    // Ask Discord for the latest 100 messages
    batch = await messageManagers[campForReport].messages
        .fetch({limit: 100, cache: true});

    while (!foundStart && !foundEnd) {
      lastMessageId = batch.last().id; // Save ID of last message to use for next fetch
      totalMsgCount = totalMsgCount + batch.size;

      // Look for any messages that match criteria
      filteredBatch = batch.filter((message) =>
        message.embeds[0].description.includes(DONATION_KEY) &&
        message.createdAt < upperBound && message.createdAt >= lowerBound);

      // Check if any messages were found based on criteria above
      if (filteredBatch.size > 0) {
        // The start is somewhere in this batch
        foundStart = true;

        while (!foundEnd) {
          // Process it
          if (filteredBatch.size > 0) {
            filteredBatch.each((message) => {
              const entry = message.embeds[0].description
                  .match(/[+-]?\d+(\.\d+)?/g);

              if (materialLog.has(entry[1])) {
                materialLog.set(entry[1], materialLog.get(entry[1]) + parseFloat(entry[0]));
              }
              else {
                materialLog.set(entry[1], parseFloat(entry[0]));
              }
              // if (entry[1] == '444298340079763467') {miloMessages++;}
            });

            batch = await messageManagers[campForReport].messages
                .fetch({
                  limit: 100,
                  cache: true,
                  before: lastMessageId,
                });

            // TODO: probably a better way to handle this...
            // TODO: avoid getting an empty fetch at the end.
            if (batch.size == 0) {
              foundEnd = true;
              break;
            }

            lastMessageId = batch.last().id; // Save ID of last message to use for next fetch
            totalMsgCount = totalMsgCount + batch.size;

            filteredBatch = batch.filter((message) =>
              message.embeds[0].description.includes(DONATION_KEY) &&
              message.createdAt < upperBound && message.createdAt >= lowerBound);
          }
          else {
            foundEnd = true;
          }
        }
      }
      else {
        // No messages matching criteria found, fetch 100 more
        batch = await messageManagers[campForReport].messages.fetch({
          limit: 100,
          cache: true,
          before: lastMessageId,
        });
        lastMessageId = batch.last().id; // Save ID of last message to use for next fetch
      }
    }

    /* Old Code Below....

    // Get starting batch of messages
    let batch = await messageManagers[parseInt(interaction.options.getString('camp'))].messages
        .fetch({limit: 100, cache: true});

    let lastMessageId = batch.last().id;

    totalMsgCount = totalMsgCount + batch.size;

    // Process first 100 messages
    batch.filter((message) =>
      message.embeds[0].description.includes('Materials added:') &&
      message.createdAt < upperBound)
        .each((message) => {
          const entry = message.embeds[0].description
              .match(/[+-]?\d+(\.\d+)?/g);

          if (materialLog.has(entry[1])) {
            materialLog.set(entry[1], materialLog.get(entry[1]) + parseFloat(entry[0]));
          }
          else {
            materialLog.set(entry[1], parseFloat(entry[0]));
          }

          // huntLog.push();
        });

    while (!hitLowerBound) {
      if (batch.last().createdAt >= lowerBound) {
        totalMsgCount = totalMsgCount + batch.size;

        // Process additional messages
        batch.filter((message) =>
          message.embeds[0].description.includes('Materials added:') &&
          message.createdAt < upperBound)
            .each((message) => {
              const entry = message.embeds[0].description
                  .match(/[+-]?\d+(\.\d+)?/g);

              if (materialLog.has(entry[1])) {
                materialLog.set(entry[1], materialLog.get(entry[1]) + parseFloat(entry[0]));
              }
              else {
                materialLog.set(entry[1], parseFloat(entry[0]));
              }
            });

        // Load more messages to process
        batch = await messageManagers[parseInt(interaction.options.getString('camp'))].messages.fetch({
          limit: 100,
          cache: true,
          before: lastMessageId,
        });

        // TODO: probably a better way to handle this... avoid getting an empty fetch at the end.
        if (batch.size == 0) {
          hitLowerBound = true;
          break;
        }

        lastMessageId = batch.last().id;
      }
      else { // The lower limit is in this batch and should be the last processed
        // TODO confirm this actually works, rn ending in if above
        hitLowerBound = true;
        totalMsgCount = totalMsgCount + batch.size;
        batch.filter((message) =>
          message.embeds[0].description.includes('Materials added:') &&
          message.createdAt >= lowerBound)
            .each((message) => {
              const entry = message.embeds[0].description
                  .match(/[+-]?\d+(\.\d+)?/g);

              if (materialLog.has(entry[1])) {
                materialLog.set(entry[1], materialLog.get(entry[1]) + parseFloat(entry[0]));
              }
              else {
                materialLog.set(entry[1], parseFloat(entry[0]));
              }

              // huntLog.push();
            });
      }
    }
    */

    /* // Initial fetch method using huntLog array.
    batch.filter((message) => message.embeds[0].description.includes('Materials added:'))
        .each((message) => huntLog.push(message.embeds[0].description
          .match(/[+-]?\d+(\.\d+)?/g)));
    */

    // Create the report
    let huntReport = '';
    let totalPayout = 0;
    const huntRerpotData = Array.from(materialLog);

    huntRerpotData.forEach((entry) => {
      if (CAP_PAYMENT && entry[1].toFixed(2) > 500 ) {entry[1] = 500;}
      huntReport = huntReport + `<@${entry[0]}>: ` + `${entry[1].toFixed(2)} pts. / ` + `$${entry[1].toFixed(2) * 5}\n`;
      totalPayout = totalPayout + entry[1].toFixed(2) * 5;
    });

    // Reply with the report
    await interaction.editReply({
      content: `I've compiled the materials report you requested.  :saluting_face:` +
      '\n\n' + `Report between <t:${Math.floor(lowerBound.getTime() / 1000)}:f> and ` +
      `<t:${Math.floor(upperBound.getTime() / 1000)}:f>:` +
      // `a total of ${totalMsgCount} camp webhook entries were found.` +
      '\n\n' + `${huntReport}` +
      '\n' + `Total expected payout: $${totalPayout}*\n*does not take into account 500 point cap`,
      ephemeral: IS_EPHEMERAL,
    });

    console.log(`Total webhooks processed ${totalMsgCount}` +
    `Camp: ${interaction.options.getString(CAMP_OPTION)} \n` +
    `Command: ${interaction.options.getSubcommand()}`);

    // interaction.guild.
  },
};
