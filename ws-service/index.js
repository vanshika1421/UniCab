require('dotenv').config();
const express = require('express');
const http = require('http');
const { createServer } = http;
const { Server } = require('socket.io');
const { client: ioredisClient, sub } = require('../lib/redisClient');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Use redis adapter so it can scale later (requires two connections)
const pubClient = ioredisClient.duplicate();
const subClient = ioredisClient.duplicate();
Promise.all([pubClient.connect().catch(()=>{}), subClient.connect().catch(()=>{})]).then(()=>{
  io.adapter(createAdapter(pubClient, subClient));
}).catch(err => {
  console.warn('Redis adapter connection warning:', err && err.message ? err.message : err);
});

io.on('connection', (socket) => {
  console.log('WS client connected:', socket.id);

  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
  });

  socket.on('disconnect', () => {
    console.log('WS client disconnected:', socket.id);
  });
});

// Subscribe to pubsub channels from API
sub.subscribe('booking.created', 'ride.updated', 'notification.sent', 'payment.captured', (err, count) => {
  if (err) {
    console.error('Failed to subscribe: ', err.message);
  } else {
    console.log('Subscribed to Redis channels for real-time updates');
  }
});

sub.on('message', (channel, message) => {
  try {
    const payload = JSON.parse(message);
    // Emit event to all clients; for more control you can emit to rooms
    io.emit(channel, payload);
    console.log('Emitted', channel, '->', payload);
  } catch (err) {
    console.warn('Failed to parse redis message:', err.message);
  }
});

const PORT = process.env.WS_PORT || 7000;
server.listen(PORT, () => {
  console.log(`WebSocket service running on port ${PORT}`);
});
