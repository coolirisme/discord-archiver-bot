const discord = require("discord.js");
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

const client = new discord.Client();

const init = async () => {
  database = await sqlite.open({
    filename: './data/archive.db',
    driver: sqlite3.Database
  });

  await database.run('CREATE TABLE IF NOT EXISTS archived_links(original_link text default \'\', archived_link text default \'\')');
  await client.login(process.env.ARCHIVE_BOT_TOKEN);
  client.user.setActivity('and archiving links', { name: 'Watching', type: "WATCHING" });
}

init().then(() => {

}).catch((error) => {
  console.error(error);
});