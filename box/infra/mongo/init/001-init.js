db = db.getSiblingDB('messagesdb');

db.createUser({
  user: 'app',
  pwd: 'root',
  roles: [{ role: 'readWrite', db: 'messagesdb' }]
});

db.createCollection('messages');

db.messages.createIndex({ receivedAt: -1 });

db.messages.createIndex({ messageId: 1 }, { unique: true });

db.messages.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
