const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/bookings.json');

function getAllBookings() {
  if (!fs.existsSync(dataPath)) return [];
  const data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data || '[]');
}

function addBooking(username, rideIdx) {
  const bookings = getAllBookings();
  bookings.push({ username, rideIdx, date: new Date().toISOString() });
  fs.writeFileSync(dataPath, JSON.stringify(bookings, null, 2));
}

function getUserBookings(username) {
  return getAllBookings().filter(b => b.username === username);
}

module.exports = { getAllBookings, addBooking, getUserBookings };
