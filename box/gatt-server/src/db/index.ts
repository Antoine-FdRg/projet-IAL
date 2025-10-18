const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI manquant dans .env");

async function connectMongo() {
  try {
    if (mongoose.connection.readyState === 1) return;

    await mongoose.connect(uri, {
      dbName: "messagesdb",
      serverSelectionTimeoutMS: 8000,
      appName: "archi-gatt-server",
    });

    console.log("[mongo] connecté");
  } catch (err) {
    console.error("[mongo] erreur connexion:", err);
    throw err;
  }
}

async function disconnectMongo() {
  await mongoose.disconnect();
}

module.exports = { connectMongo, disconnectMongo };
