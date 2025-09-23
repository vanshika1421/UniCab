// ride.js (Custom Module)
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/rides.json');

function getAllRides() {
  if (!fs.existsSync(dataPath)) return [];
  const data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data || '[]');
}

function addRide(ride) {
  const rides = getAllRides();
  rides.push(ride);
  fs.writeFileSync(dataPath, JSON.stringify(rides, null, 2));
}

module.exports = { getAllRides, addRide };
