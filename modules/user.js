const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataPath = path.join(__dirname, '../data/users.json');

function getAllUsers() {
  if (!fs.existsSync(dataPath)) return [];
  const data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data || '[]');
}

function addUser(username, password, role) {
  const users = getAllUsers();
  if (users.find(u => u.username === username)) return false;
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  users.push({ username, password: hash, role });
  fs.writeFileSync(dataPath, JSON.stringify(users, null, 2));
  return true;
}

function validateUser(username, password) {
  const users = getAllUsers();
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return users.find(u => u.username === username && u.password === hash);
}

module.exports = { getAllUsers, addUser, validateUser };
