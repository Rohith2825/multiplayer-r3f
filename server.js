import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { GameRoom, generateRoomCode } from './backend-modules/rooms.js';

const ROOM_CODE_LENGTH = 6;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  path: '/socket.io',
  connectTimeout: 45000,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Serve static files
const indexPath = path.join(process.cwd(), 'dist', 'index.html');
app.get('/', (req, res) => {
  res.sendFile(indexPath);
});

// Chat Namespace
const chatNameSpace = io.of('/chat');
const gameRooms = new Map();

chatNameSpace.on('connection', (socket) => {
  socket.userData = {
    name: '',
  };
  console.log(`${socket.id} has connected to chat namespace`);

  socket.on('setName', (name) => {
    socket.userData.name = name;
  });

  socket.on('generateCode', (roomCode) => {
    socket.join(roomCode);
  });

  socket.on('sendMessage', ({ message, roomName }) => {
    console.log(`Message from ${socket.id} in room ${roomName}: ${message}`);
    chatNameSpace.to(roomName).except(socket.id).emit('broadcastMessage', {
      message: message,
      name: socket.userData.name,
    });
  });

  socket.on('disconnect', () => {
    console.log(`${socket.id} has disconnected from chat`);
  });
});

// Update Namespace
const updateNameSpace = io.of('/update');

updateNameSpace.on('connection', (socket) => {
  console.log(`[Server] New connection to update namespace: ${socket.id}`);
  
  socket.userData = {
    position: { x: 0, y: -500, z: -500 },
    quaternion: { x: 0, y: 0, z: 0, w: 0 },
    name: `Player${Math.floor(Math.random() * 1000)}`,
    roomCode: '',
  };

  socket.on('setID', () => {
    updateNameSpace.emit('setID', socket.id);
  });

  socket.on('setName', (name) => {
    socket.userData.name = name;
  });

  socket.on('joinRoom', (roomCode) => {
    console.log(`[Server] Attempting to join room ${roomCode} by socket ${socket.id}`);
    if (!gameRooms.has(roomCode)) {
      console.log(`[Server] Room ${roomCode} does not exist`);
      socket.emit('invalidRoomCode', 'Not a valid room code.');
      return;
    }
    console.log(`[Server] Room ${roomCode} exists, adding player ${socket.id}`);
    socket.userData.roomCode = roomCode;
    gameRooms.get(roomCode).addPlayer(socket);
    socket.join(roomCode);
    socket.emit('generateCode', roomCode);
  });

  socket.on('createRoom', () => {
    console.log(`[Server] Received createRoom request from socket ${socket.id}`);
    let newCode = generateRoomCode(ROOM_CODE_LENGTH);
    while (gameRooms.has(newCode)) {
      newCode = generateRoomCode(ROOM_CODE_LENGTH);
    }
    console.log(`[Server] Generated new room code: ${newCode}`);
    socket.userData.roomCode = newCode;
    gameRooms.set(newCode, new GameRoom(newCode));
    gameRooms.get(newCode).addPlayer(socket);
    console.log(`[Server] Room ${newCode} was created by socket ${socket.id}`);
    socket.join(newCode);
    console.log(`[Server] Emitting generateCode event to socket ${socket.id} with code ${newCode}`);
    socket.emit('generateCode', newCode);
  });

  socket.on('disconnecting', () => {
    const roomCode = socket?.userData?.roomCode;
    if (roomCode) {
      const room = gameRooms.get(roomCode);
      room.removePlayer(socket);
      if (room.numPlayers === 0) {
        gameRooms.delete(roomCode);
        console.log(roomCode + ' no longer exists');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`${socket.id} has disconnected from update namespace`);
    updateNameSpace.emit('removePlayer', socket.id);
  });

  socket.on('updatePlayer', (player) => {
    if (!socket.userData.roomCode) {
      console.log(`[Server] Received update from socket ${socket.id} but no room code set`);
      return;
    }
    socket.userData.position.x = player.position.x;
    socket.userData.position.y = player.position.y;
    socket.userData.position.z = player.position.z;
    socket.userData.quaternion.x = player.quaternion[0];
    socket.userData.quaternion.y = player.quaternion[1];
    socket.userData.quaternion.z = player.quaternion[2];
    socket.userData.quaternion.w = player.quaternion[3];
  });

  setInterval(() => {
    for (const gameRoom of gameRooms.values()) {
      const playerData = [];
      for (const socket of gameRoom.playerSockets.values()) {
        if (!socket.userData.roomCode) continue;
        playerData.push({
          id: socket.id,
          name: socket.userData.name,
          position_x: socket.userData.position.x,
          position_y: socket.userData.position.y,
          position_z: socket.userData.position.z,
          quaternion_x: socket.userData.quaternion.x,
          quaternion_y: socket.userData.quaternion.y,
          quaternion_z: socket.userData.quaternion.z,
          quaternion_w: socket.userData.quaternion.w,
        });
      }

      if (playerData.length > 0) {
        console.log(`[Server] Sending player data to room ${gameRoom.roomCode}:`, playerData);
        updateNameSpace.to(gameRoom.roomCode).emit('playerData', playerData);
      }
    }
  }, 20);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
