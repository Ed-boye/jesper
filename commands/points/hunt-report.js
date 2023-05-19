/* eslint-disable max-len */
const {SlashCommandBuilder} = require('discord.js');

// const DEV_GUILD = '1098844083629342805';
// const PROD_GUILD = '1045200295476592711';

const CAMPS = [
  {
    name: 'Alpha',
    guildId: '1045200295476592711', // Prod
    webhookChannelId: '1055297577643425792'},
  {
    name: 'Bravo',
    guildId: '1045200295476592711', // Prod
    webhookChannelId: '1077410558686531664'},
  {
    name: 'Charlie',
    guildId: '1098844083629342805', // Dev
    webhookChannelId: '1098844482155327588'},
  {
    name: 'Delta',
    guildId: '1045200295476592711', // Prod
    webhookChannelId: '0'},
  {
    name: 'Echo',
    guildId: '1098844083629342805', // Dev
    webhookChannelId: '1099852489609723904'},
];

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
            .setDescription('Request a camp report for the current, ongoing week')
            .addStringOption((option) =>
              option.setName(CAMP_OPTION)
                  .setDescription('The camp to generate a report for')
                  .setRequired(true)
                  .addChoices(
                      {name: CAMPS[0].name, value: '0'},
                      {name: CAMPS[1].name, value: '1'},
                      {name: CAMPS[2].name, value: '2'},
                      {name: CAMPS[3].name, value: '3'},
                      {name: CAMPS[4].name, value: '4'},
                  )))
      .addSubcommand((subcommand) =>
        subcommand
            .setName(PAST_WEEK_CMD)
            .setDescription('Request a full camp report for the previous week')
            .addStringOption((option) =>
              option.setName(CAMP_OPTION)
                  .setDescription('The camp to generate a report for')
                  .setRequired(true)
                  .addChoices(
                      {name: CAMPS[0].name, value: '0'},
                      {name: CAMPS[1].name, value: '1'},
                      {name: CAMPS[2].name, value: '2'},
                      {name: CAMPS[3].name, value: '3'},
                      {name: CAMPS[4].name, value: '4'},
                  ))),
  async execute(interaction) {
    // Reply to the command so avoid timeout and notify user the bot is working on the command
    await interaction.deferReply({ephemeral: IS_EPHEMERAL});
    console.log(`\n${interaction.user.username} is calling at: ${new Date().toTimeString()}`);

    // Get the corresponding camp's MessageManager
    const campIndex = parseInt(interaction.options.getString(CAMP_OPTION));
    let messageManager;

    try {
      const guild = interaction.client.guilds.cache.find((g) =>
        g.id === CAMPS[campIndex].guildId);
      messageManager = await guild.channels.cache.find((c) =>
        c.id === CAMPS[campIndex].webhookChannelId);
      if (!messageManager) {throw new Error(`Couldn't get Message Manager`);};
    }
    catch (error) {
      await interaction.editReply(`I apologize, but I cannot run this report. ` +
      `Please contact Mr. <@148331191555063808> if you feel this is a mistake.`);
      console.log(error);
      return;
    }

    // #region Date offset calculations
    const today = new Date();
    const currentCutoffDate = new Date(today);
    currentCutoffDate.setHours(0);
    currentCutoffDate.setMinutes(0);
    currentCutoffDate.setSeconds(0);

    switch (today.getDay()) {
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

    // console.log(currentCutoffDate.setDate((today.getDay()+ 2) % 7));

    // Set the past cutoff to be 7 days before current cutoff
    const pastCutoffDate = new Date(currentCutoffDate);
    pastCutoffDate.setDate(pastCutoffDate.getDate() - 7);
    // #endregion

    // #region report range calculations
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

    const materialLog = new Map();
    const supplyLog = new Map();
    let totalMsgCount = 0;

    const MATERIALS_KEY = 'Donated'; // This will eventually break
    const SUPPLY_KEY = 'Delivered'; // This will too

    let foundStart = false;
    let foundEnd = false;
    let batch;
    let lastMessageId;
    let withinDatesBatch;
    let donationBatch;
    let supplyBatch;

    // Start Fetching
    // Ask Discord for the latest 100 messages
    batch = await messageManager.messages
        .fetch({limit: 100, cache: true});

    while (!foundStart && !foundEnd) {
      lastMessageId = batch.last().id; // Save ID of last message to use for next fetch
      totalMsgCount = totalMsgCount + batch.size;

      // Look for any messages that match criteria
      withinDatesBatch = batch.filter((message) =>
        message.createdAt < upperBound && message.createdAt >= lowerBound);

      // Check if any messages were found based on criteria above
      if (withinDatesBatch.size > 0) {
        // The start is somewhere in this batch
        foundStart = true;
        donationBatch = batch.filter((message) =>
          message.embeds[0].description.includes(MATERIALS_KEY));
        supplyBatch = batch.filter((message) =>
          message.embeds[0].description.includes(SUPPLY_KEY));

        while (!foundEnd) {
          // Process donation messages
          if (withinDatesBatch.size > 0) {
            donationBatch.each((message) => {
              const entry = message.embeds[0].description
                  .match(/[+-]?\d+(\.\d+)?/g);

              if (materialLog.has(entry[1])) {
                materialLog.set(entry[1], materialLog.get(entry[1]) + parseFloat(entry[0]));
              }
              else {
                materialLog.set(entry[1], parseFloat(entry[0]));
              }
            });
            // Process supply messages
            supplyBatch.each((message) => {
              const entry = message.embeds[0].description
                  .match(/[+-]?\d+(\.\d+)?/g);

              if (supplyLog.has(entry[1])) {
                supplyLog.set(entry[1], supplyLog.get(entry[1]) + parseFloat(entry[0]));
              }
              else {
                supplyLog.set(entry[1], parseFloat(entry[0]));
              }
            });

            // Get 100 more messages for the next date check
            batch = await messageManager.messages.fetch({
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

            withinDatesBatch = batch.filter((message) =>
              message.createdAt < upperBound && message.createdAt >= lowerBound);
            donationBatch = batch.filter((message) =>
              message.embeds[0].description.includes(MATERIALS_KEY));
            supplyBatch = batch.filter((message) =>
              message.embeds[0].description.includes(SUPPLY_KEY));
          }
          else {
            foundEnd = true;
          }
        }
      }
      else {
        // No messages matching criteria found, fetch 100 more
        batch = await messageManager.messages.fetch({
          limit: 100,
          cache: true,
          before: lastMessageId,
        });
        lastMessageId = batch.last().id; // Save ID of last message to use for next fetch
      }
    }

    // Create the Materials report
    let huntReport = '';
    let totalPayout = 0;
    const huntRerpotData = Array.from(materialLog);
    huntRerpotData.forEach((entry) => {
      if (CAP_PAYMENT && entry[1].toFixed(2) > 500 ) {entry[1] = 500;}
      huntReport = huntReport +
        `\t<@${entry[0]}>: ` +
        `$${entry[1].toFixed(2) * 5} for ` +
        `${entry[1].toFixed(2)} pts.\n`;
      totalPayout = totalPayout + entry[1].toFixed(2) * 5;
    });

    // Create the Supply report
    let supplyReport = '';
    let totalSupply = 0;
    const supplyReportData = Array.from(supplyLog);
    supplyReportData.forEach((entry) => {
      supplyReport = supplyReport + `<@${entry[0]}>: ` + `${entry[1].toFixed(0)}}\n`;
      totalSupply = totalSupply + entry[1].toFixed(0) * 1; // "* 1" Stupid
    });

    const campString = CAMPS[campIndex].name;
    const startDateString = `<t:${Math.floor(lowerBound.getTime() / 1000)}:f>`;
    const endDateString = `<t:${Math.floor(upperBound.getTime() / 1000)}:f>`;

    // Reply with the report
    await interaction.editReply({
      content: `<@${interaction.user.id}>, the report for **${campString} Camp** you requested ` +
      `is ready for your review. The date range for this report is as follows:` +
      `\n\n\tFrom ${startDateString} to ` + `${endDateString}` +
      `\n\nA total of **${totalSupply} supplies** were delivered and ` +
      `a breakdown of materials gathered and payment owed per hunter can be found below.` +
      `\n\n${huntReport}` +
      '\n' + `That's an estimated payout of $${totalPayout.toFixed(2)} for all camp members.`,
      ephemeral: IS_EPHEMERAL,
    });

    // Log a bunch of stuff
    console.log(`Total messages processed ${totalMsgCount} \n` +
    `Camp: ${campString} \n` +
    `Command: ${interaction.options.getSubcommand()}\n` +
    `Lower Bound: ${lowerBound.toDateString()}\n` +
    `Upper Bound: ${upperBound.toDateString()}\n` +
    `${interaction.user.username} call completed at: ${new Date().toTimeString()}\n`);
  },
};
