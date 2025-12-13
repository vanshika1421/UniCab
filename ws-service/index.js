require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

// Import Redis clients (ioredis auto-connects)
const { client, pub, sub } = require('../lib/redisClient');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 25000,
  pingTimeout: 60000,
});

// ioredis → NO connect() needed
io.adapter(createAdapter(pub, sub));
console.log("Socket.IO Redis adapter initialized");

// Channels
(async () => {
  try {
    await sub.subscribe("booking.created");
    await sub.subscribe("ride.updated");
    await sub.subscribe("notification.sent");
    await sub.subscribe("payment.captured");
    console.log('[ws-service] subscribed to channels');
  } catch (err) {
    console.error('[ws-service] failed to subscribe to redis channels:', err && err.message ? err.message : err);
  }
})();

sub.on("message", (channel, message) => {
  try {
    const payload = JSON.parse(message);
    io.emit(channel, payload);
    console.log(`WS Emit → ${channel}`, payload);
  } catch (err) {
    console.error("Invalid redis message:", err.message);
  }
});

// WS connection events
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("joinRoom", (room) => socket.join(room));
  socket.on("leaveRoom", (room) => socket.leave(room));

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.WS_PORT || 7000;
server.listen(PORT, () => {
  console.log(`WebSocket Service running on port ${PORT}`);
});
