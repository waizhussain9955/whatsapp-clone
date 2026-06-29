const { Pool } = require('pg');

let pool;

async function initDb() {
  pool = new Pool({
    user: 'postgres',
    password: '+zTrgwG*%v9/pn4',
    host: 'db.pithpspoeugydpzjgowg.supabase.co',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "avatarUrl" TEXT,
      about TEXT,
      "lastSeen" TEXT
    );

    CREATE TABLE IF NOT EXISTS contacts (
      "userId" TEXT,
      "contactId" TEXT,
      PRIMARY KEY ("userId", "contactId")
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      "senderId" TEXT NOT NULL,
      "receiverId" TEXT NOT NULL,
      text TEXT,
      "imageUrl" TEXT,
      "audioUrl" TEXT,
      timestamp TEXT,
      status TEXT,
      "isGroup" BOOLEAN,
      "isEdited" BOOLEAN DEFAULT false,
      "isDeleted" BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS statuses (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      content TEXT,
      type TEXT,
      timestamp TEXT
    );
  `);
  
  return pool;
}

async function saveUser(profile) {
  await pool.query(
    'INSERT INTO users (id, name, "avatarUrl", about, "lastSeen") VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "avatarUrl" = EXCLUDED."avatarUrl", about = EXCLUDED.about, "lastSeen" = EXCLUDED."lastSeen"',
    [profile.id, profile.name, profile.avatarUrl, profile.about, new Date().toISOString()]
  );
}

async function updateUserProfile(id, updates) {
  const user = await getUser(id);
  if (!user) return;
  const newName = updates.name !== undefined ? updates.name : user.name;
  const newAvatar = updates.avatarUrl !== undefined ? updates.avatarUrl : user.avatarUrl;
  const newAbout = updates.about !== undefined ? updates.about : user.about;
  
  await pool.query(
    'UPDATE users SET name = $1, "avatarUrl" = $2, about = $3 WHERE id = $4',
    [newName, newAvatar, newAbout, id]
  );
  return await getUser(id);
}

async function getUser(id) {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0];
}

async function getAllUsers() {
  const res = await pool.query('SELECT * FROM users');
  return res.rows;
}

async function saveMessage(msg, receiverId, isGroup) {
  await pool.query(
    'INSERT INTO messages (id, "senderId", "receiverId", text, "imageUrl", "audioUrl", timestamp, status, "isGroup") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [msg.id, msg.senderId, receiverId, msg.text, msg.imageUrl, msg.audioUrl, msg.timestamp, msg.status, isGroup ? true : false]
  );
}

async function updateMessageStatus(messageId, status) {
  await pool.query('UPDATE messages SET status = $1 WHERE id = $2', [status, messageId]);
}

async function updateMessageStatusForChat(senderId, receiverId, status) {
  await pool.query('UPDATE messages SET status = $1 WHERE "senderId" = $2 AND "receiverId" = $3 AND status != $1', [status, senderId, receiverId]);
}

async function editMessage(messageId, newText) {
  await pool.query('UPDATE messages SET text = $1, "isEdited" = true WHERE id = $2', [newText, messageId]);
}

async function deleteMessage(messageId) {
  await pool.query('UPDATE messages SET "isDeleted" = true, text = $1, "imageUrl" = NULL, "audioUrl" = NULL WHERE id = $2', ["This message was deleted.", messageId]);
}

async function getChatHistory(userId) {
  const res = await pool.query(
    'SELECT * FROM messages WHERE "senderId" = $1 OR "receiverId" = $1 ORDER BY timestamp ASC',
    [userId]
  );
  return res.rows;
}

async function saveContact(userId, contactId) {
  await pool.query('INSERT INTO contacts ("userId", "contactId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, contactId]);
}

async function getContacts(userId) {
  const res = await pool.query(
    'SELECT u.* FROM users u INNER JOIN contacts c ON u.id = c."contactId" WHERE c."userId" = $1',
    [userId]
  );
  return res.rows;
}

async function saveStatus(status) {
  await pool.query(
    'INSERT INTO statuses (id, "userId", content, type, timestamp) VALUES ($1, $2, $3, $4, $5)',
    [status.id, status.userId, status.content, status.type, status.timestamp]
  );
}

async function getStatuses(userId) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const res = await pool.query(`
    SELECT s.*, u.name as "userName", u."avatarUrl" as "userAvatar"
    FROM statuses s
    JOIN users u ON s."userId" = u.id
    WHERE (s."userId" = $1 OR s."userId" IN (SELECT "contactId" FROM contacts WHERE "userId" = $1))
      AND s.timestamp >= $2
    ORDER BY s.timestamp ASC
  `, [userId, oneDayAgo]);
  
  return res.rows;
}

module.exports = {
  initDb,
  saveUser,
  updateUserProfile,
  getUser,
  getAllUsers,
  saveMessage,
  updateMessageStatus,
  updateMessageStatusForChat,
  editMessage,
  deleteMessage,
  getChatHistory,
  saveContact,
  getContacts,
  saveStatus,
  getStatuses
};
