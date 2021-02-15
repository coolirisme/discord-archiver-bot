#!/usr/bin/env node

const discord = require("discord.js");
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const sha256 = require('js-sha256');
const puppeteer = require("puppeteer");

const client = new discord.Client();
const prefix = "!";
let browser;

const init = async () => {
  database = await sqlite.open({
    filename: './data/archive.db',
    driver: sqlite3.Database
  });
  browser = await puppeteer.launch();
  await database.run('CREATE TABLE IF NOT EXISTS archived_links(original_link text default \'\', archived_link text default \'\')');
  await client.login(process.env.ARCHIVE_BOT_TOKEN);
  client.user.setActivity('and archiving links', { name: 'Watching', type: "WATCHING" });
}

//Handlers
const onMessageHandler = async (message) => {
  if (!message.author.bot && message.content.startsWith(prefix)) {
    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    if (command === 'archive' && args.length === 1) {
      const res = await archiveMessages(args[0]);
      message.channel.send(res);
    }
  }
};

//Helpers
const archiveMessages = async (channelId) => {
  const channel = client.channels.cache.get(channelId);

  const sql = `SELECT original_link FROM archived_links`;
  let output = new Set((await database.all(sql, [])).map(x => x.original_link));

  if (channel) {
    //Get all messages from channel
    let accepted = [];
    let rejected = [];
    const messages = await channel.messages.fetch();
    messages.map(async (message) => {
      splits = message.content.toLowerCase().match(/\bhttps?:\/\/\S+/gi);
      if (splits) {
        for (let i = 0; i < splits.length; i++) {
          if (!output.has(splits[i])) {
            await saveAsPdf(channelId, splits[i]);
            accepted.push({ original_link: splits[i], archived_link: `${sha256(channelId + splits[i].replace('www', 'old'))}.pdf` });
          } else {
            rejected.push(splits[i]);
          }
        }
      }
    });

    //Add accepted links to db
    const acceptedVals = accepted.reduce((acc, x) => `${acc}('${x.original_link}', '${x.archived_link}'),`, '').slice(0, -1);
    if (acceptedVals) {
      await database.run(`INSERT INTO archived_links(original_link, archived_link) VALUES${acceptedVals}`, []);
      return `Added ${accepted.length} links to archive, rejected ${rejected.length} links.`;
    } else {
      return `Nothing added`;
    }
  } else {
    return `Channel with id: \`${channelId}\` doesn't exist on this server.`
  }
}

const saveAsPdf = async (channel, url) => {
  const webPage = await browser.newPage();
  url = url.replace('www', 'old');
  await webPage.goto(url, {
    waitUntil: "networkidle0"
  });
  await webPage.pdf({
    printBackground: true,
    path: `./archives/${sha256(channel + url)}.pdf`,
    format: 'A4',
    margin: {
      top: '10px',
      bottom: '10px',
      left: '10px',
      right: '10px'
    }
  });

  await webPage.close();
}

init().then(() => {
  client.on('message', onMessageHandler);
}).catch((error) => {
  console.error(error);
});