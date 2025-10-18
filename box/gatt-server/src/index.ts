const { connectMongo } = require("./db");
const {
  saveMessage,
  getRecentMessages,
} = require("./db/repositories/messageRepo");

async function main() {
  await connectMongo();

  await saveMessage({
    payload: { hello: "world" },
    source: "test",
    metadata: { note: "premier insert" },
    ttlDays: 30,
  });

  const recents = await getRecentMessages(5);
  console.log("Messages récents:", recents);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
