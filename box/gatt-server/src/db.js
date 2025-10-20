const mongoose = require('mongoose');

async function connect(uri, dbName) {
  const conn = await mongoose.connect(uri, {
    dbName,
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`[db] Connected: ${conn.connection.host}/${dbName}`);
}

module.exports = { connect };