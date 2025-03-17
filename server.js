import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const players = new Map();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Initialize player
  const player = {
    id: socket.id,
    position: { x: 0, y: 7, z: -5 },
    rotation: { x: 0, y: 0, z: 0 },
  };

  players.set(socket.id, player);

  // Send current players to the newly connected player
  console.log('Sending current players to new player:', Array.from(players.values()));
  socket.emit('currentPlayers', Array.from(players.values()));

  // Inform other players about the new player
  console.log('Broadcasting new player to others:', player);
  socket.broadcast.emit('playerJoined', player);

  // Handle player movement
  socket.on('playerMove', ({ position, rotation }) => {
    console.log('Received player move:', socket.id, { position, rotation });
    const currentPlayer = players.get(socket.id);
    if (currentPlayer) {
      currentPlayer.position = position;
      currentPlayer.rotation = rotation;

      // Broadcast the player's updated position and rotation to others
      console.log('Broadcasting player move to others:', {
        id: socket.id,
        position,
        rotation,
      });
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        position,
        rotation,
      });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    players.delete(socket.id);
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
